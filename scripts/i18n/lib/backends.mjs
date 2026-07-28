import { spawn } from 'node:child_process'

// A model can run away into endless generation on an input that throws it off:
// observed in practice, `pi` then produced enough output to exceed the maximum
// V8 string length and bring the whole script down (`RangeError: Invalid string
// length`) after several minutes of translating. So we cut off beyond a size and
// a duration no legitimate translation reaches, and the caller retries.
//
// The size is proportional to the input: a translation is at most the order of
// magnitude of its source, and the margin (x20, with a floor for very short
// fragments) leaves room for a slightly verbose model. That is the difference
// between cutting a runaway generation off after one second and waiting several
// minutes for it to reach an absolute ceiling.
const OUTPUT_SIZE_RATIO = 20
const MIN_OUTPUT_BYTES = 64 * 1024
const CALL_TIMEOUT_MS = 300_000

function maxOutputBytes(userPrompt) {
  return Math.max(MIN_OUTPUT_BYTES, userPrompt.length * OUTPUT_SIZE_RATIO)
}

// pi (https://pi.dev) is a command line harness able to talk to a great many
// providers (ilaas, github-copilot, opencode-go, etc.) and models behind one
// single interface: rather than reimplementing an HTTP client per provider, we
// delegate the call to it and only configure --provider/--model. The prompt goes
// through stdin (never through argv) so as never to hit a command line length
// limit on a large chapter.
function runPi(backendConfig, systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const args = [
      '--provider', backendConfig.provider,
      '--model', backendConfig.model,
      '--no-tools',
      '--no-session',
      '--print',
      // --mode text rather than json: in json mode, pi emits an NDJSON stream of
      // streaming events, each of which reports the message so far, which makes
      // the output quadratic in response length. Measured on this corpus: 531 kB
      // of stdout for 450 translated characters, and several megabytes on a long
      // paragraph - enough to trigger the safety cutoff below on perfectly
      // normal translations. In text mode, pi only prints the assistant's final
      // text: 444 bytes for the same translation, and the reasoning tokens of
      // models that produce them stay excluded (verified with --thinking high).
      '--mode', 'text',
      '--system-prompt', systemPrompt
    ]
    if (backendConfig.thinking) args.push('--thinking', backendConfig.thinking)

    const child = spawn(backendConfig.command ?? 'pi', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''
    let aborted = null

    const abort = (message) => {
      if (aborted) return
      aborted = message
      child.kill('SIGKILL')
      reject(new Error(message))
    }

    const timer = setTimeout(
      () => abort(`pi did not answer within ${CALL_TIMEOUT_MS / 1000} s`),
      CALL_TIMEOUT_MS
    )
    timer.unref()

    const limit = maxOutputBytes(userPrompt)
    child.stdout.on('data', (chunk) => {
      if (aborted) return
      stdout += chunk
      if (stdout.length > limit) {
        abort(
          `pi produced more than ${Math.round(limit / 1024)} kB for ` +
            `${Math.round(userPrompt.length / 1024)} kB of source (runaway generation?)`
        )
      }
    })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (aborted) return
      if (code !== 0) {
        reject(new Error(`pi exited with code ${code}: ${stderr || stdout}`))
        return
      }
      resolve(stdout)
    })

    child.stdin.write(userPrompt)
    child.stdin.end()
  })
}

async function callOllama(backendConfig, systemPrompt, userPrompt) {
  const { baseUrl, model, options } = backendConfig
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      options
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
  })
  if (!res.ok) {
    throw new Error(`Ollama answered ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.message.content
}

async function callOpenAICompatible(backendConfig, systemPrompt, userPrompt) {
  const { baseUrl, apiKey, model, options } = backendConfig
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey ?? 'not-needed'}`
    },
    body: JSON.stringify({
      model,
      temperature: options?.temperature ?? 0,
      seed: options?.seed,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
  })
  if (!res.ok) {
    throw new Error(`OpenAI-compatible backend answered ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

export async function translateText(config, systemPrompt, userPrompt) {
  const backendConfig = config.backends[config.backend]
  if (!backendConfig) {
    throw new Error(`Unknown backend in i18n/config.json: "${config.backend}"`)
  }
  if (config.backend === 'pi') return runPi(backendConfig, systemPrompt, userPrompt)
  if (config.backend === 'ollama') return callOllama(backendConfig, systemPrompt, userPrompt)
  if (config.backend === 'openai_compatible') return callOpenAICompatible(backendConfig, systemPrompt, userPrompt)
  throw new Error(`Unsupported backend: "${config.backend}" (expected "pi", "ollama" or "openai_compatible")`)
}

export function currentModelId(config) {
  const backendConfig = config.backends[config.backend]
  if (config.backend === 'pi') return `pi:${backendConfig.provider}/${backendConfig.model}`
  return `${config.backend}:${backendConfig.model}`
}
