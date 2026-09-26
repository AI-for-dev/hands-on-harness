# El sandbox: aislar el agente de tu máquina

::: tip Objetivos de este módulo
- Saber qué puede hacer un agente de código en tu máquina
- Comparar el clon desechable, el contenedor y la micro-máquina virtual: qué protege cada uno y cuál es su coste
- Lanzar Pi en un Docker Sandbox con un kit versionado en este repositorio
- Terminar con un sandbox en el que las manipulaciones de los siguientes módulos funcionen sin supervisión
:::

Los módulos siguientes lanzan Pi veinte veces en la misma tarea sin intervención humana, le asignan subagentes con acceso a un shell y luego encadenan subagentes en pipelines. Pi no tiene ningún mecanismo para pedir tu consentimiento antes de ejecutar un comando, y su [documentación sobre seguridad](https://pi.dev/docs/latest/security) lo dice claramente: las herramientas leen, escriben y lanzan comandos « with the permissions of the pi process », y « Pi does not include a built-in sandbox ». Todo lo que tú puedes hacer desde tu terminal, el agente también puede hacerlo: leer `~/.ssh`, leer `~/.pi/agent/auth.json` donde guardas tus claves API, ejecutar `git push --force` o enviar el contenido de un archivo a cualquier dominio con `curl`.

La reacción natural es escribir una instrucción: « solo modifica `game/neon.js` », « no leas nada fuera del repositorio ». Una instrucción es texto y te recordamos que el uso de un modelo de lenguaje es siempre no determinista, lo que significa que nunca tendrás la garantía del 100 % de que se siga. En el módulo sobre competencias, verás que una instrucción de limpieza de archivos temporales colocada en un `SKILL.md` se sigue menos de una vez cada tres. Antes de la primera ejecución sin supervisión, hace falta una limitación que no dependa de la obediencia del modelo. El sandbox es una forma determinista de asegurarse de que el modelo de lenguaje esté en un entorno cerrado donde tú determinas las fronteras y el modelo no puede sobrepasarlas.

## Comprender

### ¿A qué tiene acceso el agente?

Un agente de código que se ejecuta en tu equipo tiene acceso a tus archivos; es decir, al repositorio en el que trabaja y, con los mismos permisos, a tu directorio personal, donde residen las claves SSH, los tokens de los proveedores de modelos y los archivos `.env` de tus otros proyectos. La red le permite instalar cualquier paquete, ejecutar un `curl | sh` encontrado en un README o difundir lo que acaba de leer. Finalmente, lanza procesos con tu identidad, lo que incluye el demonio de Docker, el comando `rm` y el acceso de escritura al repositorio remoto. Si además tienes permisos de sudo en tu máquina, nada puede detenerlo.

Estas acciones ni siquiera requieren que el modelo se equivoque. Un archivo del repositorio puede contener instrucciones escritas para el agente, y ese es el papel del `SUPPORT.md` de NÉON, cuyo texto imita un procedimiento de asistencia pero pide leer el `.env` y enviar su contenido a una dirección externa: el agente que abre este archivo para responder a una pregunta trata la instrucción como si viniera de ti, y el módulo sobre permisos trabajará en este caso. Una extensión instalada desde el directorio comunitario se ejecuta, como recordó el módulo sobre Pi, con la totalidad de tus permisos. En estos dos casos, el fallo está en el harness, y una barrera de seguridad escrita dentro de AGENTS.md no te protegerá.

La documentación de Pi llega a la siguiente conclusión: « For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task. » Nuestras veinte ejecuciones sobre el issue #1 son exactamente automatización sin supervisión. Y, a largo plazo, queremos agentes autónomos que puedan trabajar durante horas sin que nos veamos obligados a supervisarlos.

### Tres niveles de aislamiento

El más económico de los tres es el **clon desechable**. La herramienta de medición del siguiente módulo clona NÉON en un tag, en un directorio temporal, en cada ejecución, lo que protege el historial y el árbol de trabajo del repositorio sin coste alguno, o casi. Sin embargo, el proceso sigue ejecutándose bajo tu identidad, con tu directorio personal y tu red, por lo que un clon desechable solo protege el repositorio. Y aun así, nada impide que el modelo haga un push en tu repositorio remoto si tiene los permisos, como ocurre si tiene acceso al comando `gh` (para trabajar en tu GitHub).

Un paso más allá, el **contenedor** ejecuta Pi en una imagen de Docker donde solo el repositorio está montado, lo que deja tu directorio personal fuera de su alcance. Comparte el núcleo del host, su red está abierta por defecto y, sobre todo, la clave del proveedor de modelos debe añadirse para que Pi pueda llamar al modelo, algo que la [página de Pi sobre la contenerización](https://pi.dev/docs/latest/containerization) señala en una frase: « Provider API keys enter the container ». Por lo tanto, todo lo que el agente ejecute tiene acceso a esta clave.

El tercer nivel es la **micro-máquina virtual con política** con [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Cada sandbox tiene su propio núcleo detrás de un hipervisor, todo el tráfico TCP saliente pasa por un proxy en el host que solo acepta los dominios de una lista de permisos, y las claves de API se inyectan en las cabeceras HTTP a través de este proxy, de modo que, citando la [página sobre seguridad](https://docs.docker.com/ai/sandboxes/security/), « Credential values never enter the VM ». El directorio de trabajo se monta en la VM en la misma ruta absoluta que en el host. El coste es una imagen de setecientos megabytes que construir, un demonio que ejecutar, una lista de dominios permitidos que mantener. Esto puede parecer complicado, pero tu IA preferida podrá ayudarte a implementar fácilmente esta infraestructura.

| lo que está protegido          | clon desechable | contenedor                       | Docker Sandboxes                               |
| --------------------------- | ------------- | ------------------------------- | ---------------------------------------------- |
| el árbol de trabajo del repositorio | sí           | no                             | no por defecto, sí con `--clone`             |
| tu directorio personal  | no           | sí, si solo se monta el repositorio | sí                                            |
| la red saliente           | no           | no por defecto                  | sí, denegación por defecto y lista de permisos |
| tus claves de API              | no           | no, entran en la imagen | sí, solo el proxy del host las ve          |

Estos tres niveles aíslan el proceso de Pi de la máquina host, pero nada dentro del sandbox impide aún que Pi ejecute `rm -rf` en el repositorio o lea un `.env` que esté en NÉON. La extensión [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) añade este filtro dentro del propio sandbox: se engancha al evento `tool_call` de la API de extensiones de Pi, un hook que intercepta cada llamada de herramienta, cada comando bash, cada llamada MCP y cada skill invocado antes de su ejecución, y compara la solicitud con reglas `allow` / `deny` / `ask` escritas en JSON.

El compromiso reside en dónde se ejecuta este filtro. Vive en el mismo proceso Node que Pi, y no en el núcleo que aísla el sandbox, de modo que una extensión que comprometiera este proceso antes de que se evalúe la regla desactivaría la barrera de seguridad junto con el resto. `pi-permission-system` restringe lo que Pi puede hacer una vez lanzado en el sandbox; no sustituye ninguno de los tres niveles de la tabla anterior.

### Lo que el sandbox no protege

En modo directo, el predeterminado, el agente edita tu árbol de trabajo in situ, y la documentación de Docker Sandboxes recuerda que puede modificar un hook de git, un `Makefile` o una configuración de integración continua, que se ejecutarán más tarde en el host cuando los lances tú mismo. El sandbox protege la máquina mientras el agente trabaja, y esto no te exime de revisar el diff.

La política de red `balanced`, la que recomienda `sbx policy init`, autoriza dominios mediante comodines amplios como `*.googleapis.com`, que cubren mucho más que las API de modelos. Partimos de `deny-all` y luego solo abrimos los dominios que aparecen en el registro de denegaciones.

Dentro de la VM, por último, el agente es administrador, con `sudo` sin contraseña y su propio demonio de Docker, lo cual aceptamos ya que nada de lo que ocurre allí sale al exterior y la VM en sí es desechable.

## Reconstruir

Te proponemos dos enfoques a continuación: el uso de una extensión en Pi que añade un hook (que te propondremos reconstruir en otro módulo) y el uso de Docker Sandboxes. La primera solución no requiere ninguna instalación particular en tu sistema y, por lo tanto, se utilizará para la formación presencial. Pero ten en cuenta que tiene sus límites y que es evidente que no es suficiente para el trabajo diario con agentes.

### Instalar y configurar `pi-permission-system`

La extensión se instala con un comando, como cualquier paquete del directorio de Pi:

```bash
pi install npm:@gotgenes/pi-permission-system
```

Las reglas residen en un archivo JSON, leído en tres niveles: global (`~/.pi/agent/extensions/pi-permission-system/config.json`), proyecto (`.pi/extensions/pi-permission-system/config.json`, ignorado si el proyecto no está aprobado) y por agente, en el encabezado YAML de un archivo de agente, que prevalece sobre los dos primeros. Para NÉON, una configuración de proyecto basta para frenar la instrucción más peligrosa de `SUPPORT.md`, ya que la lectura de un `.env` está denegada por diseño:

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

La regla más específica prevalece: `bash.*` solicita confirmación por defecto, `rm -rf *` rechaza sin preguntar, y una ruta fuera del repositorio sigue sujeta a confirmación incluso cuando `path.*` autoriza todo lo demás. Un comando que el analizador de bash de la extensión no sabe clasificar es rechazado en lugar de permitido, y una ruta que atraviesa un enlace simbólico se resuelve antes de la comparación.

::: info Ejercicio (en sala)
Trabaja en un clon desechable de NÉON, ya que dos de las solicitudes siguientes son destructivas. Instala la extensión, coloca la configuración anterior en `.pi/extensions/pi-permission-system/config.json`, crea en la raíz un `.env` que contenga una clave falsa, luego inicia Pi y pídile tres cosas: que te lea el contenido de ese `.env`, que borre la carpeta `game/` con `rm -rf`, y que ejecute la suite de pruebas. Las dos primeras solicitudes son rechazadas sin que Pi te consulte, la tercera abre una confirmación a la que respondes tú mismo.

Luego, vuelve a pedir la lectura del `.env` tres veces seguidas reformulando la petición, luego explica a Pi que eres el propietario del archivo y que lo autorizas: el veredicto no cambia, porque proviene de una regla evaluada antes de la llamada a la herramienta y no de un arbitraje del modelo.

Finalmente, retira el bloque `path` de la configuración y sustitúyelo por la instrucción « nunca leas archivos `.env` » en el `AGENTS.md` del repositorio, luego vuelve a hacer la misma petición cinco veces en cinco sesiones diferentes. Cuenta los rechazos obtenidos: así tendrás tu propia cifra sobre lo que vale una instrucción en texto frente a una barrera de seguridad en código.
:::

#### Instalar y configurar `sbx`

`sbx` es el comando para usar Docker Sandboxes. `sbx` conoce una lista de agentes que sabe lanzar tal cual (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` y algunos otros). Lamentablemente, Pi no forma parte de ella. Por lo tanto, es necesario crear [un kit](https://docs.docker.com/ai/sandboxes/customize/): un directorio descrito por un `spec.yaml` cuya variante `kind: sandbox` define un agente desde cero: la imagen, el comando de inicio, las instrucciones añadidas al archivo de contexto, las claves a inyectar y los permisos de red. El nuestro está versionado en https://github.com/AI-for-dev/pi-sandbox y contiene solo tres archivos.

```
pi-sandbox
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

Las versiones citadas a continuación son aquellas con las que se verificó este kit en el momento de redactar el documento: `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2.

#### Instalar `sbx`

La herramienta de línea de comandos se llama `sbx`. Para instalarla en tu SO, basta con ir a la siguiente página

https://docs.docker.com/ai/sandboxes/install/

#### Construir la imagen

```dockerfile
FROM docker/sandbox-templates:shell-docker
USER root

ARG NODE_VERSION=22.21.1
ARG PI_VERSION=0.85.1
# Ubuntu names the package fd-find and ships the binary as fdfind, to avoid a
# name collision. pi looks for fd then fdfind, so /usr/bin/fdfind is enough and
# pi stops downloading its own copy into ~/.pi/agent/bin.
ARG FD_PACKAGE_VERSION=10.3.0-2ubuntu1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    xz-utils ca-certificates curl "fd-find=${FD_PACKAGE_VERSION}" \
    && fdfind --version \
    && rm -rf /var/lib/apt/lists/*

# Explicit Node install instead of inheriting from the template: pi requires
# >= 22.19, and the base image's bundled version is not a contract.
RUN set -eux; \
    case "$(dpkg --print-architecture)" in \
    amd64) a=x64 ;; \
    arm64) a=arm64 ;; \
    *) echo "unsupported architecture" >&2; exit 1 ;; \
    esac; \
    cd /tmp; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${a}.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-${a}.tar.xz$" SHASUMS256.txt | sha256sum -c -; \
    mkdir -p /opt/node; \
    tar -xJf "node-v${NODE_VERSION}-linux-${a}.tar.xz" -C /opt/node --strip-components=1; \
    rm -f /tmp/*.tar.xz /tmp/SHASUMS256.txt

ENV PATH="/opt/node/bin:${PATH}"

RUN npm install -g "@earendil-works/pi-coding-agent@${PI_VERSION}" \
    && pi --version

USER agent
```

La imagen parte del modelo `shell-docker` proporcionado por Docker, instala una versión explícita de Node, porque Pi requiere al menos la 22.19, y luego fija la versión de Pi.

El demonio de Docker Sandboxes extrae sus imágenes desde un registro diferente al de las imágenes locales disponibles para Docker. Sin registro, se utiliza un archivo:

```bash
git clone https://github.com/AI-for-dev/pi-sandbox
cd pi-sandbox
docker build --platform linux/arm64 -t pi-sandbox:0.85.2 .
docker image save pi-sandbox:0.85.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

Para un equipo, es preferible subir la imagen a un registro.

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
  image: "pi-sandbox:0.85.1"
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
          header: Authorization
          format: "Bearer %s"

permissions:
  network:
    allow:
      - github.com
      - raw.githubusercontent.com
      - pypi.org
      - files.pythonhosted.org
      - pi.dev
```

El bloque `sandbox` nombra la imagen creada en el paso anterior e inicia `pi -a`. La opción `-a` declara los archivos del proyecto como seguros para esta ejecución, lo que responde a la pregunta que `trust.json` planteaba al módulo en Pi: dentro de la VM, un skill o una extensión encontrados en el repositorio solo pueden tocar lo que la VM contiene.

`agentInstructions` añade algunas líneas al `AGENTS.md` que lee el modelo: un dominio denegado no es un fallo de red, lo que evita que reintente diez veces, y la clave del proveedor no está en la VM.

El bloque `credentials` declara una clave gestionada por el proxy (`proxyManaged: true`). Pi encuentra en `ILAAS_API_KEY` una **centinela**, un valor ficticio, y el proxy del host la reemplaza por la clave real en el encabezado `Authorization` de las solicitudes hacia `llm.ilaas.fr`, y en ningún otro lugar.

Bajo `permissions.network`, el kit habilita, por encima de la política global, el proveedor de modelos, GitHub para clonar NÉON y PyPI para las herramientas de medición. Las variables `PI_SKIP_VERSION_CHECK` y `PI_TELEMETRY` desactivan algunas operaciones de red del inicio de Pi.

El archivo `files/home/.pi/agent/settings.json`, que el kit deposita en el directorio personal del agente, define el proveedor y el modelo por defecto, y el nivel de razonamiento. Reemplaza el `~/.pi/agent/settings.json` de tu host, que no está montado en la VM. Aquí es bastante simple y se parece a esto:

```json
{
  "defaultProvider": "ilaas",
  "defaultModel": "deepseek-v4-flash",
  "defaultThinkingLevel": "high"
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

#### Registrar la clave

`ilaas` se autentica mediante una clave de API. Se la confía a `sbx` bajo el nombre del servicio declarado por el kit:

```bash
sbx secret set ilaas
```

Entonces debes introducir tu clave. Después puedes verificar que se haya registrado correctamente mediante el comando:

```bash
sbx secret ls
```

En el primer lanzamiento, `sbx` solicita aprobar el **credential binding**, la autorización dada a un kit de terceros para utilizar este secreto en los dominios que declare. La respuesta se guarda en `~/.config/sbx/credentials.yaml`.

::: warning En modo no interactivo, nadie responde
Con `sbx create` o desde un script, la pregunta del binding no se le plantea a nadie. La sandbox arranca de todos modos, ya que `sbx` solo emite una advertencia, y la variable de entorno contiene la centinela `proxy-managed`: la clave real nunca es inyectada por el proxy. Por lo tanto, el error solo aparece durante el uso, en forma de `401`, y `pi auth check` anuncia a pesar de todo `ready`. Es necesario un binding por servicio declarado. Escribe el archivo antes:

```yaml
bindings:
  ilaas:
    apiKey:
      domains: [llm.ilaas.fr]
```
:::

#### Definir la política de red

Este ajuste es global, `sbx` lo exige antes de la primera sandbox, y se realiza una sola vez:

```bash
sbx policy init deny-all
```

Las reglas `permissions.network.allow` del kit se aplican por encima, solo para sus sandboxes.

#### Lanzar

```bash
cd pi-sandbox
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/pi-sandbox
```

::: info Ejercicio (autónomo)
Sigue por tu cuenta los cinco pasos anteriores, desde la instalación de `sbx` hasta el primer `sbx run`. En la sesión de Pi que se abra, pide el valor de la variable `ILAAS_API_KEY`: verás la centinela y no tu clave. Luego ejecuta un `curl https://example.com`: la solicitud fallará porque el dominio no está en ninguna lista. Finalmente, haz que se modifique un archivo de NÉON: el cambio aparecerá en el host en cuanto Pi haya escrito.

Vuelve al host y lee `sbx policy log`, donde cada denegación queda registrada con el dominio solicitado. Termina el ejercicio sobre `pi-permission-system`, esta vez dentro del sandbox: las dos barreras de seguridad se superponen sin interferir entre sí, y la denegación del `rm -rf` sigue siendo útil, ya que en modo directo el repositorio que Pi borraría es el de tu host.
:::

#### Ajustar la lista de permisos

::: info Ejercicio (autónomo)
Trabaja una sesión completa en el sandbox y luego lee `sbx policy log`. Añade a `permissions.network.allow` solo los dominios cuyo bloqueo te haya impedido avanzar realmente, ejecutando `sbx kit validate` tras cada modificación.
:::

## Generalizar

**Una frontera de uso que no depende de la obediencia.** Un permiso escrito en texto, en un `AGENTS.md` o un `SKILL.md`, es una sugerencia que el modelo sigue o no. El módulo sobre permisos construirá barreras de seguridad en código dentro del harness, que denegarán una llamada a una herramienta antes de que se ejecute. El sandbox es la capa exterior, la que resiste cuando el propio harness falla, porque una extensión maliciosa o un archivo trampa solo pueden dañar la VM.

**La clave permanece en el host.** El agente no necesita leer la clave, sino que sus solicitudes a un dominio concreto estén autenticadas; mantener la clave en el host para incluirla en el encabezado en el momento en que la solicitud sale la mantiene fuera del alcance de todo lo que el agente puede leer, ejecutar o enviar. Este principio se aplica a cualquier harness, independientemente de la herramienta que lo implemente.

**Denegar por defecto y abrir desde el registro.** La lista de permisos de un kit no se escribe de antemano: se empieza por la denegación, se trabaja durante una sesión y solo se añaden los dominios cuyo bloqueo realmente haya impedido algo, al igual que el resto del acto se basa en una medida y no en una intuición.

## Entregable

Al final de este módulo, Pi se ejecuta en un sandbox sobre tu clon de NÉON, y todas las manipulaciones de los módulos siguientes podrán realizarse allí con un control óptimo.

Cuatro comprobaciones lo confirman:

- la variable `ILAAS_API_KEY` leída desde el sandbox es la centinela;
- una solicitud a un dominio ausente de la lista falla;
- una edición realizada por Pi aparece en el repositorio del host;
- `sbx policy log` no muestra ninguna denegación que no hayas elegido en tu lista.

## Trampas

**Creer que el sandbox protege el repositorio.** En modo directo el agente escribe en tu árbol de trabajo, hooks y `Makefile` incluidos. Revisa el diff, o usa `--clone` para trabajar en una copia privada.

**Copiar una clave en `models.json`.** Esta entra en la VM con el archivo. Toda clave pasa por `sbx secret` y una variable de sustitución.

## Para profundizar

### El modelo de amenaza

- Kai Greshake, [How We Broke LLMs: Indirect Prompt Injection][greshake-blog] - la entrada que acompaña al artículo fundacional de Greshake et al., [Not what you've signed up for][greshake]: un dato leído por el modelo se convierte en una instrucción, y Copilot ya se deja comprometer por la documentación de un paquete.
- Simon Willison, [The lethal trifecta for AI agents][trifecta] - acceso a datos privados, exposición a contenido no fiable y capacidad de comunicarse con el exterior: los tres juntos bastan para la exfiltración.
- Simon Willison, [Agents Rule of Two and The Attacker Moves Second][sw-rule-of-two] - la regla «máximo dos propiedades de tres» formulada por Meta, y un artículo que derriba doce defensas publicadas contra la inyección de prompt bajo ataque adaptativo.
- Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections][design-patterns] - patrones de arquitectura que restringen lo que el agente puede hacer, a costa de parte de su utilidad.
- Korny Sietsma, [Agentic AI and Security][fowler-security] - la trifecta aplicada a los agentes de código en martinfowler.com: contenedores, mínimo privilegio, división de tareas.
- OWASP, [Top 10 for Agentic Applications 2026][owasp-agentic] - diez familias de riesgos, incluyendo la compromisión de la cadena de suministro y la ejecución de código imprevista.
- Marchand et al., [Quantifying Frontier LLM Capabilities for Container Sandbox Escape][sandbox-escape] - un banco de pruebas (2026) donde los agentes encuentran y explotan las fallas de un contenedor vulnerable para salir de él, es decir, el argumento medido a favor de un núcleo separado.

### Incidentes documentados

- Johann Rehberger, [The Month of AI Bugs][month-ai-bugs] - una vulnerabilidad al día en agosto de 2025 en los agentes de código (Claude Code, Codex, Cursor, Copilot, Devin, Jules, OpenHands), de los cuales Simon Willison hace [el resumen][summer-johann].
- Johann Rehberger, [Amazon Q Developer: Remote Code Execution with Prompt Injection][etr-amazon-q] - un `find -exec` clasificado como de solo lectura basta para ejecutar código sin aprobación.
- Will Vandevanter (Trail of Bits), [Prompt injection to RCE in AI agents][tob-rce] - la inyección de argumentos en comandos preaprobados, y el sandbox recomendado como defensa principal en lugar de las listas de comandos seguros.
- Kevin Higgs (Trail of Bits), [Prompt injection engineering for attackers: Exploiting GitHub Copilot][tob-copilot] - una issue de GitHub trampa provoca que Copilot Agent añada una dependencia con una puerta trasera.
- Pillar Security, [Rules File Backdoor][rules-file] - instrucciones ocultas en un archivo de reglas de Cursor o Copilot (marzo de 2025), es decir, la trampa del `SUPPORT.md` observada en condiciones reales.
- Nx, [S1ngularity postmortem][nx-postmortem] y Wiz, [analyse de l'attaque][wiz-nx] - un paquete npm comprometido (agosto de 2025) recluta a los agentes de código instalados en el equipo, lanzados sin confirmación, para localizar secretos que exfiltrar.
- Fortune, [Replit AI wiped a production database][replit] - un agente borra una base de datos de producción durante una congelación de cambios (julio de 2025), a pesar de que una instrucción escrita lo prohibía.
- Pillar Security, [The Agent Security Paradox][cursor-paradox] - CVE-2026-22708 (enero de 2026): comandos internos del shell como `export`, fuera de la lista de autorizaciones de Cursor, envenenan el entorno de los comandos aprobados.
- Unit 42, [OpenClaw's Skill Marketplace and the Emerging AI Supply Chain Threat][openclaw] - skills en Markdown maliciosos en el marketplace de un agente (2026), el mismo riesgo que para un paquete instalado con `pi install`.
- Ken Huang, [Coding Agent Security: Lessons from Claude Code, Cowork, Codex, and Copilot in the Wild][ken-huang] - ocho incidentes de 2025 y 2026, y una comparación de los sandboxes de Claude Code, Codex, Copilot y Cursor (agosto de 2026).
- Simon Willison, [Breaking Claude Code Opus 5 Auto Mode][sw-auto-mode] - un ataque de Johann Rehberger exitoso cuatro de cada cinco veces contra el modo automático de Claude Code (agosto de 2026), y la conclusión de que un clasificador no reemplaza al sandbox.

### Las prácticas y los mecanismos de aislamiento

- Mario Zechner, [What I learned building an opinionated and minimal coding agent][zechner-pi] - el autor de Pi explica por qué Pi no tiene permisos (« As soon as your agent can write code and run code, it's pretty much game over ») y recomienda ejecutarlo en un contenedor.
- Armin Ronacher, [Agentic Coding Recommendations][ronacher] - el alias `claude-yolo` asumido y el riesgo desplazado a Docker.
- Simon Willison, [Designing agentic loops][sw-loops] - el modo YOLO, a la vez indispensable para la productividad y peligroso, de ahí el sandbox, preferiblemente en el ordenador de otra persona.
- Simon Willison, [Codex CLI sandbox investigation][codex-sandbox] - Seatbelt en macOS, Landlock y seccomp en Linux, o cómo otro harness toma la misma decisión.
- sysid, [Your Agent Has Root][sysid] - las herramientas integradas que escapan al sandbox del núcleo y una extensión de Pi para cerrar la brecha.
- Andrew Lock, [Running AI agents safely in a microVM using docker sandbox][lock] - el recorrido completo de `sbx` en el equipo de un desarrollador, incluidas las políticas de red.
- Michael Krämer, [Trust but Sandbox][innoq] - Docker Sandboxes desde la perspectiva de un equipo: políticas, proxy de secretos, imágenes personalizadas.
- Palaimon, [Coding Agents III: Sandboxing & Best Practices][palaimon] - comparativa de dev containers, bubblewrap y VM, con el coste de arranque cuantificado.
- Ry Walker, [Local AI Agent Sandboxes][rywalker] - comparación de ocho herramientas de sandbox local y qué queda para una herramienta de terceros cuando los harness integran la suya propia.
- Daniel Vaughan, [Agent Sandbox Comparison Matrix][vaughan] - Seatbelt de Codex, OpenShell y Docker `sbx`: frontera de aislamiento, red, secretos.
- Agache et al., [Firecracker][firecracker] - la micro-VM de AWS Lambda (NSDI 2020), el texto de referencia sobre el compromiso entre el aislamiento y el tiempo de arranque.
- Emir Beganović, [Your Container Is Not a Sandbox: The State of MicroVM Isolation in 2026][emirb] - por qué un contenedor no es una frontera de seguridad, el episodio en el que Claude Code desactiva su propio bubblewrap y un recorrido por las micro-VM disponibles (marzo de 2026).
- Greg Hurrell, [List of coding agent sandboxes][wincent] - un catálogo actualizado en 2026, desde primitivas del sistema hasta plataformas alojadas, en diez categorías.
- Zheng et al., [ActPlane: Programmable OS-Level Policy Enforcement for Agent Harnesses][actplane] - una política de harness aplicada en el núcleo de Linux mediante eBPF (junio de 2026), con un sobrecoste medido entre el 2 y el 8 %.

### Herramientas

- Docker Sandboxes: [arquitectura][docker-arch], [modelo de seguridad][docker-security] y [kits][docker-kits].
- Pi: [Seguridad][pi-security] y [Contenerización][pi-container].
- [pi-sandbox][pi-sandbox-repo] - un sandbox de sistema por comando para Pi, con solicitud de autorización, en `sandbox-exec` o bubblewrap.
- [pi-gondolin][pi-gondolin] y [Gondolin][gondolin] - las herramientas de Pi ejecutadas en una micro-VM local; ambos proyectos se declaran experimentales.
- [OpenShell][openshell] - un runtime de políticas declarativas (sistema de archivos, red, procesos, inferencia), citado por la documentación de Pi.

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
