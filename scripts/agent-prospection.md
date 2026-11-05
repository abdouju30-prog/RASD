# Agent de prospection — consignes de la tâche quotidienne

Tâche planifiée Claude, **tous les jours à 08:15 (Casablanca)**. Elle prépare
**un** brouillon de message en anglais à un nouveau fournisseur potentiel et
tient le journal de suivi. Page : `/prospection`. Calcul : `lib/prospection.ts`, lu par `npm run prospect`.

Règles absolues :

- **Ne jamais envoyer d'e-mail.** Créer des brouillons Gmail seulement.
- **Ne modifier que `data/prospection.json`.** Aucun autre fichier.
- **Ne jamais inventer** une date de brevet, un e-mail ou une homologation :
  écrire « non trouvé » et la source consultée.

## 1. Préparer

1. Cloner `abdouju30-prog/RASD` (outil `add_repo` avec accès `push` d'abord).
   Branche `master` ; si `scripts/prospect-du-jour.ts` n'y est pas encore,
   travailler sur la branche `claude/agent-prospection`.
2. `npm ci`, puis `npm run prospect -- --json > /tmp/prospect.json`.
3. Si `dejaPrepareAujourdhui` vaut `true`, ne rien préparer de neuf : aller au §3.

## 2. Le fournisseur du jour (`aPreparer[0]`)

1. **Vérifier la société sur le web** : elle existe, elle FABRIQUE (pas
   seulement distribue) au moins une des molécules listées, et trouver un
   e-mail officiel (export, sales, regulatory, international business).
   Sources : site officiel, catalogue, registres publics, AgroPages, salons.
   Un nom chinois peut n'être connu de RASD que par une glose française
   (« Huaian Guorui — chimie, SARL ») : retrouver la raison sociale anglaise
   officielle et l'utiliser dans le message et le journal.
   Si la raison mentionne « apparenté au détenteur marocain … », vérifier le
   lien : une filiale qui vend au Maroc sous ses propres homologations est un
   concurrent, l'écarter.
2. **L'écarter** si elle est introuvable, simple négociant, ou filiale d'une
   major (Syngenta, Bayer, BASF, Corteva, FMC, Sumitomo, Nissan, ISK…) :
   l'inscrire au journal avec `statut: "écarté"` et la raison dans `notes`,
   relancer `npm run prospect -- --json` et prendre le suivant.
3. **Exclusivité** des molécules du message : expiration du brevet de
   molécule et du certificat complémentaire (SPC) en Europe, fin de
   protection des données. Sources fiables seulement (Espacenet/EPO, EU
   Pesticides Database, presse agro). Une phrase, avec année et source.
4. **Adapter `brouillon.corps`** (anglais) : garder la structure et la
   signature de la config ; ajouter une phrase d'accroche fondée sur un fait
   vérifié (usine, homologations, gamme). Aucun chiffre promis.
5. **Créer le brouillon Gmail** : destinataire = e-mail trouvé (vide sinon),
   objet `brouillon.objet` ajusté si besoin.
   **Si les outils Gmail ne sont pas disponibles** dans la session, ne rien
   simuler : inscrire le message au journal avec `brouillonGmail: null` (la
   page `/prospection` l'ouvre dans Gmail, prérempli, en un clic), sauter le
   suivi Gmail du §3, et le dire dans le résumé final.
6. **Journal** — ajouter à `prospects` :

```json
{
  "id": "<jour>-<cle sans espaces>",
  "date": "<jour>",
  "fournisseur": "<nom>",
  "cle": "<cle>",
  "pays": "<pays>",
  "molecules": ["<noms anglais>"],
  "motifs": ["<raisons et motifs des molécules>"],
  "email": "<e-mail ou null>",
  "site": "<site ou null>",
  "objet": "<objet>",
  "message": "<corps final>",
  "statut": "à envoyer",
  "brouillonGmail": "<id du brouillon>",
  "envoyeLe": null,
  "reponseLe": null,
  "relances": [],
  "verification": { "exclusivite": "<phrase>", "sources": ["<url>"] }
}
```

## 3. Suivi

Pour chaque entrée de `enAttenteDeReponse` :

- message **envoyé** à cette adresse ou ce domaine (`in:sent`) → si
  `à envoyer`, passer à `envoyé`, `envoyeLe` = date d'envoi ;
- **réponse reçue** de ce domaine → `réponse`, `reponseLe` = date.

Pour chaque entrée de `relancesDues` (envoyé sans réponse depuis
`relanceApresJours` jours) : brouillon de relance courte en anglais, dans le
même fil si possible ; ajouter la date à `relances` et passer à `relancé`.

## 4. Enregistrer

1. `npm run prospect` doit encore tourner (JSON valide).
2. Commit `Prospection — <jour> — <fournisseur>` sur la branche de travail,
   `git push` (jusqu'à 4 essais en cas d'erreur réseau).
3. Résumé final en français, trois lignes : fournisseur du jour et molécules ;
   exclusivité vérifiée ; relances et réponses détectées.

## Réglages

`data/prospection-config.json` : détenteur (nom exact de l'index ONSSA),
société, signature, nombre par jour, délai de relance, fenêtre
d'exclusivité, liste des majors.
