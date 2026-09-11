#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Déploiement production de Homologa sur Vercel.
#
# Prérequis — secrets Cloud Agent (injectés dans un NOUVEAU run uniquement) :
#   VERCEL_TOKEN       token Vercel (obligatoire)
#   HOMOLOGA_PASSWORD  mot de passe HTTP Basic de production (obligatoire)
#   HOMOLOGA_USER      identifiant (optionnel, défaut « phytobeht »)
# Variable optionnelle :
#   VERCEL_PROJECT     nom du projet Vercel (défaut « homologa »)
#
# Usage : bash scripts/deploy_vercel.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN manquant : ajoute-le en Secret puis relance un nouvel agent}"
: "${HOMOLOGA_PASSWORD:?HOMOLOGA_PASSWORD manquant : ajoute-le en Secret puis relance un nouvel agent}"
HOMOLOGA_USER="${HOMOLOGA_USER:-phytobeht}"
VERCEL_PROJECT="${VERCEL_PROJECT:-homologa}"

TOKEN=(--token "$VERCEL_TOKEN")

command -v vercel >/dev/null 2>&1 || npm i -g vercel

echo "→ Projets Vercel disponibles (repère le nom exact du projet cible) :"
vercel projects ls "${TOKEN[@]}" || true

echo "→ Lien au projet « $VERCEL_PROJECT »"
vercel link --yes --project "$VERCEL_PROJECT" "${TOKEN[@]}"

set_env() {
  local name="$1" value="$2"
  # Idempotent : on retire l'ancienne valeur avant d'ajouter la nouvelle.
  vercel env rm "$name" production --yes "${TOKEN[@]}" >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" production "${TOKEN[@]}"
}

echo "→ Variables de production (auth HTTP Basic)"
set_env HOMOLOGA_PASSWORD "$HOMOLOGA_PASSWORD"
set_env HOMOLOGA_USER "$HOMOLOGA_USER"

echo "→ Déploiement production (build côté Vercel)"
vercel deploy --prod "${TOKEN[@]}"

echo "✓ Déploiement lancé. Vérifie l'URL affichée ci-dessus."
