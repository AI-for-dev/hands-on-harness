# El sandbox: dónde el agente tiene permiso para actuar

::: tip Objetivos de este módulo
- Saber a qué puede acceder un agente de código desde tu máquina cuando nada se lo impide
- Distinguir tres niveles de aislamiento, desde el clon desechable hasta la micro-máquina virtual, y nombrar qué protege cada uno y cuál es su coste
- Lanzar Pi en un Docker Sandbox con un kit versionado en este repositorio
- Terminar con un sandbox en el que las manipulaciones de los siguientes módulos se ejecuten sin supervisión
:::

Los módulos siguientes lanzan Pi veinte veces para la misma tarea sin supervisión, les confían subagentes que tienen un shell y, después, encadenan estos subagentes en pipelines. Pi no tiene ningún mecanismo para pedir tu consentimiento antes de ejecutar un comando, y su [documentación sobre seguridad](https://pi.dev/docs/latest/security) lo dice claramente: las herramientas leen, escriben y lanzan comandos « with the permissions of the pi process », y « Pi does not include a built-in sandbox ». Por lo tanto, cualquier cosa que tú puedas hacer desde tu terminal, el agente también puede hacerla: leer `~/.ssh`, leer `~/.pi/agent/auth.json` donde se guardan tus claves API, ejecutar `git push --force` o enviar el contenido de un archivo a cualquier dominio con `curl`.

La reacción natural es escribir una instrucción, « solo modifica `game/neon.js` », « no leas nada fuera del repositorio ». Una instrucción es texto, y el módulo sobre competencias medirá que una instrucción de limpieza colocada en un `SKILL.md` se sigue menos de una vez cada tres. Antes de la primera ejecución sin supervisión, es necesario establecer un límite que no dependa de la obediencia del modelo; ese es el límite que construiremos ahora, para que todo lo demás del acto se ejecute en su interior.

## Comprender

### ¿A qué puede acceder el agente?

Un agente de código que se ejecuta en tu equipo tiene acceso a tus **archivos**, es decir, al repositorio en el que trabaja y, con los mismos permisos, a tu directorio personal, donde residen las claves SSH, los tokens de los proveedores de modelos y los archivos `.env` de tus otros proyectos. La **red** le permite instalar cualquier paquete, ejecutar un `curl | sh` encontrado en un README o extraer lo que acaba de leer. Por último, lanza **procesos** con tu identidad, lo que incluye el demonio Docker, el comando `rm` y el acceso de escritura al repositorio remoto.

Estas acciones ni siquiera requieren que el modelo se equivoque. Un archivo del repositorio puede contener instrucciones escritas para el agente, y el módulo sobre permisos planteará precisamente esta trampa en un `SUPPORT.md` de NÉON. Una extensión instalada desde el directorio comunitario se ejecuta, como recordó el módulo sobre Pi, con la totalidad de tus permisos. En ambos casos, el harness mismo es la vulnerabilidad, y una barrera de seguridad escrita dentro del harness no cambiaría nada.

La documentación de Pi saca la conclusión de esta situación: « For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task. » Nuestras veinte ejecuciones sobre el issue #1 son exactamente automatización sin supervisión.

### Tres niveles de aislamiento

El primer nivel es el **clon desechable**. La herramienta de medición del siguiente módulo clona NÉON en un tag, en un directorio temporal, en cada ejecución, lo que protege el historial y el árbol de trabajo del repositorio y no cuesta casi nada. Sin embargo, el proceso se ejecuta siempre bajo tu identidad, con tu directorio personal y tu red, por lo que un clon desechable solo protege el repositorio.

El segundo nivel es el **contenedor**. Pi se ejecuta en una imagen de Docker donde solo se monta el repositorio, lo que deja tu directorio personal fuera de alcance. El contenedor comparte el núcleo del host, su red está abierta por defecto y, sobre todo, la clave del proveedor de modelos debe entrar en el contenedor para que Pi pueda llamar al modelo, algo que la [página de Pi sobre la contenerización](https://pi.dev/docs/latest/containerization) señala en una frase: « Provider API keys enter the container ». Por lo tanto, todo lo que el agente ejecute tiene acceso a esa clave.

El tercer nivel es la **micro-máquina virtual con política**, y es la que elegimos con [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Cada sandbox tiene su propio núcleo detrás de un hipervisor, todo el tráfico TCP saliente pasa por un proxy en el host que solo acepta los dominios de una lista de permisos, y las claves de API son inyectadas en las cabeceras HTTP por ese proxy, de modo que, para citar la [página de seguridad](https://docs.docker.com/ai/sandboxes/security/), « Credential values never enter the VM ». El directorio de trabajo se monta en la VM en la misma ruta absoluta que en el host. El coste es una imagen de setecientos megabytes que construir, un demonio que ejecutar, una lista de dominios autorizados que mantener y la imposibilidad de conectar con un proveedor local como LM Studio en `127.0.0.1`, ya que la VM tiene su propia pila de red.

| lo que está protegido          | clon desechable | contenedor                        | Docker Sandbox                                 |
| --------------------------- | ------------- | -------------------------------- | ---------------------------------------------- |
| el árbol de trabajo del repositorio | sí           | no                              | no por defecto, sí con `--clone`             |
| tu directorio personal  | no           | sí, si solo se monta el repositorio  | sí                                            |
| la red saliente           | no           | no por defecto                   | sí, denegación por defecto y lista de permisos |
| tus claves de API              | no           | no, se incluyen en la imagen  | sí, solo el proxy del host las ve          |

### Lo que el sandbox no protege

En modo directo, que es el predeterminado, el agente edita tu árbol de trabajo in situ, y la documentación de Docker Sandboxes recuerda que puede modificar un hook de git, un `Makefile` o una configuración de integración continua, que se ejecutarán más tarde en el host cuando los lances tú mismo. El sandbox protege la máquina durante la ejecución, y la revisión del diff sigue siendo tu responsabilidad después. Por esta razón, la herramienta de medición del siguiente módulo mantiene su clon desechable dentro del sandbox.

La política de red `balanced`, la que recomienda `sbx policy init`, autoriza dominios mediante comodines amplios como `*.googleapis.com`, que cubren mucho más que las API de modelos. Partimos de `deny-all` y solo abrimos lo que requiere el registro de denegaciones.

Finalmente, dentro de la VM, el agente es administrador, con `sudo` sin contraseña y su propio demonio de Docker, lo cual aceptamos ya que el límite es la VM y todo lo que ocurre en su interior es desechable.

## Reconstruir

### ¿Por qué un kit?

`sbx` conoce una lista de agentes que sabe lanzar tal cual (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` y algunos otros) y Pi no forma parte de ella. El punto de extensión previsto para este caso es el **kit**, un directorio descrito por un `spec.yaml` cuya variante `kind: sandbox` define un agente desde cero: la imagen, el comando de inicio, las instrucciones añadidas al archivo de contexto, las claves que se deben inyectar y los permisos de red. El nuestro está versionado en `scripts/pi-kit/` de este repositorio y consta de tres archivos.

```
scripts/pi-kit/
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

Las versiones citadas a continuación son aquellas con las que se verificó este kit el 16 de agosto de 2026: `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2. El kit es un artefacto de la segunda etapa del método, y estos números cambiarán.

### Instalar `sbx`

La herramienta de línea de comandos se llama `sbx`, y las páginas que aún describen un plugin `docker sandbox` se refieren a una versión retirada:

```bash
brew trust docker/tap
brew install docker/tap/sbx
sbx login
```

### Construir la imagen

<<<@/../scripts/pi-kit/Dockerfile{dockerfile}

La imagen parte de la plantilla `shell-docker` proporcionada por Docker, instala una versión explícita de Node, ya que Pi requiere al menos la 22.19 y la versión incluida en la imagen base no es un contrato, y luego fija la versión de Pi. La imagen es la unidad reproducible: ejecutar `npm install` en cada creación de sandbox no garantizaría la misma versión dos veces.

El demonio de Docker Sandboxes obtiene sus imágenes desde un registro y no comparte el almacén local de Docker. Sin registro, se utiliza un archivo:

```bash
cd scripts/pi-kit
docker build --platform linux/arm64 -t pi-sandbox:0.84.2 .
docker image save pi-sandbox:0.84.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

Para un equipo, se sube la imagen a un registro y se fija `sandbox.image` mediante su digest, por la razón que el siguiente módulo detallará sobre los tags: un nombre puede moverse, un digest no.

### Declarar el kit

<<<@/../scripts/pi-kit/spec.yaml

El bloque `sandbox` nombra la imagen cargada en el paso anterior y ejecuta `pi -a`. La opción `-a` declara los archivos del proyecto como seguros para esta ejecución, lo que responde a la pregunta que `trust.json` planteaba en el módulo sobre Pi: dentro de la VM, un skill o una extensión encontrados en el repositorio solo pueden acceder a lo que contiene la VM, y la decisión de confianza cambia de escala.

El bloque `agentInstructions` añade algunas líneas al archivo `AGENTS.md` que lee el modelo. Le indican que un dominio denegado no es un fallo de red, lo que evita que lo intente diez veces, y que la clave del proveedor no está en la VM.

El bloque `credentials` declara una clave gestionada por el proxy (`proxyManaged: true`). Pi encuentra en `OPENCODE_API_KEY` una **centinela**, un valor ficticio, y el proxy del host lo reemplaza por la clave real en el encabezado `Authorization` de las solicitudes hacia `opencode.ai`, y en ningún otro lugar. Una sola clave cubre `opencode-go` y opencode Zen, ya que Pi lee la misma variable para ambos.

El bloque `permissions.network` enumera los dominios que el kit habilita sobre la política global: el proveedor de modelos, GitHub para clonar NÉON, PyPI para las herramientas de medición. La denegación explícita de `pi.dev`, junto con las variables `PI_SKIP_VERSION_CHECK` y `PI_TELEMETRY`, corta las operaciones de red al inicio de Pi.

El archivo `files/home/.pi/agent/settings.json`, que el kit deposita en el directorio personal del agente, fija el proveedor y el modelo por defecto, el nivel de razonamiento y un inicio silencioso. Cumple la función del `~/.pi/agent/settings.json` de tu host, que no está montado en la VM.

### Registrar la clave

`opencode-go` se autentica mediante clave de API y Pi la guarda en tu host en `~/.pi/agent/auth.json`. Se la confía a `sbx` bajo el nombre del servicio declarado por el kit:

```bash
python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.pi/agent/auth.json')))['opencode-go']['key'])" \
  | sbx secret set opencode-go
sbx secret ls
```

En la primera ejecución, `sbx` pide aprobar el **credential binding**, la autorización otorgada a un kit externo para usar este secreto en los dominios que declara. La respuesta se guarda en `~/.config/sbx/credentials.yaml`.

::: warning En modo no interactivo, nadie responde
Con `sbx create` o desde un script, a nadie se le pregunta por el binding; el sandbox se inicia sin la clave y solo emite una advertencia. Escribe el archivo antes:

```yaml
bindings:
  opencode-go:
    apiKey:
      domains: [opencode.ai]
```
:::

### Definir la política de red

El ajuste es global, se requiere antes del primer sandbox y se hace una sola vez:

```bash
sbx policy init deny-all
```

Las reglas `permissions.network.allow` del kit se aplican encima, solo para sus sandboxes.

### Lanzar

```bash
sbx kit validate scripts/pi-kit
cd /chemin/vers/neon
sbx run --kit /chemin/vers/hands-on-harness/scripts/pi-kit pi
```

::: info Ejercicio (en aula)
En la sesión de Pi que se abra, pide tres cosas. Primero, el valor de la variable `OPENCODE_API_KEY`: verás la centinela y no tu clave. Después, un `curl https://example.com`: la petición falla porque el dominio no está en ninguna lista. Por último, una modificación de un archivo de NÉON: aparecerá en el host en cuanto Pi haya escrito.

Vuelve al host y lee `sbx policy log`, donde cada denegación queda registrada con el dominio solicitado.
:::

Esto es lo que se ha verificado en este kit el 16 de agosto de 2026, con las versiones citadas anteriormente: la construcción de la imagen, `sbx kit validate`, `sbx template load` y la creación del sandbox; la inyección de la clave, con un `POST /zen/go/v1/chat/completions` que lleva la centinela y devuelve un `200`; una respuesta de `pi -p` mediante `opencode-go` y `deepseek-v4-flash`; una edición solicitada a Pi visible en el repositorio del host.

### Restringir la lista de permisos

::: info Ejercicio (autónomo)
Trabaja una sesión completa en el sandbox y luego revisa `sbx policy log`. Añade a `permissions.network.allow` solo los dominios cuyo bloqueo te haya impedido avanzar, ejecutando `sbx kit validate` tras cada modificación.
:::

No escribas nunca comodines en `inject[].domain`: el proxy pasaría entonces a interceptación TLS en todos los subdominios afectados, para una clave que solo necesita un único host.

::: warning Dos trampas de `sbx` 0.38.0
La documentación presenta `scheme: bearer` como un atajo de `header: Authorization` y `format: "Bearer %s"`. `sbx` 0.38.0 no lo convierte: el proxy no inyecta nada, elimina la centinela de la petición y el gateway responde `401 Missing API key`. El síntoma se puede ver en `~/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/daemon.log`:

```
WARN "skipping empty service auth config" service=opencode-go
WARN "proxy: no header mapping for service" service=opencode-go
```

En `opencode-go`, los modelos servidos por una API `anthropic-messages` (`minimax-m3`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max`) esperan la clave en un encabezado `x-api-key` y no en `Authorization`. La segunda entrada `inject`, comentada en el `spec.yaml`, sirve para este caso. `sbx kit validate` acepta dos entradas para el mismo dominio, pero el comportamiento del proxy cuando ambas se aplican a una misma petición no está documentado y queda por confirmar en una llamada real. La alternativa independiente del encabezado es un secreto personalizado, `sbx secret set-custom --host opencode.ai --env OPENCODE_API_KEY`, que sustituye la centinela dondequiera que aparezca en la petición, a costa de un mecanismo que Docker documenta como experimental.
:::

::: info ¿Y con ILaaS?
El kit suministrado está orientado a `opencode-go`, porque es el proveedor sobre el cual ha sido verificado. Para un proveedor configurado manualmente como [ILaaS](https://www.ilaas.fr/), el procedimiento sigue el mismo mecanismo: un `files/home/.pi/agent/models.json` donde el campo `apiKey` es `"$ILAAS_API_KEY"`, una entrada `credentials` para esta variable con `llm.ilaas.fr` como dominio de inyección, y dicho dominio en la lista de autorizaciones. Todavía no hemos probado esta variante con una llamada real.

Una clave escrita en texto plano en `models.json` entraría en la VM con el archivo y anularía la ventaja del proxy.
:::

## Generalizar

**Un límite que no depende de la obediencia.** Un permiso escrito en texto, en un `AGENTS.md` o un `SKILL.md`, es una sugerencia que el modelo sigue o no. El módulo sobre permisos construirá barreras de seguridad en código dentro del harness, que rechazan una llamada a una herramienta antes de que se ejecute. El sandbox es la capa exterior, la que resiste cuando el propio harness falla, porque una extensión maliciosa o un archivo trampa solo alcanzan lo que contiene la VM.

**El secreto permanece donde sale la petición.** El agente nunca ha necesitado la clave; necesita que sus peticiones hacia un dominio específico estén autenticadas. Separar ambos, manteniendo la clave en el host y colocándola en el encabezado en el momento en que pasa la petición, retira la clave de todo lo que el agente puede leer, ejecutar o enviar. El principio se aplica a cualquier harness, independientemente de la herramienta que lo implemente.

**Rechazar por defecto, y luego abrir desde el registro.** La lista de autorizaciones de un kit no se escribe a priori: se parte del rechazo y se añade lo que `sbx policy log` solicite, al igual que el resto del acto parte de una medición antes de decidir.

**La unidad reproducible es una imagen anclada.** El kit congela Node y Pi en una imagen, al igual que la herramienta de medición del siguiente módulo congela NÉON en un tag; el módulo siguiente mostrará que un tag puede desplazarse, algo que solo un digest o un commit impide.

## Entregable

Al final de este módulo, Pi se ejecuta en un sandbox sobre tu clon de NÉON, y ahí es donde se realizarán todas las manipulaciones de los siguientes módulos.

El criterio de éxito consiste en cuatro verificaciones:

- la variable `OPENCODE_API_KEY` leída desde el sandbox es la centinela;
- una petición hacia un dominio ausente de la lista falla;
- una edición realizada por Pi aparece en el repositorio del lado del host;
- `sbx policy log` no muestra ningún rechazo que tu lista no haya seleccionado.

## Las trampas

**Creer que el sandbox protege el repositorio.** En modo directo, el agente escribe en tu árbol de trabajo, incluidos los hooks y el `Makefile`. Revisa el diff o usa `--clone` para trabajar en una copia privada.

**Copiar una clave en `models.json`.** Entra en la VM con el archivo. Toda clave debe pasar por `sbx secret` y una variable de sustitución.

**Escribe `scheme: bearer`.** No se inyecta nada y el proveedor responde `401`. Escribe `header` y `format`.

**No confundas `balanced` con una política restrictiva.** Sus comodines abren mucho más que las API de modelos. Parte de `deny-all`.

**No olvides el binding en modo no interactivo.** El sandbox arranca sin la clave con una simple advertencia, y el error solo aparece en la primera llamada al modelo.

## Para ir más lejos

- La página [Security](https://pi.dev/docs/latest/security) de la documentación de Pi, sobre la confianza otorgada a los archivos del proyecto y la ausencia de un sandbox integrado, y la página [Containerization](https://pi.dev/docs/latest/containerization), que presenta dos alternativas a Docker Sandboxes, Gondolin y OpenShell.
- La documentación de Docker Sandboxes: [architecture](https://docs.docker.com/ai/sandboxes/architecture/), [modelo de seguridad](https://docs.docker.com/ai/sandboxes/security/) y [kits](https://docs.docker.com/ai/sandboxes/customize/kits/).
