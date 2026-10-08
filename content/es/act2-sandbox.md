# El arenero: aislar al agente de tu máquina

::: tip Objetivos de este módulo
- Saber qué puede hacer un agente de código en tu máquina
- Comparar el clon desechable, el contenedor y la micro-máquina virtual: qué protege cada uno y qué cuesta
- Ejecutar Pi en Docker Sandboxes con un kit versionado en este repositorio
- Irse con un arenero en el que las operaciones de los módulos siguientes se ejecutan sin supervisión
:::

Los módulos siguientes lanzan Pi veinte veces sobre la misma tarea sin intervención humana, le confían subagentes que tienen una shell y luego encadenan subagentes en pipelines. Pi no tiene ningún mecanismo para pedir tu aprobación antes de ejecutar un comando, y su [documentación de seguridad](https://pi.dev/docs/latest/security) lo dice claramente: las herramientas leen, escriben y lanzan comandos «with the permissions of the pi process», y «Pi does not include a built-in sandbox». Todo lo que puedes hacer desde tu terminal, el agente también puede hacerlo: leer `~/.ssh`, leer `~/.pi/agent/auth.json` donde están guardadas tus claves de API, lanzar `git push --force` o enviar el contenido de un archivo a cualquier dominio con `curl`.

La reacción natural es escribir una consigna: « no modifiques más que `game/neon.js` », « no leas nada fuera del repositorio ». Una consigna es texto, y te recordamos que el uso de un LLM siempre es no determinista, lo que significa que nunca tendrás una garantía del 100 % de que se cumpla. En el módulo sobre las habilidades, comprobarás que una consigna de limpieza de archivos temporales colocada en un `SKILL.md` se cumple menos de una de cada tres veces. Antes de la primera ejecución sin supervisión, hace falta por tanto un límite que no dependa de la obediencia del modelo. La caja de arena (llamada sandbox) es una forma determinista de asegurarse de que el LLM se encuentre en un entorno cerrado cuyas fronteras determinas tú y que el modelo no puede sobrepasar.

## Comprender

### ¿A qué tiene acceso el agente?

Un agente de código que se ejecuta en tu equipo tiene acceso a tus archivos, es decir, al repositorio en el que trabaja y, con los mismos permisos, a tu directorio personal, donde viven las claves SSH, los tokens de los proveedores de modelos y los archivos `.env` de tus otros proyectos. La red le permite instalar cualquier paquete, ejecutar un `curl | sh` encontrado en un README o difundir lo que acaba de leer. Por último, lanza procesos con tu identidad, lo que cubre el demonio de Docker, el comando `rm` y el acceso de escritura al repositorio remoto. Si además tienes permisos sudo en tu máquina, nada lo detiene.

Estas acciones ni siquiera exigen que el modelo se equivoque. Un archivo del repositorio puede contener instrucciones escritas para el agente, y ese es el papel del `SUPPORT.md` de NÉON, cuyo texto imita un procedimiento de asistencia pero pide leer el `.env` y enviar su contenido a una dirección externa: el agente que abre ese archivo para responder a una pregunta trata la instrucción como si viniera de ti, y el módulo de permisos trabajará en este caso. Una extensión instalada desde el directorio comunitario se ejecuta, como lo recordó el módulo sobre Pi, con la totalidad de tus derechos. En estos dos casos, la falla está en el harness, y una barrera de seguridad escrita dentro de AGENTS.md no te protegerá.

La documentación de Pi extrae la conclusión: «Para repositorios no confiables, código generado que no tienes intención de supervisar de cerca o automatización desatendida, ejecuta pi en un entorno contenido. Usa un contenedor, una VM, una micro-VM, un sandbox remoto o un sandbox controlado por políticas, solo con los archivos y credenciales necesarios para la tarea.» Nuestras veinte ejecuciones sobre el issue #1 son exactamente automatización desatendida. Y a largo plazo, queremos agentes autónomos capaces de trabajar durante horas sin que nos veamos obligados a supervisarlos.

### Tres niveles de aislamiento

Le moins cher des trois est le **clone jetable**. L'outil de mesure du module suivant clone NÉON à un tag, dans un répertoire temporaire, à chaque exécution, ce qui protège l'historique et l'arbre de travail du dépôt sans rien coûter ou presque. Le processus tourne pourtant toujours sous votre identité, avec votre répertoire personnel et votre réseau, si bien qu'un clone jetable ne protège que le dépôt. Et encore, rien n'empêche le modèle de faire un push sur votre dépôt distant s'il en a les droits.

Un paso más allá, el **contenedor** hace que Pi se ejecute en una imagen Docker donde solo está montado el repositorio, lo que deja tu directorio personal fuera de alcance. Comparte el kernel del host, su red está abierta por defecto y, sobre todo, la clave del proveedor de modelos debe añadirse para que Pi pueda llamar al modelo, algo que la [página de Pi sobre la contenerización](https://pi.dev/docs/latest/containerization) indica en una frase: «Las claves de API del proveedor entran al contenedor». Todo lo que el agente ejecuta tiene, por tanto, acceso a esta clave.

Dans la même idée, vous pouvez ajouter un hook à Pi qui, à chaque commande bash demandée, vérifie si la commande est autorisée. Il y a plusieurs extension Pi qui offrent ce genre de configurations. C'est par exemple le cas de [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) qui, à partir d'un fichier de configuration, vous permet de dire quelles commandes sont autorisées et quelles commandes ne le sont pas. Elle s'accroche à l'événement `tool_call` de l'API d'extension de Pi, un hook qui intercepte chaque appel d'outil, chaque commande bash, chaque appel MCP et chaque skill invoqué avant son exécution, et compare la demande à des règles `allow` / `deny` / `ask` écrites en JSON. Ca demande néanmoins de configurer vous même les droits. L'outil `read` peut encore très bien lire vos fichiers de configurations. Vous verrez comment l'utiliser un peu plus loin dans ce module.

Le troisième niveau est la **micro-machine virtuelle à politique** avec [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Chaque sandbox a son propre noyau derrière un hyperviseur, tout le trafic TCP sortant passe par un proxy sur l'hôte qui n'accepte que les domaines d'une liste d'autorisations, et les clés d'API sont injectées dans les en-têtes HTTP par ce proxy, si bien que, pour citer la [page sur la sécurité](https://docs.docker.com/ai/sandboxes/security/), « Credential values never enter the VM ». Le répertoire de travail est monté dans la VM au même chemin absolu que sur l'hôte. Le coût est une image de six cent cinquante mégaoctets à télécharger, un démon à faire tourner, une liste de domaines autorisés à entretenir. Cela peut sembler compliqué, mais votre IA préférée pourra vous assister pour mettre en place facilement cette infrastructure.

[bubblewrap](https://github.com/containers/bubblewrap) (el comando `bwrap`) en Linux y `sandbox-exec` en macOS confinan un proceso sin imagen ni demonio, pero se sitúan al nivel del contenedor y conservan sus dos límites: la clave del proveedor sigue en el entorno de Pi, donde todo lo que el agente ejecuta puede leerla, y la red está o completamente cortada o abierta del todo, porque filtrar por dominio requiere un proxy en el host, algo que añade [sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime) de Anthropic.

| qué está protegido          | clon desechable | contenedor                      | Docker Sandboxes                              |
| --------------------------- | --------------- | ------------------------------- | --------------------------------------------- |
| tu directorio personal      | no              | sí, si solo se monta el repositorio | sí                                        |
| la red saliente             | no              | no por defecto                  | sí, denegación por defecto y lista de permitidos |
| tus claves de API           | no              | no, entran en la imagen         | sí, solo las ve el proxy del host              |

### Lo que el sandbox no protege

En modo directo, el predeterminado, el agente edita tu árbol de trabajo en el lugar, y la documentación de Docker Sandboxes recuerda que por tanto puede modificar un hook de git, un `Makefile` o una configuración de integración continua, que se ejecutarán más tarde en el host cuando los lances tú mismo. El sandbox protege la máquina mientras el agente trabaja, y no te exime de revisar el diff.

La política de red `balanced`, la que `sbx policy init` recomienda, autoriza dominios mediante comodines amplios como `*.googleapis.com`, que cubren mucho más que APIs de modelos. Partimos de `deny-all` y solo abrimos después los dominios que aparecen en el registro de denegaciones.

Dentro de la VM, por último, el agente es administrador, con `sudo` sin contraseña y un daemon Docker propio, lo que aceptamos, ya que nada de lo que ocurre allí sale de ella y la VM en sí es desechable.

## Reconstruir

Te proponemos dos enfoques a continuación: el uso de una extensión en Pi que añade un hook (que te propondremos reconstruir en otro módulo) y el uso de Docker Sandboxes. La primera solución no requiere ninguna instalación concreta en tu sistema, así que se puede usar fácilmente para la formación "en sala". Pero ten en cuenta que tiene sus límites y que no basta para un trabajo diario con los agentes. Si eres de los más valientes, podrás elegir la segunda solución, basada en Docker Sandboxes.

### Instalar y configurar `pi-permission-system`

La extensión se instala en un solo comando, como cualquier paquete del directorio de Pi:

```bash
pi install npm:@gotgenes/pi-permission-system
```

Las reglas residen en un archivo JSON, leído en tres ámbitos: global (`~/.pi/agent/extensions/pi-permission-system/config.json`), proyecto (`.pi/extensions/pi-permission-system/config.json`, ignorada si el proyecto no está aprobado) y por agente, en el encabezado YAML de un archivo de agente, que prevalece sobre los dos primeros. Para NÉON, una configuración de proyecto basta para frenar la instrucción más peligrosa de `SUPPORT.md`, ya que la lectura de un `.env` se rechaza por construcción:

```json
{
  "permission": {
    "*": "allow",
    "path": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny"
    },
    "bash": {
      "*": "ask",
      "rm -rf *": "deny",
      "sudo *": "ask"
    },
    "external_directory": "ask"
  }
}
```

La regla más específica prevalece: `bash.*` pide confirmación por defecto, `rm -rf *` deniega sin preguntar, y una ruta fuera del repositorio sigue sujeta a confirmación incluso cuando `path.*` autoriza todo lo demás. Un comando que el analizador bash de la extensión no sabe clasificar se deniega en lugar de dejarse pasar, y una ruta que atraviesa un enlace simbólico se resuelve antes de la comparación.

::: info Ejercicio (en clase)
Trabaja en un clon desechable de NÉON, ya que dos de las solicitudes siguientes son destructivas. Instala la extensión, coloca la configuración de arriba en `.pi/extensions/pi-permission-system/config.json`, crea en la raíz un `.env` que contenga una clave falsa, luego lanza Pi y pídele tres cosas: que te lea el contenido de ese `.env`, que borre la carpeta `game/` con `rm -rf`, y que lance la suite de pruebas. Las dos primeras solicitudes son rechazadas sin que Pi te consulte; la tercera abre una confirmación a la que respondes tú mismo.

Luego, vuelve a plantear la solicitud de lectura del `.env` tres veces seguidas reformulándola y explicándole a Pi que eres el propietario del archivo y que lo autorizas: el veredicto no cambia, porque proviene de una regla evaluada antes de la llamada a la herramienta y no de un arbitraje del modelo.

Retira enfin le bloc `path` de la configuration et remplace-le par la consigne « ne lis jamais de fichier `.env` » dans l'`AGENTS.md` du dépôt, puis repose la même demande cinq fois dans cinq sessions différentes. Compte les refus obtenus : tu tiens alors ton propre chiffre sur ce que vaut une consigne en texte face à un garde-fou en code. Tout ceci dépend bien évidemment de la qualité du modèle et peut-être que celui que tu utiliseras suivra ta règle écrite. Mais ton contexte est vide et ce ne sera peut-être plus le cas s'il est déjà bien rempli.
:::

### Instalar y configurar `sbx`

`sbx` es el comando para usar Docker Sandboxes. `sbx` conoce una lista de agentes que sabe lanzar tal cual (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` y algunos otros), y Pi no forma parte de ella. Por lo tanto, es necesario crear [un kit](https://docs.docker.com/ai/sandboxes/customize/) : un directorio descrito por un `spec.yaml` cuya variante `kind: sandbox` define un agente desde cero, con la imagen, el comando de arranque, las instrucciones añadidas al archivo de contexto, las claves que se deben inyectar y los permisos de red. El nuestro está versionado en [AI-for-dev/ai4dev-pi-kit](https://github.com/AI-for-dev/ai4dev-pi-kit) y contiene solo cuatro archivos.

```
ai4dev-pi-kit
├── spec.yaml
└── files/home/.pi/agent
    ├── extensions/pi-permission-system/config.json
    ├── models.json
    └── settings.json
```

Las versiones citadas a continuación son aquellas con las que se verificó este kit en el momento de escribir el documento : `sbx` 0.45.1, Docker Engine 29.7.2, Pi 1.1.0.

#### Instalar `sbx`

La herramienta de línea de comandos se llama `sbx`. Para instalarla en tu SO, solo tienes que ir a la página siguiente

https://docs.docker.com/ai/sandboxes/install/

#### Elegir la imagen

Docker publica [`docker.io/sbx/pi-image`](https://github.com/docker/sbx-kits-contrib/tree/main/pi), una imagen que añade Pi y `fd` (la herramienta de búsqueda de archivos que invoca Pi) al modelo `shell-docker` de las sandboxes, el cual ya proporciona Node 22.22.1, `git`, `rg`, `python3` y `uv`. Se reconstruye cada noche a partir de la última versión de Pi publicada en npm, de modo que el kit no tiene ni `Dockerfile` que mantener ni imagen que construir, y que `sbx` la descarga desde Docker Hub en el primer arranque.

::: warning Una imagen que cambia cada noche
El tag `latest` sigue a Pi : dos sandboxes creados con una semana de diferencia pueden ejecutar dos versiones distintas. Para una campaña de mediciones, donde una diferencia de resultado debe provenir de la variable estudiada y no de una actualización del harness, se fija la imagen por su huella, que proporciona `docker buildx imagetools inspect docker.io/sbx/pi-image:latest`, escribiendo por ejemplo `image: docker.io/sbx/pi-image@sha256:ae4a64715d2b8ba22f02eccf0d40cc484772661425e57801f242bea9eecb509a` en el `spec.yaml`.
:::

#### Declarar el kit

```yaml
schemaVersion: "2"
kind: sandbox
name: pi
version: "0.1.0"
displayName: Pi
description: Pi coding agent (pi.dev) in a Docker sandbox.
sourceURL: https://github.com/earendil-works/pi

sandbox:
  image: docker.io/sbx/pi-image:latest
  entrypoint: [pi, -a]

agentInstructions:
  filename: AGENTS.md
  content: |
    ## Sandbox environment

    Tu tournes dans une microVM Docker Sandbox. `sudo` est sans mot de passe,
    Docker est disponible a l'interieur de la VM. Le reseau sortant est filtre
    par une allowlist: un domaine non autorise echoue, ce n'est pas une panne
    reseau. La cle du provider n'est pas dans la VM, seule une sentinelle l'est.

environment:
  variables:
    PI_SKIP_VERSION_CHECK: "1"
    PI_TELEMETRY: "0"
    NODE_OPTIONS: "--disable-warning=UNDICI-EHPA"

credentials:
  - service: ilaas
    description: ILAAS API KEY (llm.ilaas.fr)
    required: true
    apiKey:
      name: ILAAS_API_KEY
      proxyManaged: true
      inject:
        - domain: llm.ilaas.fr
          scheme: bearer

permissions:
  network:
    allow:
      - llm.ilaas.fr
      - github.com
      - raw.githubusercontent.com
      - pypi.org
      - files.pythonhosted.org
      - registry.npmjs.org
      - pi.dev
```

El bloque `sandbox` nombra la imagen elegida en el paso anterior y lanza `pi -a`. La opción `-a` declara los archivos del proyecto como seguros para esta ejecución, lo que responde a la pregunta que `trust.json` planteaba en el módulo sobre Pi: dentro de la VM, un skill o una extensión encontrados en el repositorio solo pueden tocar lo que la VM contiene.

`agentInstructions` añade algunas líneas al `AGENTS.md` que el modelo lee: un dominio rechazado no es un fallo de red, lo que le evita reintentar diez veces, y la clave del proveedor no está en la VM.

El bloque `credentials` declara una clave gestionada por el proxy (`proxyManaged: true`). Pi encuentra en `ILAAS_API_KEY` una **sentinela**, un valor ficticio, y el proxy del host la reemplaza por la clave real en el encabezado `Authorization` de las peticiones hacia `llm.ilaas.fr`, y en ningún otro lugar.

Bajo `permissions.network`, el kit abre por encima de la política global el proveedor de modelos, GitHub para clonar NÉON, PyPI para las herramientas de medición y el registro npm para las extensiones instaladas con `pi install`. `llm.ilaas.fr` debe figurar en esta lista además del bloque `credentials`, porque `sbx` no autoriza implícitamente los dominios donde inyecta una clave: sin esta línea, la política `deny-all` rechazaría cada llamada al modelo. Las variables `PI_SKIP_VERSION_CHECK` y `PI_TELEMETRY` cortan ciertas operaciones de red de arranque de Pi.

El archivo `files/home/.pi/agent/settings.json`, que el kit deposita en el directorio personal del agente, fija el proveedor, el modelo por defecto, el nivel de razonamiento y las extensiones que hay que instalar. Sustituye al `~/.pi/agent/settings.json` de tu host, que no está montado en la VM. Aquí es bastante simple y se parece a esto

```json
{
  "defaultProvider": "ilaas",
  "defaultModel": "gemma-4-31b",
  "defaultThinkingLevel": "high",
  "packages": ["npm:@gotgenes/pi-permission-system@40.1.1"]
}
```

Del mismo modo, el archivo `files/home/.pi/agent/models.json` indica los modelos disponibles en la sandbox.

```json
{
    "providers": {
        "ilaas": {
            "baseUrl": "https://llm.ilaas.fr/v1",
            "api": "openai-completions",
            "apiKey": "$ILAAS_API_KEY",
            "models": [
                {
                    "id": "gemma-4-31b",
                    "contextWindow": 128000,
                    "reasoning": true
                },
                {
                    "id": "qwen-3.6-35b-instruct",
                    "contextWindow": 256000
                }
            ]
        }
    }
}
```

Pi instala al arrancar los paquetes listados en `packages`, desde `registry.npmjs.org`, de modo que cada sandbox creado con este kit dispone de `pi-permission-system` sin intervención manual. La versión está fijada, porque una extensión se ejecuta con todos los derechos de Pi y una actualización silenciosa del paquete cambiaría lo que corre en la VM. Para añadir otra extensión al kit, se añade su origen `npm:<paquete>@<versión>` a esta lista y se recrea el sandbox.

El archivo `files/home/.pi/agent/extensions/pi-permission-system/config.json` define la política global de la extensión, que rechaza la lectura de los `.env` y `rm -rf` y autoriza todo lo demás:

```json
{
  "permission": {
    "*": "allow",
    "path": {
      "*": "allow",
      "*.env": "deny",
      "*.env.*": "deny"
    },
    "bash": {
      "*": "allow",
      "rm -rf *": "deny"
    },
    "external_directory": "allow"
  }
}
```

::: warning Sin regla `ask` en la política del kit
Una regla `ask` espera una respuesta en la interfaz de Pi. En modo no interactivo (`pi -p`, por ejemplo lanzado con `sbx exec`), la extensión no tiene a quién plantear la pregunta y rechaza la llamada con el mensaje « requires approval, but no interactive UI is available ». Con la configuración del ejercicio en sala, donde `bash.*` vale `ask`, cada comando bash se rechazaría. La política del kit se limita por tanto a `allow` y `deny`, y un proyecto que quiera confirmaciones las añade en su propio `.pi/extensions/pi-permission-system/config.json`, que prevalece sobre la política global.
:::

#### Registrar la clave

`ilaas` se autentica mediante clave de API. Se la confía a `sbx` bajo el nombre del servicio declarado por el kit:

```bash
sbx secret set ilaas
```

Debes entonces introducir tu clave. Luego puedes verificar que está bien registrada mediante el comando

```bash
sbx secret ls
```

En el primer lanzamiento, `sbx` pide aprobar el **credential binding**, la autorización dada a un kit de terceros para usar este secreto en los dominios que declara. La respuesta se registra en `~/.config/sbx/credentials.yaml`.

#### Establecer la política de red

Este ajuste es global, `sbx` lo exige antes del primer sandbox, y se hace de una vez por todas:

```bash
sbx policy init deny-all
```

Las reglas `permissions.network.allow` del kit se aplican por encima, solo para sus sandboxes.

#### Lanzar

```bash
git clone https://github.com/AI-for-dev/ai4dev-pi-kit
cd ai4dev-pi-kit
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/ai4dev-pi-kit
```

::: info Ejercicio (en autonomía)
Realiza en tu entorno los cinco pasos anteriores, desde la instalación de `sbx` hasta el primer `sbx run`. En la sesión de Pi que se abre, pide el valor de la variable `ILAAS_API_KEY`: verás la centinela, y no tu clave. Lanza después un `curl https://example.com`: la petición falla, porque el dominio no está en ninguna lista. Por último, haz que se modifique un archivo de NÉON: el cambio aparece del lado del host en cuanto Pi ha escrito.

Vuelve al host y lee `sbx policy log`, donde cada denegación queda registrada con el dominio solicitado. Retoma para terminar el ejercicio sobre `pi-permission-system`, esta vez dentro del sandbox, donde el kit ya ha instalado la extensión: pide a Pi que lea el `.env` y luego que borre `game/` con `rm -rf`, dos denegaciones que da la política global del kit, después deposita la configuración del ejercicio en clase en `.pi/extensions/pi-permission-system/config.json` y verifica que la suite de tests abre ahora una confirmación. Este archivo está guardado en el repositorio montado y por tanto permanece en tu host. Las dos barreras de seguridad se superponen sin estorbarse, y la denegación del `rm -rf` conserva toda su utilidad, pues en modo directo el repositorio que Pi borraría es el de tu host.
:::

## Generalizar

**Una frontera de uso que no depende de la obediencia.** Un permiso escrito en texto, en un `AGENTS.md` o un `SKILL.md`, es una sugerencia que el modelo sigue o no. El módulo sobre los permisos construirá barreras en código dentro del harness, que rechazan una llamada de herramienta antes de que se ejecute. El sandbox es la capa exterior, la que aguanta cuando el propio harness está en falta, porque una extensión maliciosa o un archivo trampa solo pueden dañar la VM.

**La clave permanece en el host.** El agente no necesita leer la clave, solo que sus peticiones hacia un dominio concreto estén autenticadas; guardar la clave en el host para colocarla en la cabecera en el momento en que la petición pasa la retira de todo lo que el agente puede leer, ejecutar o enviar. El principio vale para cualquier harness, sea cual sea la herramienta que lo implemente.

**Rechazar por defecto, y luego abrir desde el registro.** La lista de autorizaciones de un kit no se escribe de antemano: se parte del rechazo, se trabaja una sesión y solo se añaden los dominios cuyo rechazo ha bloqueado realmente algo, como el resto de la formación se decide por una medida más que por una intuición.

## Entregable

Al final de este módulo, Pi corre en un sandbox sobre tu clon de NÉON, y todas las manipulaciones de los módulos siguientes podrán hacerse allí con un control óptimo.

Cuatro verificaciones lo confirman:

- la variable `ILAAS_API_KEY` leída desde el sandbox es la centinela;
- una petición hacia un dominio ausente de la lista falla;
- una edición hecha por Pi aparece en el repositorio del lado del host;
- `sbx policy log` no muestra ningún rechazo que tu lista no haya elegido.

## Para profundizar

### El modelo de amenaza

- Kai Greshake, [How We Broke LLMs: Indirect Prompt Injection][greshake-blog] - la entrada que acompaña al artículo fundacional de Greshake et al., [Not what you've signed up for][greshake]: un dato leído por el modelo se convierte en una instrucción, y Copilot ya se deja comprometer por la documentación de un paquete.
- Simon Willison, [The lethal trifecta for AI agents][trifecta] - acceso a datos privados, exposición a contenido no fiable y capacidad de comunicarse con el exterior: los tres juntos bastan para la exfiltración.
- Simon Willison, [Agents Rule of Two and The Attacker Moves Second][sw-rule-of-two] - la regla « como máximo dos de las tres propiedades » formulada por Meta, y un artículo que derriba doce defensas publicadas contra la inyección de prompt bajo ataque adaptativo.
- Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections][design-patterns] - patrones de arquitectura que restringen lo que el agente puede hacer, a costa de parte de su utilidad.
- Korny Sietsma, [Agentic AI and Security][fowler-security] - la trifecta aplicada a los agentes de código en martinfowler.com: contenedores, privilegio mínimo, descomposición de tareas.
- OWASP, [Top 10 for Agentic Applications 2026][owasp-agentic] - diez familias de riesgos, entre ellas el compromiso de la cadena de suministro y la ejecución de código imprevista.
- Marchand et al., [Quantifying Frontier LLM Capabilities for Container Sandbox Escape][sandbox-escape] - un banco de pruebas (2026) donde unos agentes encuentran y explotan las fallas de un contenedor vulnerable para salir de él, es decir, el argumento medido a favor de un núcleo separado.

### Incidentes documentados

- Johann Rehberger, [The Month of AI Bugs][month-ai-bugs] - una vulnerabilidad por día en agosto de 2025 en los agentes de código (Claude Code, Codex, Cursor, Copilot, Devin, Jules, OpenHands), de la que Simon Willison hace [la síntesis][summer-johann].
- Johann Rehberger, [Amazon Q Developer: Remote Code Execution with Prompt Injection][etr-amazon-q] - un `find -exec` clasificado como de solo lectura basta para ejecutar código sin aprobación.
- Will Vandevanter (Trail of Bits), [Prompt injection to RCE in AI agents][tob-rce] - la inyección de argumentos en comandos preaprobados, y el sandbox recomendado como defensa principal en lugar de las listas de comandos seguros.
- Kevin Higgs (Trail of Bits), [Prompt injection engineering for attackers: Exploiting GitHub Copilot][tob-copilot] - una issue de GitHub manipulada hace que Copilot Agent añada una dependencia con puerta trasera.
- Pillar Security, [Rules File Backdoor][rules-file] - instrucciones ocultas en un archivo de reglas de Cursor o de Copilot (marzo de 2025), es decir, la trampa del `SUPPORT.md` observada en condiciones reales.
- Nx, [S1ngularity postmortem][nx-postmortem] y Wiz, [análisis del ataque][wiz-nx] - un paquete npm comprometido (agosto de 2025) recluta a los agentes de código instalados en el equipo, lanzados sin confirmación, para detectar secretos que exfiltrar.
- Fortune, [Replit AI wiped a production database][replit] - un agente borra una base de datos de producción durante una congelación de cambios (julio de 2025), aunque una instrucción escrita lo prohibía.
- Pillar Security, [The Agent Security Paradox][cursor-paradox] - CVE-2026-22708 (enero de 2026): los comandos internos del shell como `export`, fuera de la lista de autorizaciones de Cursor, envenenan el entorno de los comandos aprobados.
- Unit 42, [OpenClaw's Skill Marketplace and the Emerging AI Supply Chain Threat][openclaw] - skills maliciosos en markdown en el marketplace de un agente (2026), el mismo riesgo que para un paquete instalado con `pi install`.
- Ken Huang, [Coding Agent Security: Lessons from Claude Code, Cowork, Codex, and Copilot in the Wild][ken-huang] - ocho incidentes de 2025 y 2026, y una comparación de los sandboxes de Claude Code, Codex, Copilot y Cursor (agosto de 2026).
- Simon Willison, [Breaking Claude Code Opus 5 Auto Mode][sw-auto-mode] - un ataque de Johann Rehberger que tuvo éxito cuatro veces de cada cinco contra el modo automático de Claude Code (agosto de 2026), y la conclusión de que un clasificador no reemplaza al sandbox.

### Las prácticas y los mecanismos de aislamiento

- Mario Zechner, [What I learned building an opinionated and minimal coding agent][zechner-pi] - el autor de Pi explica por qué Pi no tiene permisos (« As soon as your agent can write code and run code, it's pretty much game over ») y recomienda ejecutarlo en un contenedor.
- Armin Ronacher, [Agentic Coding Recommendations][ronacher] - el alias `claude-yolo` asumido, y el riesgo trasladado a Docker.
- Simon Willison, [Designing agentic loops][sw-loops] - el modo YOLO a la vez indispensable para la productividad y peligroso, de ahí el sandbox, preferiblemente en el ordenador de otra persona.
- Simon Willison, [Codex CLI sandbox investigation][codex-sandbox] - Seatbelt en macOS, Landlock y seccomp en Linux, o cómo otro harness hace la misma elección.
- sysid, [Your Agent Has Root][sysid] - las herramientas integradas que escapan al sandbox del núcleo, y una extensión de Pi para colmar la brecha.
- Andrew Lock, [Running AI agents safely in a microVM using docker sandbox][lock] - el recorrido completo de `sbx` en un puesto de desarrollador, políticas de red incluidas.
- Michael Krämer, [Trust but Sandbox][innoq] - Docker Sandboxes visto por un equipo: políticas, proxy de secretos, imágenes personalizadas.
- Palaimon, [Coding Agents III: Sandboxing & Best Practices][palaimon] - dev containers, bubblewrap y VM comparados, con el coste de arranque cuantificado.
- Ry Walker, [Local AI Agent Sandboxes][rywalker] - ocho herramientas de sandbox local comparadas, y lo que le queda a una herramienta de terceros cuando los harness integran la suya.
- Daniel Vaughan, [Agent Sandbox Comparison Matrix][vaughan] - Seatbelt de Codex, OpenShell y Docker `sbx`: frontera de aislamiento, red, secretos.
- Agache et al., [Firecracker][firecracker] - la micro-VM de AWS Lambda (NSDI 2020), el texto de referencia sobre el compromiso entre aislamiento y tiempo de arranque.
- Emir Beganović, [Your Container Is Not a Sandbox: The State of MicroVM Isolation in 2026][emirb] - por qué un contenedor no es una frontera de seguridad, el episodio en el que Claude Code desactiva su propio bubblewrap, y un repaso de las micro-VM disponibles (marzo de 2026).
- Greg Hurrell, [List of coding agent sandboxes][wincent] - un catálogo mantenido en 2026, de las primitivas del sistema a las plataformas alojadas, en diez categorías.
- Zheng et al., [ActPlane: Programmable OS-Level Policy Enforcement for Agent Harnesses][actplane] - una política de harness aplicada en el núcleo Linux mediante eBPF (junio de 2026), con un sobrecoste medido entre el 2 y el 8 %.

### Herramientas

- Docker Sandboxes : [arquitectura][docker-arch], [modelo de seguridad][docker-security] y [kits][docker-kits].
- Pi : [Seguridad][pi-security] y [Containerización][pi-container].
- [pi-sandbox][pi-sandbox-repo] - un sandbox de sistema por comando para Pi, con mensaje de autorización, sobre `sandbox-exec` o bubblewrap.
- [pi-gondolin][pi-gondolin] y [Gondolin][gondolin] - las herramientas de Pi ejecutadas en una micro-VM local ; ambos proyectos se declaran experimentales.
- [OpenShell][openshell] - un runtime con políticas declarativas (sistema de archivos, red, procesos, inferencia), citado por la documentación de Pi.

[greshake-blog]: https://kai-greshake.de/posts/llm-malware/
[greshake]: https://arxiv.org/abs/2302.12173
[trifecta]: https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/
[sw-rule-of-two]: https://simonwillison.net/2025/Nov/2/new-prompt-injection-papers/
[design-patterns]: https://arxiv.org/abs/2506.08837
[fowler-security]: https://martinfowler.com/articles/agentic-ai-security.html
[owasp-agentic]: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
[month-ai-bugs]: https://embracethered.com/blog/posts/2025/announcement-the-month-of-ai-bugs/
[summer-johann]: https://simonwillison.net/2025/Aug/15/the-summer-of-johann/
[etr-amazon-q]: https://embracethered.com/blog/posts/2025/amazon-q-developer-remote-code-execution/
[tob-rce]: https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/
[tob-copilot]: https://blog.trailofbits.com/2025/08/06/prompt-injection-engineering-for-attackers-exploiting-github-copilot/
[rules-file]: https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents
[nx-postmortem]: https://nx.dev/blog/s1ngularity-postmortem
[wiz-nx]: https://www.wiz.io/blog/s1ngularitys-aftermath
[replit]: https://fortune.com/2025/07/23/ai-coding-tool-replit-wiped-database-called-it-a-catastrophic-failure
[zechner-pi]: https://mariozechner.at/posts/2025-11-30-pi-coding-agent/
[ronacher]: https://lucumr.pocoo.org/2025/6/12/agentic-coding/
[sw-loops]: https://simonwillison.net/2025/Sep/30/designing-agentic-loops/
[codex-sandbox]: https://simonwillison.net/2025/Nov/9/codex-sandbox-investigation/
[sysid]: https://sysid.github.io/your-agent-has-root/
[lock]: https://andrewlock.net/running-ai-agents-safely-in-a-microvm-using-docker-sandbox/
[innoq]: https://www.innoq.com/en/blog/2026/07/trust-but-sandbox/
[palaimon]: https://blog.palaimon.io/posts/coding-agents-sandboxing-best-practices/
[rywalker]: https://rywalker.com/research/local-agent-sandboxes
[vaughan]: https://codex.danielvaughan.com/2026/04/24/agent-sandbox-comparison-codex-seatbelt-openshell-docker-sbx/
[firecracker]: https://www.usenix.org/conference/nsdi20/presentation/agache
[sandbox-escape]: https://arxiv.org/abs/2603.02277
[cursor-paradox]: https://www.pillar.security/blog/the-agent-security-paradox-when-trusted-commands-in-cursor-become-attack-vectors
[openclaw]: https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk/
[ken-huang]: https://kenhuangus.substack.com/p/coding-agent-security-lessons-from
[sw-auto-mode]: https://simonwillison.net/2026/Aug/27/breaking-claude-code-opus-5-auto-mode/
[emirb]: https://emirb.github.io/blog/microvm-2026/
[wincent]: https://gist.github.com/wincent/2752d8d97727577050c043e4ff9e386e
[actplane]: https://arxiv.org/abs/2606.25189
[docker-arch]: https://docs.docker.com/ai/sandboxes/architecture/
[docker-security]: https://docs.docker.com/ai/sandboxes/security/
[docker-kits]: https://docs.docker.com/ai/sandboxes/customize/kits/
[pi-security]: https://pi.dev/docs/latest/security
[pi-container]: https://pi.dev/docs/latest/containerization
[pi-sandbox-repo]: https://github.com/carderne/pi-sandbox
[pi-gondolin]: https://github.com/pasky/pi-gondolin
[gondolin]: https://github.com/earendil-works/gondolin
[openshell]: https://github.com/NVIDIA/OpenShell
