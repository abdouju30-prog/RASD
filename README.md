# Homologa

**Tour de contrôle réglementaire, prospection de matières actives et usine à
dossiers** pour la commercialisation de produits phytosanitaires au Maroc.

Détenteur configuré : **PHYTO BEHT** — 38 produits, 68 usages homologués.

La boucle est fermée autour de la matière active :

```
Signal réglementaire  →  M.A. à risque  →  Produits + usages affectés
        ▲                                            │
        │                                            ▼
  Fournisseur générique  ←  Cible de sourcing  ←  Alternative homologable
  (Inde, Chine, Russie…)          │
                                  ▼
                      Dossier ONSSA pré-rempli
```

---

## Démarrer

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
```

Réimporter l'index ONSSA après mise à jour du fichier source :

```bash
npm run import
```

> Le script d'import est en Python et nécessite `openpyxl`
> (`pip install openpyxl`). Il lit l'Excel et écrit `data/onssa.json` ;
> le reste de l'application ne lit que ce JSON.

---

## Les deux couches de données — à ne jamais confondre

| Couche | Contenu | Origine | Fiabilité |
|---|---|---|---|
| **Importée** | Index ONSSA : 4 852 lignes, 1 413 produits, 76 détenteurs, 653 matières actives, 211 fournisseurs. Portefeuille du détenteur : AMM, dates, usages, doses, DAR. | `scripts/import_onssa.py` depuis *FICHIERS PHYTO.xlsx* | Reproductible, daté, aucune saisie |
| **Expertise** | Statuts d'approbation UE, échéances, drapeaux de danger (CMR, perturbateur endocrinien, toxicité abeilles…). | `lib/reglementaire.ts`, saisie manuelle | À valider — voir réserve ci-dessous |

Ce que l'application **n'invente pas** :

- **Le chiffre d'affaires.** Absent de la source. Optionnel, à renseigner dans
  `data/ca.json`. Sans lui, l'exposition est mesurée en produits et usages
  homologués — jamais en CA estimé.
- **Les prix fournisseurs.** Absents de la source. Le module de sourcing classe
  par *accessibilité* (nombre de génériques en concurrence), pas par prix.
- **Un score de risque sans fiche.** Une molécule sans statut UE vérifié affiche
  « risque non évalué », pas un score inventé.

### ⚠️ Réserve sur les échéances UE

Les dates d'expiration d'approbation proviennent de la **PPDB** (AERU, University
of Hertfordshire), consultée le **2026-09-01**. La Commission européenne prolonge
très fréquemment ces dates par règlement d'exécution quand l'évaluation de
renouvellement n'est pas terminée.

**Une échéance dépassée dans l'outil signifie « à recouper d'urgence contre la EU
Pesticides Database », jamais « substance interdite ».** Ce point doit être dit au
client à chaque présentation.

23 fiches sont saisies, dont 20 vérifiées sur source citable. Les matières actives
du portefeuille sans fiche sont listées comme « angles morts » sur le radar.

---

## Écrans

| Route | Rôle |
|---|---|
| `/` | **Radar** — matrice risque × exposition, AMM expirées, actions recommandées, angles morts |
| `/veille` | **Alertes** — recalculées à chaque affichage depuis les dates d'AMM et les statuts UE. Rien n'est stocké, aucun cron |
| `/sourcing` | **Prospection** — matières actives à importer, filtrables par pays fournisseur, catégorie et concurrence acceptée |
| `/sourcing/[id]` | Fiche cible : décomposition du score, fournisseurs référencés ONSSA avec pays, usages revendicables |
| `/matieres`, `/matieres/[id]` | Molécules du portefeuille : décomposition du risque, produits porteurs, alternatives homologables |
| `/produits` | Portefeuille classé par échéance d'AMM |
| `/dossiers` | **Atelier** — trois files : renouveler, substituer, homologuer |
| `/dossiers/generer/[id]` | **Dossier ONSSA pré-rempli** |

---

## Le module de prospection

Une matière active vaut la peine d'être importée quand elle réunit quatre
conditions, toutes lisibles dans l'index ONSSA :

1. **Marché large** — beaucoup d'usages et de cultures homologués
2. **Concurrence faible** — peu de détenteurs d'AMM au Maroc
3. **Sourcing possible** — au moins un fournisseur générique (Inde, Chine,
   Russie, Mexique, Colombie, Turquie…) **déjà référencé à l'ONSSA** sur cette
   matière active
4. **Avenir dégagé** — pas de statut UE dégradé qui condamnerait la molécule

La condition 3 est la plus importante et la moins évidente : un fournisseur déjà
référencé à l'ONSSA a, par définition, déjà constitué le dossier technique accepté
par l'administration marocaine. C'est ce qui transforme une homologation longue en
**dossier par référence (« me-too »)**.

Le score est entièrement décomposé à l'écran — chaque facteur et sa contribution —
pour être discutable plutôt que subi. Pondérations dans `lib/sourcing.ts`.

Le pays des fournisseurs est **inféré** du nom de la société (168 sur 211
identifiés). Un « ? » signale une déduction faite sur le seul suffixe juridique.
À confirmer avant toute prise de contact.

---

## Ce que produit l'usine à dossiers

`/dossiers/generer/[id]` produit :

- la structure des rubriques ONSSA et **qui fournit quoi** (fournisseur /
  laboratoire / détenteur) ;
- la **part allégeable** par référence à une homologation marocaine existante ;
- les **usages revendicables** avec leur précédent réglementaire — dose et DAR
  déjà acceptés par l'ONSSA chez un autre détenteur ;
- les **objections anticipées**, déduites des drapeaux de la matière active.

**Ce qu'elle ne produit pas** : les études techniques elles-mêmes — toxicologie,
écotoxicologie, résidus, méthodes d'analyse. Elles appartiennent au fournisseur de
la matière active et doivent lui être réclamées. Le dossier est prêt à être
*constitué*, pas encore à être déposé.

Les délais d'instruction affichés sont des **ordres de grandeur à confirmer auprès
de l'ONSSA**, pas des engagements.

---

## Déploiement

L'application expose le portefeuille commercial d'un détenteur. Elle est protégée
par mot de passe (HTTP Basic, `middleware.ts`), en **fail-closed** : en production,
l'absence de mot de passe bloque l'accès au lieu de l'ouvrir.

Variables d'environnement (Vercel → Settings → Environment Variables) :

| Variable | Obligatoire | Défaut |
|---|---|---|
| `HOMOLOGA_PASSWORD` | **oui en production** | — |
| `HOMOLOGA_USER` | non | `phytobeht` |

En développement local, l'accès reste libre tant que `HOMOLOGA_PASSWORD` n'est pas
défini.

---

## Architecture

```
scripts/import_onssa.py   Excel ONSSA -> data/onssa.json (seule étape d'import)
data/onssa.json           index + portefeuille (généré, versionné)
data/ca.json              chiffre d'affaires optionnel (saisie manuelle)
lib/types.ts              modèle, séparant couche importée et couche expertise
lib/data.ts               chargement + jointure, aucune donnée en dur
lib/reglementaire.ts      fiches UE saisies à la main, avec source et date
lib/logic.ts              risque, exposition, état des AMM — heuristiques lisibles
lib/alertes.ts            flux d'alertes recalculé, sans persistance
lib/sourcing.ts           scoring des cibles de prospection
lib/dossier.ts            génération de dossier ONSSA pré-rempli
middleware.ts             protection par mot de passe
```

Next.js 15 (App Router, composants serveur), Tailwind v4, tokens CSS dans
`app/globals.css`, icônes `lucide-react`. Aucune base de données : l'état tient
dans les fichiers versionnés.

---

## Reste à faire

1. **Compléter les fiches réglementaires** — 5 matières actives du portefeuille
   sans statut UE, et 630 molécules de l'index non couvertes (elles apparaissent
   en « risque non évalué » dans la prospection).
2. **Renseigner `data/ca.json`** pour pondérer le radar par chiffre d'affaires.
3. **Automatiser la veille** — brancher un connecteur EU Pesticides Database pour
   remplacer la saisie manuelle de `lib/reglementaire.ts`.
4. **Multi-détenteur** — `DETENTEUR_CIBLE` est figé dans le script d'import ;
   le paramétrer pour vendre l'outil à plusieurs sociétés.
5. **Édition des dossiers** — les dossiers sont générés à la volée, en lecture
   seule. Les rendre modifiables et persistants demande une base de données.
