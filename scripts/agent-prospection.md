# Agent de prospection — consignes du passage quotidien

Tous les jours à 08:15 (Casablanca), la tâche planifiée reprend **la
discussion Claude du projet RASD** (toujours la même) : le fournisseur du
jour y arrive comme un nouveau message, l'utilisateur reçoit une
notification, et la conversation continue là. Le même prospect est inscrit au
journal, que l'application montre sur `/prospection` avec un bouton
« Envoyer avec Gmail ». Calcul : `lib/prospection.ts`, lu par `npm run prospect`.

Règles absolues :

- **Pas de brouillon Gmail, jamais d'envoi.** Le message est livré dans la
  discussion et dans l'application ; l'utilisateur l'envoie lui-même depuis
  son compte (`config.emailEnvoi`).
- **Ne modifier que `data/prospection.json`** dans le dépôt.
- **Ne jamais inventer** une date de brevet, un e-mail ou une homologation :
  écrire « non trouvé » et la source consultée.

## 1. Préparer

1. Dépôt `abdouju30-prog/RASD`, déjà cloné dans la session (sinon le
   recloner). `git pull` sur la branche de travail : `master`, ou
   `claude/agent-prospection` tant que la pull request n'est pas fusionnée.
2. `npm ci` si `node_modules` manque, puis `npm run prospect -- --json`.
3. Si `dejaPrepareAujourdhui` vaut `true`, ne rien préparer de neuf : aller au §3.

## 2. Le fournisseur du jour (`aPreparer[0]`)

Le thème du jour (`themeDuJour`) alterne : molécules qui manquent, sorties
d'exclusivité des majors, deuxième source pour une molécule déjà vendue. Le
fournisseur proposé est déjà choisi pour ce thème.

1. **Vérifier la société sur le web** : elle existe, elle FABRIQUE (pas
   seulement distribue) au moins une des molécules listées, et trouver un
   e-mail officiel (export, sales, regulatory, international business).
   Sources : site officiel, catalogue, registres publics, AgroPages, salons.
   Un nom chinois peut n'être connu de RASD que par une glose française
   (« Huaian Guorui — chimie, SARL ») : retrouver la raison sociale anglaise
   officielle, ou écarter.
   Si la raison mentionne « apparenté au détenteur marocain … », vérifier le
   lien : une filiale qui vend au Maroc sous ses propres homologations est un
   concurrent, l'écarter.
2. **L'écarter** si elle est introuvable, simple négociant, ou filiale d'une
   major : l'inscrire au journal avec `statut: "écarté"` et la raison dans
   `notes`, relancer `npm run prospect -- --json` et prendre le suivant
   (les écartés du jour ne comptent pas comme « préparé »).
3. **Exclusivité** des molécules du message : brevet de molécule et
   certificat complémentaire (SPC) en Europe, protection des données, brevets
   de forme cristalline ou de procédé encore opposés. Sources fiables
   seulement. Une phrase, avec année et source.
4. **Adapter `brouillon.corps`** (anglais) : garder la structure et la
   signature ; une phrase d'accroche fondée sur un fait vérifié. Pour une
   molécule « au portefeuille », dire que Phyto Beht cherche une source
   alternative. Aucun chiffre promis.
5. **Journal** — ajouter à `prospects` :

```json
{
  "id": "<jour>-<cle sans espaces>",
  "date": "<jour>",
  "fournisseur": "<nom>",
  "cle": "<cle>",
  "pays": "<pays>",
  "molecules": ["<noms anglais>"],
  "motifs": ["<thème du jour et motifs des molécules>"],
  "email": "<e-mail ou null>",
  "site": "<site ou null>",
  "objet": "<objet>",
  "message": "<corps final>",
  "statut": "à envoyer",
  "brouillonGmail": null,
  "envoyeLe": null,
  "reponseLe": null,
  "relances": [],
  "verification": { "exclusivite": "<phrase>", "sources": ["<url>"] },
  "notes": "<ce qui compte pour la suite>"
}
```

## 3. Suivi

Si un outil Gmail est disponible **sur le compte d'envoi** (`emailEnvoi`) :

- message **envoyé** à cette adresse ou ce domaine (`in:sent`) → si
  `à envoyer`, passer à `envoyé`, `envoyeLe` = date d'envoi ;
- **réponse reçue** de ce domaine → `réponse`, `reponseLe` = date.

Pour chaque `relancesDues` : rédiger une relance courte en anglais, la
livrer dans la discussion, ajouter la date à `relances`, passer à `relancé`.
Sans Gmail sur le bon compte : le dire, ne rien supposer.

## 4. Enregistrer et livrer

1. `npm run prospect` doit encore tourner (JSON valide).
2. Commit `Prospection — <jour> — <fournisseur>`, `git push` (jusqu'à 4
   essais en cas d'erreur réseau, `git pull --rebase` si besoin).
3. **Message dans la discussion**, en français, court : fournisseur, pays,
   thème du jour, molécules et pourquoi ; exclusivité vérifiée (année,
   source) ; e-mail trouvé ; puis le message anglais complet, prêt à copier ;
   enfin le lien `https://rasd-phyto.vercel.app/prospection`.
4. **Notification** (outil PushNotification) : « Nouveau fournisseur : <nom>
   (<pays>) — <molécules> ».

## Réglages

`data/prospection-config.json` : détenteur (nom exact de l'index ONSSA),
société, signature, adresse d'envoi, rotation des thèmes, délai de relance,
liste des majors, sociétés exclues.
