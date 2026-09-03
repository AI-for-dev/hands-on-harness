# Le bac à sable : où l'agent a le droit d'agir

::: tip Objectifs de ce module
- Savoir ce qu'un agent de code atteint depuis votre machine quand rien ne l'en empêche
- Distinguer trois niveaux d'isolation, du clone jetable à la micro-machine virtuelle, et nommer ce que chacun protège et ce qu'il coûte
- Lancer Pi dans une Docker Sandbox avec un kit versionné dans ce dépôt
- Repartir avec un bac à sable dans lequel les manipulations des modules suivants tournent sans surveillance
:::

Les modules qui suivent lancent Pi vingt fois sur la même tâche sans que personne ne regarde, lui confient des sous-agents qui ont un shell, puis enchaînent ces sous-agents dans des pipelines. Pi n'a aucun mécanisme pour demander votre accord avant d'exécuter une commande, et sa [documentation sur la sécurité](https://pi.dev/docs/latest/security) le dit sans détour : les outils lisent, écrivent et lancent des commandes « with the permissions of the pi process », et « Pi does not include a built-in sandbox ». Tout ce que vous pouvez faire depuis votre terminal, l'agent peut donc le faire aussi, lire `~/.ssh`, lire `~/.pi/agent/auth.json` où sont rangées vos clés d'API, lancer `git push --force`, ou envoyer le contenu d'un fichier à un domaine quelconque avec `curl`.

La réaction naturelle consiste à écrire une consigne, « ne modifie que `game/neon.js` », « ne lis rien hors du dépôt ». Une consigne est du texte, et le module sur les compétences mesurera qu'une consigne de ménage placée dans un `SKILL.md` est suivie moins d'une fois sur trois. Avant la première exécution sans surveillance, il faut donc une limite qui ne dépende pas de l'obéissance du modèle, et c'est cette limite que nous construisons maintenant, pour que tout le reste de l'acte tourne à l'intérieur.

## Comprendre

### Que peut atteindre l'agent ?

Un agent de code qui tourne sur votre poste dispose de vos **fichiers**, c'est-à-dire du dépôt sur lequel il travaille et, avec les mêmes droits, de votre répertoire personnel, où vivent les clés SSH, les jetons des fournisseurs de modèles et les fichiers `.env` de vos autres projets. Le **réseau** lui permet d'installer n'importe quel paquet, d'exécuter un `curl | sh` trouvé dans un README, ou de faire sortir ce qu'il vient de lire. Il lance enfin des **processus** avec votre identité, ce qui couvre le démon Docker, la commande `rm` et l'accès en écriture au dépôt distant.

Ces actions n'exigent même pas que le modèle se trompe. Un fichier du dépôt peut contenir des instructions écrites pour l'agent, et le module sur les permissions posera précisément ce piège dans un `SUPPORT.md` de NÉON. Une extension installée depuis l'annuaire communautaire s'exécute, comme le module sur Pi l'a rappelé, avec l'intégralité de vos droits. Dans ces deux cas, le harnais lui-même est la faille, et une garde écrite à l'intérieur du harnais n'y changerait rien.

La documentation de Pi tire la conséquence de cette situation : « For untrusted repositories, generated code you do not intend to monitor closely, or unattended automation, run pi in a contained environment. Use a container, VM, micro-VM, remote sandbox, or policy-controlled sandbox with only the files and credentials required for the task. » Nos vingt exécutions sur l'issue #1 sont exactement de l'automatisation sans surveillance.

### Trois niveaux d'isolation

Le premier niveau est le **clone jetable**. L'outil de mesure du module suivant clone NÉON à un tag, dans un répertoire temporaire, à chaque exécution, ce qui protège l'historique et l'arbre de travail du dépôt et ne coûte presque rien. Le processus tourne pourtant toujours sous votre identité, avec votre répertoire personnel et votre réseau, et un clone jetable ne protège donc que le dépôt.

Le deuxième niveau est le **conteneur**. Pi tourne dans une image Docker où seul le dépôt est monté, ce qui met votre répertoire personnel hors de portée. Le conteneur partage le noyau de l'hôte, son réseau est ouvert par défaut, et surtout la clé du fournisseur de modèles doit entrer dans le conteneur pour que Pi puisse appeler le modèle, ce que la [page de Pi sur la conteneurisation](https://pi.dev/docs/latest/containerization) note en une phrase : « Provider API keys enter the container ». Tout ce que l'agent exécute a donc accès à cette clé.

Le troisième niveau est la **micro-machine virtuelle à politique**, et c'est celui que nous retenons avec [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/). Chaque sandbox a son propre noyau derrière un hyperviseur, tout le trafic TCP sortant passe par un proxy sur l'hôte qui n'accepte que les domaines d'une liste d'autorisations, et les clés d'API sont injectées dans les en-têtes HTTP par ce proxy, si bien que, pour citer la [page sur la sécurité](https://docs.docker.com/ai/sandboxes/security/), « Credential values never enter the VM ». Le répertoire de travail est monté dans la VM au même chemin absolu que sur l'hôte. Le coût est une image de sept cents mégaoctets à construire, un démon à faire tourner, une liste de domaines autorisés à entretenir, et l'impossibilité de joindre un fournisseur local comme LM Studio sur `127.0.0.1`, puisque la VM a sa propre pile réseau.

| ce qui est protégé          | clone jetable | conteneur                        | Docker Sandbox                                 |
| --------------------------- | ------------- | -------------------------------- | ---------------------------------------------- |
| l'arbre de travail du dépôt | oui           | non                              | non par défaut, oui avec `--clone`             |
| votre répertoire personnel  | non           | oui, si seul le dépôt est monté  | oui                                            |
| le réseau sortant           | non           | non par défaut                   | oui, refus par défaut et liste d'autorisations |
| vos clés d'API              | non           | non, elles entrent dans l'image  | oui, seul le proxy de l'hôte les voit          |

### Ce que le bac à sable ne protège pas

En mode direct, celui par défaut, l'agent édite votre arbre de travail en place, et la documentation de Docker Sandboxes rappelle qu'il peut donc modifier un hook git, un `Makefile` ou une configuration d'intégration continue, qui s'exécuteront plus tard sur l'hôte quand vous les lancerez vous-même. Le bac à sable protège la machine pendant l'exécution, et la relecture du diff reste à votre charge après. C'est pour cette raison que l'outil de mesure du module suivant garde son clone jetable, à l'intérieur du sandbox.

La politique réseau `balanced`, celle que `sbx policy init` recommande, autorise des domaines par jokers larges comme `*.googleapis.com`, qui couvrent bien plus que des API de modèles. Nous partons de `deny-all` et n'ouvrons que ce que le journal des refus réclame.

À l'intérieur de la VM, enfin, l'agent est administrateur, avec `sudo` sans mot de passe et un démon Docker à lui, ce que nous acceptons puisque la limite est la VM et que tout ce qui se passe à l'intérieur est jetable.

## Reconstruire

### Pourquoi un kit

`sbx` connaît une liste d'agents qu'il sait lancer tel quel (`claude`, `codex`, `copilot`, `cursor`, `gemini`, `opencode` et quelques autres) et Pi n'en fait pas partie. Le point d'extension prévu pour ce cas est le **kit**, un répertoire décrit par un `spec.yaml` dont la variante `kind: sandbox` définit un agent de zéro : l'image, la commande de démarrage, les instructions ajoutées au fichier de contexte, les clés à injecter et les permissions réseau. Le nôtre est versionné dans `scripts/pi-kit/` de ce dépôt et tient en trois fichiers.

```
scripts/pi-kit/
├── Dockerfile
├── spec.yaml
└── files/home/.pi/agent/settings.json
```

Les versions citées ci-dessous sont celles avec lesquelles ce kit a été vérifié le 16 août 2026 : `sbx` 0.38.0, Docker Engine 29.7.2, Pi 0.84.2. Le kit est un artefact du deuxième temps de la méthode, et ces numéros bougeront.

### Installer `sbx`

L'outil en ligne de commande s'appelle `sbx`, et les pages qui décrivent encore un plugin `docker sandbox` parlent d'une version retirée :

```bash
brew trust docker/tap
brew install docker/tap/sbx
sbx login
```

### Construire l'image

<<<@/../scripts/pi-kit/Dockerfile{dockerfile}

L'image part du modèle `shell-docker` fourni par Docker, installe une version explicite de Node, parce que Pi exige au moins la 22.19 et que la version embarquée dans l'image de base n'est pas un contrat, puis épingle la version de Pi. C'est l'image qui est l'unité reproductible : un `npm install` relancé à chaque création de sandbox ne garantirait pas deux fois la même version.

Le démon de Docker Sandboxes tire ses images depuis un registre et ne partage pas le magasin local de Docker. Sans registre, on passe par une archive :

```bash
cd scripts/pi-kit
docker build --platform linux/arm64 -t pi-sandbox:0.84.2 .
docker image save pi-sandbox:0.84.2 -o pi-sandbox.tar
sbx template load pi-sandbox.tar
```

Pour une équipe, on pousse l'image sur un registre et on épingle `sandbox.image` par son digest, pour la raison que le module suivant détaillera à propos des tags : un nom peut être déplacé, un digest ne l'est pas.

### Déclarer le kit

<<<@/../scripts/pi-kit/spec.yaml

Le bloc `sandbox` nomme l'image chargée à l'étape précédente et lance `pi -a`. L'option `-a` déclare les fichiers du projet comme sûrs pour cette exécution, ce qui répond à la question que `trust.json` posait au module sur Pi : à l'intérieur de la VM, un skill ou une extension trouvés dans le dépôt ne peuvent atteindre que ce que la VM contient, et la décision de confiance change d'échelle.

Le bloc `agentInstructions` ajoute quelques lignes à l'`AGENTS.md` que le modèle lit. Elles lui disent qu'un domaine refusé n'est pas une panne réseau, ce qui lui évite de réessayer dix fois, et que la clé du fournisseur n'est pas dans la VM.

Le bloc `credentials` déclare une clé gérée par le proxy (`proxyManaged: true`). Pi trouve dans `OPENCODE_API_KEY` une **sentinelle**, une valeur factice, et le proxy de l'hôte la remplace par la vraie clé dans l'en-tête `Authorization` des requêtes vers `opencode.ai`, et nulle part ailleurs. Une seule clé couvre `opencode-go` et opencode Zen, puisque Pi lit la même variable pour les deux.

Le bloc `permissions.network` liste les domaines que le kit ouvre par-dessus la politique globale : le fournisseur de modèles, GitHub pour cloner NÉON, PyPI pour les outils de mesure. Le refus explicite de `pi.dev`, doublé des variables `PI_SKIP_VERSION_CHECK` et `PI_TELEMETRY`, coupe les opérations réseau de démarrage de Pi.

Le fichier `files/home/.pi/agent/settings.json`, que le kit dépose dans le répertoire personnel de l'agent, fixe le fournisseur et le modèle par défaut, le niveau de raisonnement et un démarrage silencieux. Il joue le rôle du `~/.pi/agent/settings.json` de votre hôte, qui n'est pas monté dans la VM.

### Enregistrer la clé

`opencode-go` s'authentifie par clé d'API et Pi la range sur votre hôte dans `~/.pi/agent/auth.json`. On la confie à `sbx` sous le nom du service déclaré par le kit :

```bash
python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.pi/agent/auth.json')))['opencode-go']['key'])" \
  | sbx secret set opencode-go
sbx secret ls
```

Au premier lancement, `sbx` demande d'approuver le **credential binding**, l'autorisation donnée à un kit tiers d'utiliser ce secret sur les domaines qu'il déclare. La réponse est enregistrée dans `~/.config/sbx/credentials.yaml`.

::: warning En non-interactif, personne ne répond
Avec `sbx create` ou depuis un script, la question du binding n'est posée à personne, le sandbox démarre sans la clé et n'émet qu'un avertissement. Écrivez le fichier avant :

```yaml
bindings:
  opencode-go:
    apiKey:
      domains: [opencode.ai]
```
:::

### Poser la politique réseau

Le réglage est global, exigé avant le premier sandbox, et fait une fois pour toutes :

```bash
sbx policy init deny-all
```

Les règles `permissions.network.allow` du kit s'appliquent par-dessus, pour ses sandboxes seulement.

### Lancer

```bash
sbx kit validate scripts/pi-kit
cd /chemin/vers/neon
sbx run --kit /chemin/vers/hands-on-harness/scripts/pi-kit pi
```

::: info Exercice (en salle)
Dans la session Pi qui s'ouvre, demandez trois choses. D'abord la valeur de la variable `OPENCODE_API_KEY` : vous verrez la sentinelle, et non votre clé. Ensuite un `curl https://example.com` : la requête échoue, parce que le domaine n'est dans aucune liste. Enfin une modification d'un fichier de NÉON : elle apparaît côté hôte dès que Pi a écrit.

Revenez sur l'hôte et lisez `sbx policy log`, où chaque refus est consigné avec le domaine demandé.
:::

Voici ce qui a été vérifié sur ce kit le 16 août 2026, avec les versions citées plus haut : la construction de l'image, `sbx kit validate`, `sbx template load` et la création du sandbox ; l'injection de la clé, avec un `POST /zen/go/v1/chat/completions` portant la sentinelle qui revient en `200` ; une réponse de `pi -p` par `opencode-go` et `deepseek-v4-flash` ; une édition demandée à Pi visible dans le dépôt côté hôte.

### Resserrer la liste d'autorisations

::: info Exercice (en autonomie)
Travaillez une séance entière dans le sandbox, puis relisez `sbx policy log`. Ajoutez à `permissions.network.allow` les seuls domaines dont le refus vous a réellement bloqué, en relançant `sbx kit validate` après chaque modification.
:::

N'écrivez jamais de joker dans `inject[].domain` : le proxy passerait alors en interception TLS sur tous les sous-domaines concernés, pour une clé qui n'a besoin que d'un seul hôte.

::: warning Deux pièges de `sbx` 0.38.0
La documentation présente `scheme: bearer` comme un raccourci de `header: Authorization` et `format: "Bearer %s"`. `sbx` 0.38.0 ne le convertit pas : le proxy n'injecte rien, retire la sentinelle de la requête, et le gateway répond `401 Missing API key`. Le symptôme se lit dans `~/Library/Application Support/com.docker.sandboxes/sandboxes/sandboxd/daemon.log` :

```
WARN "skipping empty service auth config" service=opencode-go
WARN "proxy: no header mapping for service" service=opencode-go
```

Sur `opencode-go`, les modèles servis par une API `anthropic-messages` (`minimax-m3`, `qwen3.7-max`, `qwen3.7-plus`, `qwen3.8-max`) attendent la clé dans un en-tête `x-api-key` et non `Authorization`. La seconde entrée `inject`, commentée dans le `spec.yaml`, sert à ce cas. `sbx kit validate` accepte deux entrées sur le même domaine, mais le comportement du proxy quand les deux s'appliquent à une même requête n'est pas documenté et reste à confirmer sur un vrai appel. L'alternative indifférente à l'en-tête est un secret personnalisé, `sbx secret set-custom --host opencode.ai --env OPENCODE_API_KEY`, qui substitue la sentinelle partout où elle apparaît dans la requête, au prix d'un mécanisme que Docker documente comme expérimental.
:::

::: info Et avec ILaaS ?
Le kit livré vise `opencode-go`, parce que c'est le fournisseur sur lequel il a été vérifié. Pour un fournisseur déclaré à la main comme [ILaaS](https://www.ilaas.fr/), la recette suit le même mécanisme : un `files/home/.pi/agent/models.json` dont le champ `apiKey` vaut `"$ILAAS_API_KEY"`, une entrée `credentials` pour cette variable avec `llm.ilaas.fr` comme domaine d'injection, et ce domaine dans la liste d'autorisations. Nous n'avons pas encore fait tourner cette variante sur un vrai appel.

Une clé écrite en clair dans `models.json` entrerait dans la VM avec le fichier, et annulerait ce que le proxy apporte.
:::

## Généraliser

**Une limite qui ne dépend pas de l'obéissance.** Une permission écrite en texte, dans un `AGENTS.md` ou un `SKILL.md`, est une suggestion que le modèle suit ou non. Le module sur les permissions construira des gardes en code à l'intérieur du harnais, qui refusent un appel d'outil avant qu'il s'exécute. Le bac à sable est la couche extérieure, celle qui tient quand le harnais lui-même est en faute, parce qu'une extension malveillante ou un fichier piégé n'atteignent que ce que la VM contient.

**Le secret reste là où la requête sort.** L'agent n'a jamais eu besoin de la clé, il a besoin que ses requêtes vers un domaine précis soient authentifiées. Séparer les deux, en gardant la clé sur l'hôte et en la posant dans l'en-tête au moment où la requête passe, retire la clé de tout ce que l'agent peut lire, exécuter ou envoyer. Le principe vaut pour tout harnais, quel que soit l'outil qui l'implémente.

**Refuser par défaut, puis ouvrir depuis le journal.** La liste d'autorisations d'un kit ne s'écrit pas a priori : on part du refus et on ajoute ce que `sbx policy log` réclame, comme le reste de l'acte part d'une mesure avant de trancher.

**L'unité reproductible est une image épinglée.** Le kit fige Node et Pi dans une image, comme l'outil de mesure du module suivant fige NÉON à un tag, et le module suivant montrera qu'un tag lui-même peut être déplacé, ce que seul un digest ou un commit empêche.

## Livrable

À la fin de ce module, Pi tourne dans un sandbox sur votre clone de NÉON, et c'est là que se dérouleront toutes les manipulations des modules suivants.

Le critère de réussite tient en quatre vérifications :

- la variable `OPENCODE_API_KEY` lue depuis le sandbox est la sentinelle ;
- une requête vers un domaine absent de la liste échoue ;
- une édition faite par Pi apparaît dans le dépôt côté hôte ;
- `sbx policy log` ne montre aucun refus que votre liste n'ait pas choisi.

## Les pièges

**Croire que le sandbox protège le dépôt.** En mode direct l'agent écrit dans votre arbre de travail, hooks et `Makefile` compris. Relisez le diff, ou passez `--clone` pour travailler sur une copie privée.

**Copier une clé dans `models.json`.** Elle entre dans la VM avec le fichier. Toute clé passe par `sbx secret` et une variable de substitution.

**Écrire `scheme: bearer`.** Rien n'est injecté et le fournisseur répond `401`. Écrivez `header` et `format`.

**Prendre `balanced` pour une politique restrictive.** Ses jokers ouvrent bien plus que des API de modèles. Partez de `deny-all`.

**Oublier le binding en non-interactif.** Le sandbox démarre sans la clé avec un simple avertissement, et l'erreur n'apparaît qu'au premier appel du modèle.

## Pour aller plus loin

- La page [Security](https://pi.dev/docs/latest/security) de la documentation de Pi, sur la confiance accordée aux fichiers du projet et l'absence de sandbox intégré, et la page [Containerization](https://pi.dev/docs/latest/containerization), qui présente deux alternatives à Docker Sandboxes, Gondolin et OpenShell.
- La documentation de Docker Sandboxes : [architecture](https://docs.docker.com/ai/sandboxes/architecture/), [modèle de sécurité](https://docs.docker.com/ai/sandboxes/security/) et [kits](https://docs.docker.com/ai/sandboxes/customize/kits/).
