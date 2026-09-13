"""
Mise à jour complète des sources, en une commande.

    npm run maj              # rafraîchit, commite, pousse et déploie
    npm run maj -- --sec     # rafraîchit seulement, ne commite rien
    npm run maj -- --local   # commite et pousse, sans déployer
    npm run maj -- --chine   # ajoute le relevé ICAMA (long, ~7 min)

Pourquoi une commande et pas un bouton dans l'application : le système de
fichiers de Vercel est en lecture seule. Un bouton pourrait télécharger E-Phy,
mais rien ne survivrait au rechargement. La mise à jour doit se faire là où il
y a un disque — ici, ou dans GitHub Actions.

Ce que le script fait, dans l'ordre :
  1. E-Phy (Anses)   — statut français, republié chaque nuit de mardi à mercredi
  2. APVMA (Australie) — recoupement hors UE, dump hebdomadaire
  2 bis. AGROFIT (Brésil) — CSV ouvert, usines de synthèse (la sentinelle s'en sert)
  2 ter. PSIS (Corée du Sud) — le seul registre daté au jour
  3. Sentinelle — recroise Brésil × Corée × ONSSA × E-Phy × PUBCRIS
  4. Diff : si aucun statut n'a changé, il s'arrête là et ne commite rien
  5. Commit décrivant ce qui a bougé, push, puis déploiement Vercel

Le relevé ICAMA (Chine) n'est PAS dans la course hebdomadaire, et c'est
délibéré : il se fait en interrogeant un formulaire ~200 fois, le registre
bouge lentement, et il n'apporte aucun signal réglementaire — seulement des
fournisseurs. Il se lance à la demande, avec --chine ou `npm run import:icama`.

L'index ONSSA n'est PAS rafraîchi ici : il vient d'un fichier Excel que vous
maîtrisez, pas d'une source publique. Utiliser `npm run import` après l'avoir
mis à jour. Les avis et textes de Reglementation_N.aspx tournent à part,
chaque jeudi : `npm run import:onssa-regl` ou le workflow maj-onssa-regl.
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

    titre("2 bis · Registre AGROFIT — Brésil")
    if executer([sys.executable, "scripts/import_agrofit.py", "--frais"]).returncode != 0:
        print("  Import AGROFIT en échec — la veille continue avec le relevé précédent.")

    if "--chine" in args:
        titre("2 ter · Registre ICAMA — Chine")
        if executer([sys.executable, "scripts/import_icama.py"]).returncode != 0:
            sys.exit("Import ICAMA en échec — rien n'a été commité.")

    # Le registre coréen se régénère quotidiennement et c'est le seul qui date
    # ses homologations : il vaut d'être relevé à chaque veille, avant la
    # sentinelle qui s'en sert. Son échec n'emporte pas la veille.
    titre("2 quater · Registre coréen — PSIS")
    if executer([sys.executable, "scripts/import_psis.py", "--sans-iso"]).returncode != 0:
        print("  Import PSIS en échec — la veille continue avec le relevé précédent.")

    # La sentinelle se recalcule après E-Phy et PUBCRIS : c'est d'eux qu'elle
    # tire le statut réglementaire de chaque candidate. Elle ne télécharge rien
    # et son échec ne doit pas emporter la veille, qui est l'essentiel.
    titre("2 quinquies · Sentinelle — matières absentes du Maroc")
    if executer([sys.executable, "scripts/sentinelle.py"]).returncode != 0:
        print("  Sentinelle en échec — la veille continue sans elle.")

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
        "Données E-Phy - Anses · APVMA PUBCRIS · AGROFIT Brésil"
    )
    executer(["git", "add", "data/ephy.json", "data/apvma.json", "data/icama.json",
              "data/sentinelle.json", "data/sentinelle-vu.json",
              "data/coree.json", "data/bresil.json"])
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
