import { spawn } from 'node:child_process'

// pi (https://pi.dev) est un harnais en ligne de commande qui sait parler à
// de très nombreux providers (ilaas, github-copilot, opencode-go, etc.) et
// modèles derrière une seule et même interface : plutôt que de réimplémenter
// un client HTTP par provider, on lui délègue l'appel et on ne configure que
// --provider/--model. Le prompt est passé par stdin (jamais par argv) pour
// ne jamais buter sur une limite de taille de ligne de commande sur un
// chapitre volumineux.
function runPi(backendConfig, systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const args = [
      '--provider', backendConfig.provider,
      '--model', backendConfig.model,
      '--no-tools',
      '--no-session',
      '--print',
      '--mode', 'json',
      '--system-prompt', systemPrompt
    ]
    if (backendConfig.thinking) args.push('--thinking', backendConfig.thinking)

    const child = spawn(backendConfig.command ?? 'pi', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pi a quitté avec le code ${code}: ${stderr || stdout}`))
        return
      }
      resolve(stdout)
    })

    child.stdin.write(userPrompt)
    child.stdin.end()
  })
}

// La sortie --mode json de pi est un flux NDJSON d'évènements (streaming
// inclus) : on ne garde que le dernier évènement "turn_end", qui porte le
// message assistant final déjà assemblé, et on n'en extrait que les blocs
// de type "text" (ce qui exclut au passage tout bloc "thinking" pour les
// modèles qui en produisent).
function extractPiText(stdout) {
  let lastTurn = null
  for (const line of stdout.split('\n')) {
    if (line.trim() === '') continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event.type === 'turn_end') lastTurn = event
  }
  if (!lastTurn) {
    throw new Error(`Impossible de trouver la réponse de pi dans sa sortie JSON:\n${stdout}`)
  }
  return lastTurn.message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

async function callPi(backendConfig, systemPrompt, userPrompt) {
  const stdout = await runPi(backendConfig, systemPrompt, userPrompt)
  return extractPiText(stdout)
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
    })
  })
  if (!res.ok) {
    throw new Error(`Ollama a répondu ${res.status}: ${await res.text()}`)
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
    })
  })
  if (!res.ok) {
    throw new Error(`Backend OpenAI-compatible a répondu ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.choices[0].message.content
}

export async function translateText(config, systemPrompt, userPrompt) {
  const backendConfig = config.backends[config.backend]
  if (!backendConfig) {
    throw new Error(`Backend inconnu dans i18n/config.json: "${config.backend}"`)
  }
  if (config.backend === 'pi') return callPi(backendConfig, systemPrompt, userPrompt)
  if (config.backend === 'ollama') return callOllama(backendConfig, systemPrompt, userPrompt)
  if (config.backend === 'openai_compatible') return callOpenAICompatible(backendConfig, systemPrompt, userPrompt)
  throw new Error(`Backend non supporté: "${config.backend}" (attendu: "pi", "ollama" ou "openai_compatible")`)
}

export function currentModelId(config) {
  const backendConfig = config.backends[config.backend]
  if (config.backend === 'pi') return `pi:${backendConfig.provider}/${backendConfig.model}`
  return `${config.backend}:${backendConfig.model}`
}
