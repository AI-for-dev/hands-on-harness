# Le bac à sable : isoler l'agent de votre machine

::: tip Objectifs de ce module
- Savoir ce qu'un agent de code peut faire sur votre machine
- Comparer le clone jetable, le conteneur et la micro-machine virtuelle : ce que chacun protège, et ce qu'il coûte
- Lancer Pi dans une Docker Sandboxes avec un kit versionné dans ce dépôt
- Repartir avec un bac à sable dans lequel les manipulations des modules suivants tournent sans surveillance
:::

Les modules qui suivent lancent Pi vingt fois sur la même tâche sans intervention humaine, lui confient des sous-agents qui ont un shell, puis enchaînent des sous-agents dans des pipelines. Pi n'a aucun mécanisme pour demander votre accord avant d'exécuter une commande, et sa [documentation sur la sécurité](https://pi.dev/docs/latest/security) le dit clairement : les outils lisent, écrivent et lancent des commandes « with the permissions of the pi process », et « Pi does not include a built-in sandbox ». Tout ce que vous pouvez faire depuis votre terminal, l'agent peut donc le faire aussi, lire `~/.ssh`, lire `~/.pi/agent/auth.json` où sont rangées vos clés d'API, lancer `git push --force`, ou envoyer le contenu d'un fichier à un domaine quelconque avec `curl`.

La réaction naturelle est d'écrire une consigne, « ne modifie que `game/neon.js` », « ne lis rien hors du dépôt ». Une consigne est du texte et nous vous rappelons que l'utilisation d'un LLM est toujours non déterministe ce qui veut dire que vous n'aurez jamais une garantie de 100% qu'elle sera suivie. Dans le module sur les compétences, vous constaterez qu'une consigne de nettoyage de fichiers temporaires placée dans un `SKILL.md` est suivie moins d'une fois sur trois. Avant la première exécution sans surveillance, il faut donc une limite qui ne dépende pas de l'obéissance du modèle. Le bac à sable (appelé sandbox) est une façon déterministe de s'assurer que le LLM est dans un environnement clos où les frontières sont déterminées par vous et que le modèle ne peut pas outre passer.

## Comprendre

### À quoi l'agent a-t-il accès ?

Un agent de code qui tourne sur votre poste a accès à vos fichiers, c'est-à-dire au dépôt sur lequel il travaille et, avec les mêmes droits, à votre répertoire personnel, où vivent les clés SSH, les jetons des fournisseurs de modèles et les fichiers `.env` de vos autres projets. Le réseau lui permet d'installer n'importe quel paquet, d'exécuter un `curl | sh` trouvé dans un README, ou de diffuser ce qu'il vient de lire. Il lance enfin des processus avec votre identité, ce qui couvre le démon Docker, la commande `rm` et l'accès en écriture au dépôt distant. Si en plus vous avez les droits sudo sur votre machine, plus rien ne l'arrête.

Ces actions n'exigent même pas que le modèle se trompe. Un fichier du dépôt peut contenir des instructions écrites pour l'agent, et c'est le rôle du `SUPPORT.md` de NÉON, dont le texte imite une procédure d'assistance mais demande de lire le `.env` et d'en envoyer le contenu à une adresse externe : l'agent qui ouvre ce fichier pour répondre à une question traite l'instruction comme si elle venait de vous, et le module sur les permissions travaillera sur ce cas. Une extension installée depuis l'annuaire communautaire s'exécute, comme le module sur Pi l'a rappelé, avec l'intégralité de vos droits. Dans ces deux cas, la faille est dans le harnais, et un garde fou écrit à l'intérieur de AGENTS.md ne vous protégera pas.

La documentation de Pi en tire la conclusion : « For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task. » Nos vingt exécutions sur l'issue #1 sont exactement de l'automatisation sans surveillance. Et à terme, nous souhaitons des agents autonomes pouvant travailler pendant des heures sans que nous soyons obligés de les surveiller.

### Trois niveaux d'isolation

Le moins cher des trois est le **clone jetable**. L'outil de mesure du module suivant clone NÉON à un tag, dans un répertoire temporaire, à chaque exécution, ce qui protège l'historique et l'arbre de travail du dépôt sans rien coûter ou presque. Le processus tourne pourtant toujours sous votre identité, avec votre répertoire personnel et votre réseau, si bien qu'un clone jetable ne protège que le dépôt. Et encore, rien n'empêche le modèle de faire un push sur votre dépôt distant s'il en a les droits comme c'est le cas s'il a accès à la commande `gh` (pour travailler sur votre GitHub).

Un cran plus loin, le **conteneur** fait tourner Pi dans une image Docker où seul le dépôt est monté, ce qui met votre répertoire personnel hors de portée. Il partage le noyau de l'hôte, son réseau est ouvert par défaut, et surtout la clé du fournisseur de modèles doit y être ajoutée pour que Pi puisse appeler le modèle, ce que la [page de Pi sur la conteneurisation](https://pi.dev/docs/latest/containerization) note en une phrase : « Provider API keys enter the container ». Tout ce que l'agent exécute a donc accès à cette clé.

Le troisième niveau est la **micro-machine virtuelle à politique** avec [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Chaque sandbox a son propre noyau derrière un hyperviseur, tout le trafic TCP sortant passe par un proxy sur l'hôte qui n'accepte que les domaines d'une liste d'autorisations, et les clés d'API sont injectées dans les en-têtes HTTP par ce proxy, si bien que, pour citer la [page sur la sécurité](https://docs.docker.com/ai/sandboxes/security/), « Credential values never enter the VM ». Le répertoire de travail est monté dans la VM au même chemin absolu que sur l'hôte. Le coût est une image de sept cents mégaoctets à construire, un démon à faire tourner, une liste de domaines autorisés à entretenir. Cela peut sembler compliqué, mais votre IA préférée pourra vous assister pour mettre en place facilement cette infrastructure.

| ce qui est protégé          | clone jetable | conteneur                       | Docker Sandboxes                               |
| --------------------------- | ------------- | ------------------------------- | ---------------------------------------------- |
| l'arbre de travail du dépôt | oui           | non                             | non par défaut, oui avec `--clone`             |
| votre répertoire personnel  | non           | oui, si seul le dépôt est monté | oui                                            |
| le réseau sortant           | non           | non par défaut                  | oui, refus par défaut et liste d'autorisations |
| vos clés d'API              | non           | non, elles entrent dans l'image | oui, seul le proxy de l'hôte les voit          |

Ces trois niveaux isolent le processus de Pi de la machine hôte, mais rien à l'intérieur du sandbox n'empêche encore Pi de lancer `rm -rf` sur le dépôt ou de lire un `.env` qui traîne dans NÉON. L'extension [`pi-permission-system`](https://pi.dev/packages/@gotgenes/pi-permission-system) ajoute ce filtre à l'intérieur même du sandbox : elle s'accroche à l'événement `tool_call` de l'API d'extension de Pi, un hook qui intercepte chaque appel d'outil, chaque commande bash, chaque appel MCP et chaque skill invoqué avant son exécution, et compare la demande à des règles `allow` / `deny` / `ask` écrites en JSON.

Le compromis tient à l'endroit où ce filtre tourne. Il vit dans le même processus Node que Pi, et non dans le noyau qui isole le sandbox, si bien qu'une extension qui compromettrait ce processus avant que la règle s'évalue désactiverait la garde avec le reste. `pi-permission-system` resserre ce que Pi peut faire une fois lancé dans le sandbox, il ne remplace aucun des trois niveaux du tableau ci-dessus.

### Ce que le bac à sable ne protège pas

En mode direct, celui par défaut, l'agent édite votre arbre de travail en place, et la documentation de Docker Sandboxes rappelle qu'il peut donc modifier un hook git, un `Makefile` ou une configuration d'intégration continue, qui s'exécuteront plus tard sur l'hôte quand vous les lancerez vous-même. Le bac à sable protège la machine pendant que l'agent travaille, et il ne vous dispense pas de relire le diff.

La politique réseau `balanced`, celle que `sbx policy init` recommande, autorise des domaines par jokers larges comme `*.googleapis.com`, qui couvrent bien plus que des API de modèles. Nous partons de `deny-all` et n'ouvrons ensuite que les domaines qui apparaissent dans le journal des refus.

À l'intérieur de la VM, enfin, l'agent est administrateur, avec `sudo` sans mot de passe et un démon Docker à lui, ce que nous acceptons, puisque rien de ce qui s'y passe n'en sort et que la VM elle-même est jetable.

## Reconstruire

Nous vous proposons deux approches dans la suite : l'utilisation d'une extension dans Pi qui ajoute un hook (que nous vous proposerons de reconstruire dans un autre module) et l'utilisation de Docker Sandboxes. La première solution ne demande pas d'installation particulière sur votre système et elle sera donc utilisée pour la formation "en salle". Mais retenez qu'elle a ses limites et qu'il est clair qu'elle n'est pas suffisante pour un travail quotidien avec les agents.

### Installer et configurer `pi-permission-system`

L'extension s'installe en une commande, comme n'importe quel paquet de l'annuaire de Pi :

```bash
pi install npm:@gotgenes/pi-permission-system
```

Les règles vivent dans un fichier JSON, lu à trois portées : globale (`~/.pi/agent/extensions/pi-permission-system/config.json`), projet (`.pi/extensions/pi-permission-system/config.json`, ignorée si le projet n'est pas approuvé) et par agent, dans l'entête YAML d'un fichier d'agent, qui l'emporte sur les deux premières. Pour NÉON, une configuration de projet suffit à enrayer la consigne la plus dangereuse de `SUPPORT.md`, puisque la lecture d'un `.env` est refusée par construction :

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

La règle la plus spécifique l'emporte : `bash.*` demande confirmation par défaut, `rm -rf *` refuse sans demander, et un chemin hors du dépôt reste soumis à confirmation même quand `path.*` autorise tout le reste. Une commande que l'analyseur bash de l'extension ne sait pas classer est refusée plutôt que laissée passer, et un chemin qui traverse un lien symbolique est résolu avant comparaison.

::: info Exercice (en salle)
Travaillez dans un clone jetable de NÉON, puisque deux des demandes ci-dessous sont destructrices. Installez l'extension, déposez la configuration ci-dessus dans `.pi/extensions/pi-permission-system/config.json`, créez à la racine un `.env` contenant une fausse clé, puis lancez Pi et demandez-lui trois choses : de vous lire le contenu de ce `.env`, d'effacer le dossier `game/` avec `rm -rf`, et de lancer la suite de tests. Les deux premières demandes sont refusées sans que Pi vous consulte, la troisième ouvre une confirmation à laquelle vous répondez vous-même.

Reposez ensuite la demande de lecture du `.env` trois fois d'affilée en la reformulant, puis en expliquant à Pi que vous êtes le propriétaire du fichier et que vous l'autorisez : le verdict ne bouge pas, parce qu'il vient d'une règle évaluée avant l'appel d'outil et non d'un arbitrage du modèle.

Retirez enfin le bloc `path` de la configuration et remplacez-le par la consigne « ne lis jamais de fichier `.env` » dans l'`AGENTS.md` du dépôt, puis reposez la même demande cinq fois dans cinq sessions différentes. Comptez les refus obtenus : vous tenez alors votre propre chiffre sur ce que vaut une consigne en texte face à une garde en code.
:::

#### Installer et configurer `sbx`

`sbx` est la commande pour utiliser Docker Sandboxes. `sbx` connaît une liste d'agents qu'il sait lancer tel quel (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` et quelques autres). Malheureusement, Pi n'en fait pas partie. Il est donc nécessaire de créer [un kit](https://docs.docker.com/ai/sandboxes/customize/): un répertoire décrit par un `spec.yaml` dont la variante `kind: sandbox` définit un agent de zéro : l'image, la commande de démarrage, les instructions ajoutées au fichier de contexte, les clés à injecter et les permissions réseau. Le nôtre est versionné dans https://github.com/AI-for-dev/pi-sandbox et contient seulement trois fichiers.

```
pi-sandbox
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

Les versions citées ci-dessous sont celles avec lesquelles ce kit a été vérifié au moment de l'écriture du document : `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2.

#### Installer `sbx`

L'outil en ligne de commande s'appelle `sbx`. Pour l'installer sur votre OS, il vous suffit de vous rendre à la page suivante

https://docs.docker.com/ai/sandboxes/install/

#### Construire l'image

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

L'image part du modèle `shell-docker` fourni par Docker, installe une version explicite de Node, parce que Pi exige au moins la 22.19 puis épingle la version de Pi.

Le démon de Docker Sandboxes tire ses images depuis un registre différent des images locales disponibles pour Docker. Sans registre, on passe par une archive :

```bash
git clone https://github.com/AI-for-dev/pi-sandbox
cd pi-sandbox
docker build --platform linux/arm64 -t pi-sandbox:0.85.2 .
docker image save pi-sandbox:0.85.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

Pour une équipe, on préférera pousser l'image sur un registre.

#### Déclarer le kit

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

Le bloc `sandbox` nomme l'image créée à l'étape précédente et lance `pi -a`. L'option `-a` déclare les fichiers du projet comme sûrs pour cette exécution, ce qui répond à la question que `trust.json` posait au module sur Pi : à l'intérieur de la VM, un skill ou une extension trouvés dans le dépôt ne peuvent toucher que ce que la VM contient.

`agentInstructions` ajoute quelques lignes à l'`AGENTS.md` que le modèle lit : un domaine refusé n'est pas une panne réseau, ce qui lui évite de réessayer dix fois, et la clé du fournisseur n'est pas dans la VM.

Le bloc `credentials` déclare une clé gérée par le proxy (`proxyManaged: true`). Pi trouve dans `ILAAS_API_KEY` une **sentinelle**, une valeur factice, et le proxy de l'hôte la remplace par la vraie clé dans l'en-tête `Authorization` des requêtes vers `llm.ilaas.fr`, et nulle part ailleurs.

Sous `permissions.network`, le kit ouvre par-dessus la politique globale le fournisseur de modèles, GitHub pour cloner NÉON et PyPI pour les outils de mesure. Les variables `PI_SKIP_VERSION_CHECK` et `PI_TELEMETRY` coupent certaines opérations réseau de démarrage de Pi.

Le fichier `files/home/.pi/agent/settings.json`, que le kit dépose dans le répertoire personnel de l'agent, fixe le fournisseur et le modèle par défaut, le niveau de raisonnement. Il remplace le `~/.pi/agent/settings.json` de votre hôte, qui n'est pas monté dans la VM. Il est ici assez simple et ressemble à ça

```json
{
  "defaultProvider": "ilaas",
  "defaultModel": "deepseek-v4-flash",
  "defaultThinkingLevel": "high"
}
```

De même, le fichier Le fichier `files/home/.pi/agent/models.json` renseigne les modèles disponibles dans la sandbox.

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

#### Enregistrer la clé

`ilaas` s'authentifie par clé d'API. On la confie à `sbx` sous le nom du service déclaré par le kit :

```bash
sbx secret set ilaas
```

Vous devez alors renseigner votre clé. Vous pouvez ensuite vérifier qu'elle est bien enregistrée via la commande

```bash
sbx secret ls
```

Au premier lancement, `sbx` demande d'approuver le **credential binding**, l'autorisation donnée à un kit tiers d'utiliser ce secret sur les domaines qu'il déclare. La réponse est enregistrée dans `~/.config/sbx/credentials.yaml`.

::: warning En non-interactif, personne ne répond
Avec `sbx create` ou depuis un script, la question du binding n'est posée à personne. Le sandbox démarre quand même, `sbx` n'émettant qu'un avertissement, et la variable d'environnement contient la sentinelle `proxy-managed` : la clé réelle n'est jamais injectée par le proxy. L'erreur n'apparaît donc qu'à l'usage, sous forme de `401`, et `pi auth check` annonce malgré tout `ready`. Un binding par service déclaré est nécessaire. Écrivez le fichier avant :

```yaml
bindings:
  ilaas:
    apiKey:
      domains: [llm.ilaas.fr]
```
:::

#### Poser la politique réseau

Ce réglage est global, `sbx` l'exige avant le premier sandbox, et il se fait une fois pour toutes :

```bash
sbx policy init deny-all
```

Les règles `permissions.network.allow` du kit s'appliquent par-dessus, pour ses sandboxes seulement.

#### Lancer

```bash
cd pi-sandbox
sbx kit validate .
cd /chemin/vers/neon
sbx run /chemin/vers/pi-sandbox
```

::: info Exercice (en autonomie)
Déroulez chez vous les cinq étapes précédentes, de l'installation de `sbx` au premier `sbx run`. Dans la session Pi qui s'ouvre, demandez la valeur de la variable `ILAAS_API_KEY` : vous verrez la sentinelle, et non votre clé. Lancez ensuite un `curl https://example.com` : la requête échoue, parce que le domaine n'est dans aucune liste. Faites enfin modifier un fichier de NÉON : le changement apparaît côté hôte dès que Pi a écrit.

Revenez sur l'hôte et lisez `sbx policy log`, où chaque refus est consigné avec le domaine demandé. Reprenez pour finir l'exercice sur `pi-permission-system`, cette fois à l'intérieur du sandbox : les deux gardes se superposent sans se gêner, et le refus du `rm -rf` garde toute son utilité, puisqu'en mode direct le dépôt que Pi effacerait est celui de votre hôte.
:::

#### Resserrer la liste d'autorisations

::: info Exercice (en autonomie)
Travaillez une séance entière dans le sandbox, puis relisez `sbx policy log`. Ajoutez à `permissions.network.allow` les seuls domaines dont le refus vous a réellement bloqué, en relançant `sbx kit validate` après chaque modification.
:::

## Généraliser

**Une frontière d'utilisation qui ne dépend pas de l'obéissance.** Une permission écrite en texte, dans un `AGENTS.md` ou un `SKILL.md`, est une suggestion que le modèle suit ou non. Le module sur les permissions construira des gardes en code à l'intérieur du harnais, qui refusent un appel d'outil avant qu'il s'exécute. Le bac à sable est la couche extérieure, celle qui tient quand le harnais lui-même est en faute, parce qu'une extension malveillante ou un fichier piégé ne peuvent endommager que la VM.

**La clé reste sur l'hôte.** L'agent n'a pas besoin de lire la clé, seulement que ses requêtes vers un domaine précis soient authentifiées, et garder la clé sur l'hôte pour la poser dans l'en-tête au moment où la requête passe la retire de tout ce que l'agent peut lire, exécuter ou envoyer. Le principe vaut pour tout harnais, quel que soit l'outil qui l'implémente.

**Refuser par défaut, puis ouvrir depuis le journal.** La liste d'autorisations d'un kit ne s'écrit pas d'avance : on part du refus, on travaille une séance, et on n'ajoute que les domaines dont le refus a réellement bloqué quelque chose, comme le reste de l'acte tranche sur une mesure plutôt que sur une intuition.

## Livrable

À la fin de ce module, Pi tourne dans un sandbox sur votre clone de NÉON, et toutes les manipulations des modules suivants pourront s'y faire avec un contrôle optimal.

Quatre vérifications le confirment :

- la variable `ILAAS_API_KEY` lue depuis le sandbox est la sentinelle ;
- une requête vers un domaine absent de la liste échoue ;
- une édition faite par Pi apparaît dans le dépôt côté hôte ;
- `sbx policy log` ne montre aucun refus que votre liste n'ait pas choisi.

## Les pièges

**Croire que le sandbox protège le dépôt.** En mode direct l'agent écrit dans votre arbre de travail, hooks et `Makefile` compris. Relisez le diff, ou passez `--clone` pour travailler sur une copie privée.

**Copier une clé dans `models.json`.** Elle entre dans la VM avec le fichier. Toute clé passe par `sbx secret` et une variable de substitution.

## Pour aller plus loin

### Le modèle de menace

- Kai Greshake, [How We Broke LLMs: Indirect Prompt Injection][greshake-blog] - le billet qui accompagne l'article fondateur de Greshake et al., [Not what you've signed up for][greshake] : une donnée lue par le modèle devient une instruction, et Copilot se laisse déjà compromettre par la documentation d'un paquet.
- Simon Willison, [The lethal trifecta for AI agents][trifecta] - accès à des données privées, exposition à du contenu non fiable et capacité à communiquer vers l'extérieur : les trois réunis suffisent à l'exfiltration.
- Simon Willison, [Agents Rule of Two and The Attacker Moves Second][sw-rule-of-two] - la règle « au plus deux propriétés sur trois » formulée par Meta, et un article qui fait tomber douze défenses publiées contre l'injection de prompt sous attaque adaptative.
- Beurer-Kellner et al., [Design Patterns for Securing LLM Agents against Prompt Injections][design-patterns] - des patrons d'architecture qui contraignent ce que l'agent peut faire, au prix d'une partie de son utilité.
- Korny Sietsma, [Agentic AI and Security][fowler-security] - la trifecta appliquée aux agents de code sur martinfowler.com : conteneurs, moindre privilège, découpage des tâches.
- OWASP, [Top 10 for Agentic Applications 2026][owasp-agentic] - dix familles de risques, dont la compromission de la chaîne d'approvisionnement et l'exécution de code imprévue.
- Marchand et al., [Quantifying Frontier LLM Capabilities for Container Sandbox Escape][sandbox-escape] - un banc d'essai (2026) où des agents trouvent et exploitent les failles d'un conteneur vulnérable pour en sortir, soit l'argument mesuré en faveur d'un noyau séparé.

### Des incidents documentés

- Johann Rehberger, [The Month of AI Bugs][month-ai-bugs] - une faille par jour en août 2025 dans les agents de code (Claude Code, Codex, Cursor, Copilot, Devin, Jules, OpenHands), dont Simon Willison fait [la synthèse][summer-johann].
- Johann Rehberger, [Amazon Q Developer: Remote Code Execution with Prompt Injection][etr-amazon-q] - un `find -exec` classé en lecture seule suffit à exécuter du code sans approbation.
- Will Vandevanter (Trail of Bits), [Prompt injection to RCE in AI agents][tob-rce] - l'injection d'arguments dans des commandes pré-approuvées, et le sandbox recommandé comme défense principale à la place des listes de commandes sûres.
- Kevin Higgs (Trail of Bits), [Prompt injection engineering for attackers: Exploiting GitHub Copilot][tob-copilot] - une issue GitHub piégée fait ajouter une dépendance porte dérobée par Copilot Agent.
- Pillar Security, [Rules File Backdoor][rules-file] - des instructions cachées dans un fichier de règles de Cursor ou de Copilot (mars 2025), soit le piège du `SUPPORT.md` observé en conditions réelles.
- Nx, [S1ngularity postmortem][nx-postmortem] et Wiz, [analyse de l'attaque][wiz-nx] - un paquet npm compromis (août 2025) enrôle les agents de code installés sur le poste, lancés sans confirmation, pour repérer les secrets à exfiltrer.
- Fortune, [Replit AI wiped a production database][replit] - un agent efface une base de production pendant un gel des changements (juillet 2025), alors qu'une consigne écrite l'interdisait.
- Pillar Security, [The Agent Security Paradox][cursor-paradox] - CVE-2026-22708 (janvier 2026) : des commandes internes du shell comme `export`, hors de la liste d'autorisations de Cursor, empoisonnent l'environnement des commandes approuvées.
- Unit 42, [OpenClaw's Skill Marketplace and the Emerging AI Supply Chain Threat][openclaw] - des skills en markdown malveillants sur la place de marché d'un agent (2026), le même risque que pour un paquet installé avec `pi install`.
- Ken Huang, [Coding Agent Security: Lessons from Claude Code, Cowork, Codex, and Copilot in the Wild][ken-huang] - huit incidents de 2025 et 2026, et une comparaison des sandboxes de Claude Code, Codex, Copilot et Cursor (août 2026).
- Simon Willison, [Breaking Claude Code Opus 5 Auto Mode][sw-auto-mode] - une attaque de Johann Rehberger réussie quatre fois sur cinq contre le mode automatique de Claude Code (août 2026), et la conclusion qu'un classifieur ne remplace pas le sandbox.

### Les pratiques et les mécanismes d'isolation

- Mario Zechner, [What I learned building an opinionated and minimal coding agent][zechner-pi] - l'auteur de Pi explique pourquoi Pi n'a pas de permissions (« As soon as your agent can write code and run code, it's pretty much game over ») et recommande de le faire tourner dans un conteneur.
- Armin Ronacher, [Agentic Coding Recommendations][ronacher] - l'alias `claude-yolo` assumé, et le risque déplacé dans Docker.
- Simon Willison, [Designing agentic loops][sw-loops] - le mode YOLO à la fois indispensable à la productivité et dangereux, d'où le sandbox, de préférence sur l'ordinateur de quelqu'un d'autre.
- Simon Willison, [Codex CLI sandbox investigation][codex-sandbox] - Seatbelt sur macOS, Landlock et seccomp sur Linux, ou comment un autre harnais fait le même choix.
- sysid, [Your Agent Has Root][sysid] - les outils intégrés qui échappent au sandbox noyau, et une extension Pi pour combler l'écart.
- Andrew Lock, [Running AI agents safely in a microVM using docker sandbox][lock] - le parcours complet de `sbx` sur un poste de développeur, politiques réseau comprises.
- Michael Krämer, [Trust but Sandbox][innoq] - Docker Sandboxes vu d'une équipe : politiques, proxy de secrets, images personnalisées.
- Palaimon, [Coding Agents III: Sandboxing & Best Practices][palaimon] - dev containers, bubblewrap et VM comparés, avec le coût de démarrage chiffré.
- Ry Walker, [Local AI Agent Sandboxes][rywalker] - huit outils de sandbox local comparés, et ce qui reste à un outil tiers quand les harnais intègrent le leur.
- Daniel Vaughan, [Agent Sandbox Comparison Matrix][vaughan] - Seatbelt de Codex, OpenShell et Docker `sbx` : frontière d'isolation, réseau, secrets.
- Agache et al., [Firecracker][firecracker] - la micro-VM d'AWS Lambda (NSDI 2020), le texte de référence sur le compromis entre isolation et temps de démarrage.
- Emir Beganović, [Your Container Is Not a Sandbox: The State of MicroVM Isolation in 2026][emirb] - pourquoi un conteneur n'est pas une frontière de sécurité, l'épisode où Claude Code désactive son propre bubblewrap, et un tour des micro-VM disponibles (mars 2026).
- Greg Hurrell, [List of coding agent sandboxes][wincent] - un catalogue tenu à jour en 2026, des primitives système aux plateformes hébergées, en dix catégories.
- Zheng et al., [ActPlane: Programmable OS-Level Policy Enforcement for Agent Harnesses][actplane] - une politique de harnais appliquée dans le noyau Linux par eBPF (juin 2026), avec un surcoût mesuré entre 2 et 8 %.

### Outils

- Docker Sandboxes : [architecture][docker-arch], [modèle de sécurité][docker-security] et [kits][docker-kits].
- Pi : [Security][pi-security] et [Containerization][pi-container].
- [pi-sandbox][pi-sandbox-repo] - un sandbox système par commande pour Pi, avec invite d'autorisation, sur `sandbox-exec` ou bubblewrap.
- [pi-gondolin][pi-gondolin] et [Gondolin][gondolin] - les outils de Pi exécutés dans une micro-VM locale ; les deux projets se déclarent expérimentaux.
- [OpenShell][openshell] - un runtime à politiques déclaratives (système de fichiers, réseau, processus, inférence), cité par la documentation de Pi.

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
