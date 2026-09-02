"""
Mise à jour complète des sources, en une commande.

    npm run maj              # rafraîchit, commite, pousse et déploie
    npm run maj -- --sec     # rafraîchit seulement, ne commite rien
    npm run maj -- --local   # commite et pousse, sans déployer

Pourquoi une commande et pas un bouton dans l'application : le système de
fichiers de Vercel est en lecture seule. Un bouton pourrait télécharger E-Phy,
mais rien ne survivrait au rechargement. La mise à jour doit se faire là où il
y a un disque — ici, ou dans GitHub Actions.

Ce que le script fait, dans l'ordre :
  1. E-Phy (Anses)   — statut français, republié chaque nuit de mardi à mercredi
  2. APVMA (Australie) — recoupement hors UE, republié chaque semaine
  3. Diff : si aucun statut n'a changé, il s'arrête là et ne commite rien
  4. Commit décrivant ce qui a bougé, push, puis déploiement Vercel

L'index ONSSA n'est PAS rafraîchi ici : il vient d'un fichier Excel que vous
maîtrisez, pas d'une source publique. Utiliser `npm run import` après l'avoir
mis à jour.
"""

import json
import subprocess
import sys
from datetime import date
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent


def executer(cmd, **kw):
    """Lance une commande et laisse sa sortie s'afficher."""
    return subprocess.run(cmd, cwd=RACINE, shell=isinstance(cmd, str), **kw)


def capturer(cmd):
    r = subprocess.run(cmd, cwd=RACINE, shell=isinstance(cmd, str),
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def titre(t):
    print(f"\n\033[1m{t}\033[0m")
    print("─" * len(t))


def lire_diff():
    """Changements de statut relevés au dernier import E-Phy."""
    f = RACINE / "data" / "ephy.json"
    if not f.exists():
        return []
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
        return (d.get("diff") or {}).get("changements", [])
    except Exception:
        return []


def main():
    args = set(sys.argv[1:])
    sans_commit = "--sec" in args
    sans_deploiement = "--local" in args or sans_commit

    titre("1 · Catalogue E-Phy — Anses")
    if executer([sys.executable, "scripts/import_ephy.py"]).returncode != 0:
        sys.exit("Import E-Phy en échec — rien n'a été commité.")

    titre("2 · Registre PUBCRIS — APVMA")
    if executer([sys.executable, "scripts/import_apvma.py"]).returncode != 0:
        sys.exit("Import APVMA en échec — rien n'a été commité.")

    titre("3 · Ce qui a changé")
    code, sortie = capturer(["git", "status", "--porcelain", "--", "data/"])
    modifies = [l[3:] for l in sortie.splitlines() if l.strip()]
    if not modifies:
        print("  Aucune donnée modifiée. Les deux catalogues sont déjà à jour.")
        return

    for m in modifies:
        print(f"  modifié : {m}")

    changements = lire_diff()
    if changements:
        print(f"\n  {len(changements)} changement(s) de statut en France :")
        for c in changements[:15]:
            print(f"    {c['nom'][:46]:48} {c.get('avant') or '—'} -> {c.get('apres') or '—'}")
        if len(changements) > 15:
            print(f"    … et {len(changements) - 15} autres")
    else:
        print("\n  Aucun changement de statut : seules les métadonnées ont bougé.")

    if sans_commit:
        print("\n  --sec : rien n'a été commité.")
        return

    titre("4 · Commit et envoi")
    corps = "\n".join(
        f"- {c['nom']} : {c.get('avant') or '—'} -> {c.get('apres') or '—'}"
        for c in changements[:20]
    ) or "- aucun changement de statut, actualisation des métadonnées"

    message = (
        f"Veille — actualisation des catalogues ({date.today().isoformat()})\n\n"
        f"{len(changements)} changement(s) de statut\n\n{corps}\n\n"
        "Données E-Phy - Anses · APVMA PUBCRIS"
    )
    executer(["git", "add", "data/ephy.json", "data/apvma.json"])
    if executer(["git", "commit", "-m", message]).returncode != 0:
        print("  Rien à commiter.")
        return
    if executer(["git", "push"]).returncode != 0:
        sys.exit("Push en échec — le commit local est conservé.")

    if sans_deploiement:
        print("\n  --local : déploiement non lancé.")
        return

    titre("5 · Déploiement")
    code, _ = capturer("vercel --version")
    if code != 0:
        print("  CLI Vercel absente — lancer « vercel --prod » manuellement.")
        return
    executer("vercel --prod --yes")


if __name__ == "__main__":
    main()
