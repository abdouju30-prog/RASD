# Homologa

**Tour de contrôle réglementaire, prospection de matières actives et usine à
dossiers** pour la commercialisation de produits phytosanitaires au Maroc.

**Les 75 détenteurs de l'index ONSSA**, sélectionnables à l'écran. Changer de
société recalcule tout : portefeuille, alertes, cibles de prospection.
PHYTO BEHT est le détenteur affiché par défaut.

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

Rafraîchir le statut français des matières actives (catalogue E-Phy de l'Anses,
mis à jour chaque mercredi) :

```bash
npm run import:ephy
```

> Le script d'import est en Python et nécessite `openpyxl`
> (`pip install openpyxl`). Il lit l'Excel et écrit `data/onssa.json` ;
> le reste de l'application ne lit que ce JSON.

---

## Les deux couches de données — à ne jamais confondre

| Couche | Contenu | Origine | Fiabilité |
|---|---|---|---|
| **Importée** | Index ONSSA : index public IndPesticide.aspx (produits, détenteurs, matières, usages, doses, DAR). | `scripts/import_onssa_indpesticide.py` depuis eservice.onssa.gov.ma | Reproductible, daté, aucune saisie |
| **Expertise** | Statuts d'approbation UE, échéances, drapeaux de danger (CMR, perturbateur endocrinien, toxicité abeilles…). | `lib/reglementaire.ts`, saisie manuelle | À valider — voir réserve ci-dessous |
| **Formulaire** | Checklist ONSSA Annexe 3-B : 2 parties, 11 sections, 78 lignes. | `lib/checklist-onssa.ts`, transcription du formulaire officiel | Fidèle au document |
| **ANSES** | Statut français de 1 337 substances : inscription au règlement, produits autorisés et retirés, date du dernier retrait. | `scripts/import_ephy.py` depuis le catalogue E-Phy | Source officielle, hebdomadaire |

Ce que l'application **n'invente pas** :

- **Le chiffre d'affaires.** Absent de la source. Optionnel, à renseigner dans
  `data/ca.json`. Sans lui, l'exposition est mesurée en produits et usages
  homologués — jamais en CA estimé.
- **Les prix fournisseurs.** Absents de la source. Le module de sourcing classe
  par *accessibilité* (nombre de génériques en concurrence), pas par prix.
- **Un score de risque sans fiche.** Une molécule sans statut UE vérifié affiche
  « risque non évalué », pas un score inventé.

### La hiérarchie des signaux : ANSES d'abord

**L'ONSSA s'aligne sur l'ANSES.** Le retrait d'une matière active en France
anticipe son retrait au Maroc. C'est donc le signal le plus prédictif dont
dispose l'outil — plus que le statut UE, qui est en amont et plus lent.

Le statut ANSES pèse `+55` au score de risque, devant le retrait d'approbation
UE (`+45`), et les alertes « retrait ANSES » passent en tête du flux.

Le statut est **lu dans le catalogue E-Phy de l'Anses**, apparié aux matières
actives de l'index ONSSA. Couverture : **89 % des 653 molécules** de l'index
(490 autorisées, 62 retirées, 31 sans produit autorisé). Quand l'appariement
échoue, l'outil retombe sur une déduction — une substance non approuvée en UE ne
peut être autorisée dans aucun État membre — toujours signalée comme telle.

Trois statuts, qui ne pèsent pas pareil :

| Statut | Signification | Poids |
|---|---|---|
| **retirée** | Non inscrite au règlement : plus autorisable en France | +55, et **écarte d'office** la cible en prospection |
| **en_retrait** | Inscrite, mais plus aucun produit autorisé — retrait commercial | +30 |
| **autorisée** | Produits toujours autorisés en France | +6 au score de prospection |

Sur le portefeuille PHYTO BEHT, cinq produits sont concernés :
**alpha-cyperméthrine** (AL-KATIL, ATLANTIC) et **imidaclopride** (BRIGHT SC,
SOLTAN 500 SC) sont retirées ; **oxyfluorfène** (DRON TOP, TWIN-PRO) et
**huile minérale paraffinique** (ALDO GOLD) n'ont plus de produit autorisé.

