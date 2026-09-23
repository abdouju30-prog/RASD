# BPE

Trial-preparation workspace for Moroccan plant-protection experiments
(bonnes pratiques d'expérimentation).

It reads a snapshot extracted from Homologa and adds procedures, crop-to-perimeter
links Homologa did not map, tank-mix preparation notes, and an agreement-expiry
flag. It does not import Homologa code and it does not write back to Homologa.

What the snapshot keeps: active substance, crop, pest, dose, PHI (DAR), formulated
mixtures, and the public ONSSA BPE organism register.

What it drops: commercial product names, holders, suppliers, authorisation numbers.

## Scripts

```bash
npm install
npm run dev
npm run verifier
npm run build
```

Regenerate `data/corpus.json` after Homologa JSON updates (read-only):

```bash
npm run extraire
```

## Deploy

Separate Vercel project, root directory = this folder. No login.
