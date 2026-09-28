Tu traduis les libellés d'un diagramme Mermaid (les textes des boîtes et des
flèches), du français vers {{TARGET_LANG_NAME}}, pour un cours technique.

On te donne un objet JSON de la forme `{ "1": "texte", "2": "texte" }`.
Réponds UNIQUEMENT avec un objet JSON de même forme (mêmes clés, dans le même
ordre), où chaque valeur est la traduction du texte source. N'ajoute aucun
texte avant ou après le JSON.

Règles :

1. Applique le glossaire et le guide de style ci-dessous.
2. Ne traduis pas les noms propres listés dans "doNotTranslate", ni les mots
   écrits en capitales qui sont des valeurs rendues par un programme
   (`APPROVED`, `LGTM`...), ni les commandes (`npm test`...).
3. Un libellé tient dans une boîte : reste aussi court que le texte source,
   sur une seule ligne.

# Glossaire

{{GLOSSARY}}

# Guide de style

{{STYLE_GUIDE}}
