"""
Téléchargement partagé par les importateurs.

Pourquoi ce module existe : sur cette machine, le magasin de certificats
embarqué par Python est périmé et urllib échoue avec
« CERTIFICATE_VERIFY_FAILED: certificate has expired », alors que curl passe
sans difficulté. Les deux importateurs se cassaient donc pour une raison qui
n'a rien à voir avec eux.

Trois tentatives, de la plus propre à la plus dépannante :
  1. urllib avec le magasin de certifi, tenu à jour indépendamment de Python
  2. urllib avec le magasin par défaut
  3. curl, présent sur Windows 10+ comme sur les systèmes Unix

La vérification des certificats n'est JAMAIS désactivée : on télécharge des
données réglementaires, une source non authentifiée n'aurait aucune valeur.
"""

import shutil
import ssl
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

ENTETES = {"User-Agent": "Rasd/1.0 (veille reglementaire)"}


def _contexte_certifi():
    try:
        import certifi
    except ImportError:
        return None
    return ssl.create_default_context(cafile=certifi.where())


def telecharger(url: str, timeout: int = 600) -> bytes:
    """Récupère une URL en octets. Lève RuntimeError si tout échoue."""
    erreurs = []

    for libelle, ctx in (("certifi", _contexte_certifi()), ("défaut", None)):
        if libelle == "certifi" and ctx is None:
            continue
        try:
            req = urllib.request.Request(url, headers=ENTETES)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                return r.read()
        except Exception as e:
            erreurs.append(f"urllib/{libelle} : {e}")

    curl = shutil.which("curl")
    if curl:
        with tempfile.TemporaryDirectory() as d:
            cible = Path(d) / "telechargement"
            r = subprocess.run(
                [curl, "-sSL", "--fail", "-A", ENTETES["User-Agent"], "-o", str(cible), url],
                capture_output=True,
                text=True,
            )
            if r.returncode == 0 and cible.exists():
                return cible.read_bytes()
            erreurs.append(f"curl : {(r.stderr or '').strip() or f'code {r.returncode}'}")
    else:
        erreurs.append("curl : absent")

    raise RuntimeError("Téléchargement impossible.\n  " + "\n  ".join(erreurs))


def poster(url: str, champs: dict, referer: str = None, timeout: int = 120) -> str:
    """Poste un formulaire et rend la réponse décodée en UTF-8.

    Même stratégie que `telecharger`, dans l'autre sens : urllib d'abord,
    curl en secours. Les registres asiatiques n'exposent pas d'API — leurs
    données ne s'obtiennent qu'en soumettant le formulaire de recherche.
    """
    corps = urllib.parse.urlencode(champs, encoding="utf-8").encode("ascii")
    entetes = dict(ENTETES)
    entetes["Content-Type"] = "application/x-www-form-urlencoded"
    if referer:
        entetes["Referer"] = referer

    erreurs = []
    for libelle, ctx in (("certifi", _contexte_certifi()), ("défaut", None)):
        if libelle == "certifi" and ctx is None:
            continue
        try:
            req = urllib.request.Request(url, data=corps, headers=entetes)
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            erreurs.append(f"urllib/{libelle} : {e}")

    curl = shutil.which("curl")
    if curl:
        args = [curl, "-sSL", "--max-time", str(timeout), "-X", "POST",
                "-A", ENTETES["User-Agent"],
                "-H", "Content-Type: application/x-www-form-urlencoded"]
        if referer:
            args += ["-H", "Referer: " + referer]
        args += ["--data", corps.decode("ascii"), url]
        r = subprocess.run(args, capture_output=True)
        if r.returncode == 0 and r.stdout:
            return r.stdout.decode("utf-8", "replace")
        erreurs.append(f"curl : {(r.stderr or b'').decode('utf-8', 'replace').strip() or f'code {r.returncode}'}")
    else:
        erreurs.append("curl : absent")

    raise RuntimeError(f"POST impossible sur {url}\n  " + "\n  ".join(erreurs))