> Attribution obligatoire (Licence Ouverte) : **Données E-Phy - Anses**, avec la
> date de mise à jour. Elle est affichée dans l'application.

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
| `/veille` | **Alertes** — recalculées à chaque affichage depuis les dates d'AMM, le statut ANSES et le statut UE. Rien n'est stocké, aucun cron |
| `/sourcing` | **Prospection** — matières actives à importer, filtrables par pays fournisseur, catégorie et concurrence acceptée |
| `/sourcing/[id]` | Fiche cible : décomposition du score, fournisseurs référencés ONSSA avec pays, usages revendicables |
| `/matieres`, `/matieres/[id]` | Molécules du portefeuille : décomposition du risque, produits porteurs, alternatives homologables |
| `/produits` | Portefeuille classé par échéance d'AMM |
| `/dossiers` | **Atelier** — trois files : renouveler, substituer, homologuer |
| `/dossiers/generer/[id]` | **Dossier ONSSA pré-rempli** — les 78 lignes de l'Annexe 3-B |

---

## Le module de prospection

Une matière active vaut la peine d'être importée quand elle réunit quatre
conditions, toutes lisibles dans l'index ONSSA :

1. **Marché large** — beaucoup d'usages et de cultures homologués
2. **Concurrence faible** — peu de détenteurs d'AMM au Maroc
3. **Sourcing possible** — au moins un fournisseur générique (Inde, Chine,
   Russie, Mexique, Colombie, Turquie…) **déjà référencé à l'ONSSA** sur cette
   matière active
4. **Avenir dégagé** — ni retrait ANSES, ni statut UE dégradé qui condamnerait la molécule

La condition 3 est la plus importante et la moins évidente : un fournisseur déjà
référencé à l'ONSSA a, par définition, déjà constitué le dossier technique accepté
par l'administration marocaine. C'est ce qui transforme une homologation longue en
**dossier par référence (« me-too »)**.

Le score est entièrement décomposé à l'écran — chaque facteur et sa contribution —
pour être discutable plutôt que subi. Pondérations dans `lib/sourcing.ts`.

Le pays des fournisseurs est **inféré** du nom de la société (169 sur 211
identifiés). Un « ? » signale une déduction faite sur le seul suffixe juridique.
À confirmer avant toute prise de contact.

### Trouver un fournisseur que l'index marocain ne connaît pas

L'index ONSSA ne nomme que les sociétés déjà entrées au Maroc : par construction,
il ne peut pas révéler un fabricant que personne n'a encore fait venir. Deux
registres étrangers le peuvent, et ils répondent à deux questions différentes.

| Registre | Question à laquelle il répond | Ce qu'on en tire |
|---|---|---|
| **APVMA** (Australie) | Qui détient une homologation sur cette molécule hors du Maroc ? | 721 sociétés, dont **55 génériqueurs absents de l'index marocain** |
| **ICAMA** (Chine) | Quelles **usines** fabriquent la matière active technique ? | Homologations 原药 croisées avec les licences de production |

Le croisement chinois est ce qui a de la valeur : une homologation de matière
active technique autorise à **vendre** la substance, une licence de production
autorise à la **fabriquer**. Qui a les deux est une usine ; qui n'a que la
première peut n'être qu'un négociant. La distinction est affichée, pas gommée.

> ⚠️ **Ni l'une ni l'autre n'ouvre le moindre droit devant l'ONSSA.** Une
> homologation australienne ou chinoise ne raccourcit aucun délai et ne remplace
> aucune étude de l'Annexe 3-B — seul un fournisseur **déjà référencé à l'index
> marocain** ouvre la voie me-too. Ces registres servent à trouver et qualifier
> un fabricant, rien d'autre. Ni prix, ni capacité, ni audit qualité.

Le rattachement à l'index se fait **sur le nom**, donc il s'affiche : chaque
rapprochement montre le fournisseur ONSSA qui l'a déclenché, et une parenté
probable est signalée « groupe probable » plutôt que tranchée. Côté chinois,
aucun rapprochement n'est tenté — les raisons sociales sont en caractères
chinois, et prétendre les apparier automatiquement serait inventer.

    npm run import:apvma     # registre australien (zip 23 Mo)
    npm run import:icama     # registre chinois (~200 requêtes, ~7 min)

---

## L'usine à dossiers suit l'Annexe 3-B

Le dossier généré reprend **ligne à ligne le formulaire officiel de l'ONSSA**
(« CHECK LIST SC — requirements registration Morocco »), transcrit dans
`lib/checklist-onssa.ts` : 2 parties, 11 sections, **78 lignes**.

| | Partie I — préparation commerciale | Partie II — matière active |
|---|---|---|
| Sections | Identité, physico-chimie*, toxicologie*, méthodes d'analyse, données d'emploi, dossier biologique, classification | Identité, physico-chimie*, méthodes d'analyse, classification |
| Lignes | 50 | 28 |

\* sections exigeant un laboratoire accrédité **BPL** — 46 lignes au total.

## Ce que produit l'usine à dossiers

`/dossiers/generer/[id]` produit :

- les 78 lignes du formulaire et **qui détient la donnée** (fournisseur /
  laboratoire / détenteur) ;
