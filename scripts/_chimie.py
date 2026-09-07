"""
Clé phonétique d'un nom de matière active — la règle unique de l'outil.

POURQUOI UNE CLÉ, ET PAS UNE RESSEMBLANCE.

Les registres nomment les substances chacun dans sa langue : l'index marocain
en français, les registres étrangers en ISO anglais, le catalogue russe en
cyrillique, AGROFIT en portugais. Il faut les rapprocher, et il ne faut pas les
deviner : un rapprochement flou sur une identité réglementaire produit de faux
fournisseurs, ce qui est pire que pas de fournisseur du tout.

La solution tient à une propriété de la nomenclature chimique : elle se
translittère RÉGULIÈREMENT d'une langue à l'autre. Chaque langue fait ses
substitutions, toujours les mêmes :

    anglais      russe            portugais       français
    chlor-       хлор- (khlor)    clor-           chlor-
    -phos        -фос  (-fos)     -fós            -phos
    cyper-       ципер- (tsiper)  ciper-          cyper-
    -methrin     -метрин          -metrina        -méthrine
    glyphosate   глифосат         glifosato       glyphosate

On réduit donc les deux noms à une forme où ces variantes se confondent, et on
exige l'ÉGALITÉ des clés. Aucun score, aucun seuil : deux noms se rapprochent
ou ne se rapprochent pas.

⚠️ UNE COLLISION DOIT FAIRE ÉCHOUER L'IMPORT. Si deux noms ISO distincts
produisent la même clé, la réduction est trop agressive et le rapprochement
n'est plus fiable : `verifier_collisions` est là pour ça, et tout importateur
qui se sert de cette clé doit l'appeler.

⚠️ CETTE CLÉ NE SERT QU'AU RAPPROCHEMENT. Elle n'est jamais affichée : les noms
d'origine restent partout, ce sont eux qui font foi.
"""

import re
import unicodedata

# L'ordre compte : les groupes longs se réduisent avant les lettres seules.
REDUCTIONS = [
    # ⚠️ « chl » EN PREMIER. L'anglais écrit « chlorantraniliprole », le
    # portugais « clorantraniliprole », le russe « хлор- » (khlor-). Réduit
    # après coup, « ch » devenait « h » puis « g » et l'anglais donnait
    # « glorantraniliprol » quand le portugais donnait « clorantraniliprol » :
    # les deux se manquaient. Les trois graphies se ramènent donc à « cl ».
    ("chl", "cl"), ("khl", "cl"),
    ("ph", "f"), ("kh", "h"), ("ch", "h"), ("th", "t"),
    # Le français garde le « que » latin là où le portugais écrit « ca » :
    # « hydrazide maleique » / « hidrazida malêica ».
    ("qu", "c"), ("q", "c"),
    ("x", "ks"), ("ts", "c"), ("k", "c"),
    ("ya", "a"), ("y", "i"), ("j", "i"), ("w", "v"), ("z", "s"),
    # ⚠️ « h » ET « g » DISPARAISSENT TOUS LES DEUX. Les trois langues traitent
    # le h aspiré différemment, et une seule substitution ne peut pas les
    # réconcilier :
    #
    #     anglais            portugais          russe
    #     cyhalothrin        cialotrina         (h muet, tombe)
    #     hexaconazole       hexaconazol        гексаконазол (h -> г, donc g)
    #
    # Le portugais laisse tomber le h, le russe le rend par un g. « h -> g »
    # servait le russe et faisait manquer au portugais la lambda-cyhalothrine
    # et la gamma-cyhalothrine ; « h supprimé » servait le portugais et faisait
    # perdre cinq matières russes. Supprimer les deux lettres sert les deux
    # langues : +2 côté brésilien, aucune perte côté russe, et toujours zéro
    # collision sur les noms ISO de l'index — ce que `verifier_collisions`
    # revérifie à chaque import.
    ("h", ""), ("g", ""),
]

# Le portugais et l'espagnol ajoutent une voyelle finale — « Abamectina »,
# « Glifosato » — que l'anglais n'a pas ; le russe la retire — « Глифосат ».
# On la retire des deux côtés.
VOYELLES_FINALES = "eoa"

# Mots de liaison des langues romanes, sans valeur chimique : « benzoato DE
# emamectina », « sal DE amônio ».
#
# ⚠️ LE CONTRE-ION EN FAIT PARTIE, PAS L'ACIDE. Chaque registre nomme le sel à
# sa façon — « Fosétyl-Aluminium » au Maroc, « fosetil » au Brésil ;
# « GLUFOSINATE-AMMONIUM » en ISO, « glufosinato - sal de amônio » en portugais.
# L'index marocain ne distingue pas les sels d'une même substance : les laisser
# tomber rapproche ces graphies. « acide » en revanche a dû rester : le retirer
# confondait GLYPHOSATE et GLYPHOSATE ACID, deux entrées distinctes de l'index —
# c'est `verifier_collisions` qui l'a refusé, et il avait raison.
LIAISONS = {
    "de", "do", "da", "of", "e", "et", "and", "the", "sal",
    "aluminium", "sodium", "potassium", "ammonium", "amonio", "calcium",
    "magnesium",
}


def sans_parenthese(nom: str) -> str:
    """Nom débarrassé de ce qui suit une parenthèse : sel, forme, teneur.

    « Глифосат (изопропиламинная соль) » et « Glifosato » désignent la même
    substance pour l'index marocain, qui ne distingue pas les sels.
    """
    return re.sub(r"\s*\(.*", "", nom or "").strip()


def cle_chimique(nom: str, translitterer=None) -> str:
    """Clé de rapprochement d'un nom de matière active.

    `translitterer` : fonction appliquée aux noms en écriture non latine. Le
    catalogue russe passe la sienne ; les registres en alphabet latin n'en ont
    pas besoin.
    """
    s = sans_parenthese(nom)
    if translitterer and re.search(r"[^\x00-\x7F]", s) and not re.search(r"[A-Za-z]", s):
        s = translitterer(s)
    # Accents du portugais, de l'espagnol et du français : « fósforo », « méthrine ».
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]", " ", s.lower())
    for a, b in REDUCTIONS:
        s = s.replace(a, b)

    # ⚠️ LES MOTS SE TRIENT. Les langues romanes inversent les composés et y
    # glissent une préposition : « emamectin benzoate » devient « benzoato de
    # emamectina ». Comparer les mots dans l'ordre faisait manquer toute cette
    # famille. Trier les mots et jeter les prépositions rend la comparaison
    # indifférente à l'ordre — vérifié sans collision sur les noms ISO de
    # l'index.
    mots = [m for m in s.split() if m and m not in LIAISONS]
    # Les doublons se réduisent par mot, après le découpage : « carfentrazone »
    # suivi de « etil » gardait sinon son double « e ».
    mots = [re.sub(r"(.)\1+", r"\1", m).rstrip(VOYELLES_FINALES) for m in mots]
    return "".join(sorted(m for m in mots if m))


def verifier_collisions(noms, translitterer=None):
    """[(nom, nom)] des paires qui produisent la même clé — vide si tout va bien."""
    vus, collisions = {}, []
    for n in noms:
        k = cle_chimique(n, translitterer)
        if not k:
            continue
        if k in vus:
            collisions.append((vus[k], n))
        vus[k] = n
    return collisions
