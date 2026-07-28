import { spawn } from 'node:child_process'

// Un modèle peut partir en génération infinie sur une entrée qui le déroute :
// constaté en pratique, `pi` a alors produit assez de sortie pour dépasser la
// taille maximale d'une chaîne V8 et faire tomber le script entier
// (`RangeError: Invalid string length`) au bout de plusieurs minutes de
// traduction. On coupe donc au-delà d'une taille et d'une durée qu'aucune
// traduction légitime n'atteint, et l'appelant retente.
//
// La taille est proportionnée à l'entrée : une traduction fait au plus
// l'ordre de grandeur de sa source, et la marge (x20, avec un plancher pour
// les fragments très courts) laisse de la place à un modèle un peu bavard.
// C'est ce qui fait la différence entre couper une génération folle au bout
// d'une seconde et attendre plusieurs minutes qu'elle atteigne un plafond
// absolu.
const OUTPUT_SIZE_RATIO = 20
const MIN_OUTPUT_BYTES = 64 * 1024
const CALL_TIMEOUT_MS = 300_000

function maxOutputBytes(userPrompt) {
  return Math.max(MIN_OUTPUT_BYTES, userPrompt.length * OUTPUT_SIZE_RATIO)
}

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
      // --mode text plutôt que json : en mode json, pi émet un flux NDJSON
      // d'évènements de streaming dont chacun reporte le message en cours, ce
      // qui rend la sortie quadratique en longueur de réponse. Mesuré sur ce
      // corpus : 531 ko de stdout pour 450 caractères traduits, et plusieurs
      // mégaoctets sur un paragraphe long - au point de déclencher la coupure
      // de sécurité ci-dessous sur des traductions parfaitement normales. En
      // mode text, pi n'imprime que le texte final de l'assistant : 444 octets
      // pour la même traduction, et les jetons de raisonnement des modèles qui
      // en produisent restent exclus (vérifié avec --thinking high).
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
      () => abort(`pi n'a pas répondu en ${CALL_TIMEOUT_MS / 1000} s`),
      CALL_TIMEOUT_MS
    )
    timer.unref()

    const limit = maxOutputBytes(userPrompt)
    child.stdout.on('data', (chunk) => {
      if (aborted) return
      stdout += chunk
      if (stdout.length > limit) {
        abort(
          `pi a produit plus de ${Math.round(limit / 1024)} ko pour ` +
            `${Math.round(userPrompt.length / 1024)} ko de source (génération qui s'emballe ?)`
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
        reject(new Error(`pi a quitté avec le code ${code}: ${stderr || stdout}`))
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
    }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
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
  if (config.backend === 'pi') return runPi(backendConfig, systemPrompt, userPrompt)
  if (config.backend === 'ollama') return callOllama(backendConfig, systemPrompt, userPrompt)
  if (config.backend === 'openai_compatible') return callOpenAICompatible(backendConfig, systemPrompt, userPrompt)
  throw new Error(`Backend non supporté: "${config.backend}" (attendu: "pi", "ollama" ou "openai_compatible")`)
}

export function currentModelId(config) {
  const backendConfig = config.backends[config.backend]
  if (config.backend === 'pi') return `pi:${backendConfig.provider}/${backendConfig.model}`
  return `${config.backend}:${backendConfig.model}`
}