- les lignes exigeant un **laboratoire accrédité BPL** ;
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

### Première mise en ligne

```bash
vercel login
vercel link          # créer le projet « homologa »
vercel env add HOMOLOGA_PASSWORD production
vercel env add HOMOLOGA_USER production      # optionnel
vercel --prod
```

> ⚠️ `data/onssa.json` contient le portefeuille commercial du détenteur : AMM,
> fournisseurs, usages, échéances. **Garder le dépôt privé** et ne jamais
> déployer sans `HOMOLOGA_PASSWORD`. Le middleware refuse de servir
> l'application si la variable est absente en production — c'est volontaire.

---

## Mise à jour automatique de la veille

L'Anses republie E-Phy chaque nuit de mardi à mercredi. Le workflow
[`.github/workflows/maj-ephy.yml`](.github/workflows/maj-ephy.yml) le récupère
le jeudi matin, régénère `data/ephy.json`, et **ne commite que si un statut a
réellement changé**. Le push déclenche le redéploiement Vercel.

```
jeudi 07h00  ->  import E-Phy  ->  diff vs semaine précédente
                                        |
                      aucun changement --+-- changement détecté
                              |                     |
                        rien à faire         commit + push
                                                    |
                                            redéploiement Vercel
```

Pourquoi un commit plutôt qu'une écriture à l'exécution :

- le système de fichiers est en **lecture seule** sur Vercel ;
- le commit garantit la mise en ligne, sans base de données ni add-on ;
- surtout, **l'historique git devient le journal de la veille**. Chaque semaine
  où un statut bouge laisse une trace datée, lisible et opposable. C'est
  précisément ce qu'un outil réglementaire doit pouvoir produire — et c'est
  gratuit.

Le message de commit liste les molécules concernées :

```
Veille E-Phy — actualisation du catalogue Anses

Catalogue E-Phy du 2026-09-02 — 3 changement(s) de statut

- Metiram : autorisée -> retirée
- Fenpyroximate : autorisée -> sans produit autorisé
- Bacillus subtilis : nouvelle -> autorisée
```

**Chaîne active depuis le 2026-09-02.** Le dépôt `abdouju30-prog/homologa` est
relié à Vercel, branche de production `master` : tout push déclenche un
déploiement. Aucun secret à configurer, le `GITHUB_TOKEN` par défaut suffit.

À la main, sans attendre le jeudi : `npm run maj` rafraîchit les deux
catalogues, ne commite que si un statut a changé, pousse et déploie.

### Ce que l'application dit d'elle-même

Un outil de veille qui affiche des statuts sans dire de quand ils datent est plus
dangereux qu'utile. Le composant `FraicheurEphy` affiche donc en permanence
l'âge de la source, en pastille dans la barre latérale et en bandeau sur
`/veille` :

| Âge | État | Message |
|---|---|---|
| <= 10 jours | à jour | catalogue courant |
| 11 à 21 jours | à rafraîchir | une publication manquée |
| > 21 jours | **périmée** | les statuts ne reflètent peut-être plus la réalité |

Le bandeau liste aussi les changements de statut relevés au dernier import.

---

## Architecture

```
scripts/import_onssa_indpesticide.py   IndPesticide.aspx -> data/onssa.json
scripts/import_onssa.py                Excel ONSSA (secours hors ligne) -> data/onssa.json
scripts/import_ephy.py    catalogue E-Phy (Anses) -> data/ephy.json
data/onssa.json           index + portefeuille (généré, versionné)
data/ephy.json            statut français des substances (généré, versionné)
data/ca.json              chiffre d'affaires optionnel (saisie manuelle)
lib/types.ts              modèle, séparant couche importée et couche expertise
lib/data.ts               chargement + jointure, aucune donnée en dur
lib/reglementaire.ts      fiches UE saisies à la main, avec source et date
lib/checklist-onssa.ts    formulaire ONSSA Annexe 3-B, transcrit ligne à ligne
lib/ephy.ts               appariement index ONSSA <-> catalogue E-Phy (Anses)
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
   en « risque non évalué » dans la prospection). E-Phy couvre déjà le statut
   français ; ce qui manque est le statut UE et les drapeaux de danger.
2. **Renseigner `data/ca.json`** pour pondérer le radar par chiffre d'affaires.
4. **Multi-détenteur** — `DETENTEUR_CIBLE` est figé dans le script d'import ;
   le paramétrer pour vendre l'outil à plusieurs sociétés.
5. **Édition des dossiers** — les dossiers sont générés à la volée, en lecture
   seule. Les rendre modifiables et persistants demande une base de données.
