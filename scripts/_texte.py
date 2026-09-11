"""
Normalisation de texte partagée par les scripts d'import.

`slug()` était recopié à l'identique dans import_apvma.py, import_ephy.py et
import_onssa.py. Il est centralisé ici, comportement inchangé :
NFKD -> suppression des diacritiques -> [^a-zA-Z0-9]+ en tiret -> minuscules,
tronqué à 70 caractères.
"""

import re
import unicodedata


def slug(s):
    s = unicodedata.normalize("NFKD", str(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()[:70]
