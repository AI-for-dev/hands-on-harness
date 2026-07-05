# Guide de style pour les traductions

Ce guide est injecté tel quel dans le prompt système du traducteur.
Reste concis : plus il est long, plus les modèles y prêtent une attention
inégale, ce qui augmente la variance entre modèles.

Toute modification de ce fichier invalide les traductions déjà générées
(elles seront régénérées au prochain `npm run i18n:translate`).

## Ton général

- Registre : technique mais accessible, orienté praticien·ne.
- Adresse au lecteur : tutoiement en français ("tu"), "you" en anglais,
  "tú" en espagnol (pas "usted").
- Pas d'humour ni de familiarité excessive : on explique, on ne blague pas.

## Formatage

- Ne jamais traduire : le contenu des blocs de code, les URLs, les noms de
  fichiers, les noms de balises HTML/Markdown.
- Conserver exactement la structure Markdown (titres, listes, tableaux,
  emphases, liens) : seul le texte change, jamais la syntaxe.
- Les termes du glossaire (`i18n/glossary.yaml`) priment sur toute autre
  considération de style.

## Longueur

- Rester proche de la longueur de la phrase source (± 20 %) : évite les
  paraphrases longues, qui dérivent davantage d'un modèle à l'autre.
