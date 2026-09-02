"""
Inférence du pays d'une société, à partir de son nom.

Partagé par les importateurs ONSSA et APVMA : les deux registres nomment les
mêmes fabricants, et un fournisseur ne se qualifie pas de la même façon selon
qu'il est indien, chinois ou européen.

L'inférence se fait en deux passes — mots-clés propres à une société, puis
suffixe juridique générique — et le résultat porte toujours un indicateur de
fiabilité. Le pays n'est jamais présenté comme un fait vérifié.
"""

# Pays où le sourcing générique est compétitif (cible de prospection).
PAYS_COUT_FAIBLE = {
    "Inde", "Chine", "Russie", "Mexique", "Colombie", "Turquie", "Brésil",
    "Taïwan", "Jordanie", "Chili", "Argentine", "Singapour",
}

# Passe 1 — sociétés identifiées. Le Japon passe AVANT la Chine : plusieurs
# sociétés japonaises portent un suffixe « Co., Ltd » qui, seul, évoque la Chine.
REGLES_PAYS = [
    ("Japon", [
        "MITSUI", "OAT AGRIO", "NIPPON SODA", "KUMIAI", "SUMITOMO CHEMICAL CO",
        "ISHIHARA SANGYO", "AGRO KANESHO", "KANESHO", "NIHON NOHYAKU", "NICHINO",
        "SUMI AGRO", "HOKKO", "SDS BIOTECH", "SHIN-ETSU", "SHIN ETSU",
        "MEIJI SEIKA", "NIPPON KAYAKU", "ARYSTA LIFESCIENCE JAPAN", "KAKEN",
    ]),
    ("Inde", [
        "SHARDA", "SHYAM", "GHARDA", "MEGHMANI", "RALLIS", "KRISHI", "UPL LIMITED",
        "INSECTICIDES (INDIA)", "COROMANDEL", "HERANBA", "TAGROS", "BHARAT",
        "NAGARJUNA", "PI INDUSTRIES", "DHANUKA", "WILLOWOOD", "BEST AGROLIFE",
        "AIMCO", "SULPHUR MILLS", "INDOFIL", "GSP CROP", "ATUL", "PARIJAT",
        "CRYSTAL CROP", "EXCEL INDUSTRIES", "SUMMIT AGRO INDIA", "KILPEST",
        "DEVIDAYAL", "NACL INDUSTRIES", "SUMITOMO CHEMICAL INDIA", "PARIKH",
        "CROPNOSYS INDIA", "AGRICH CROP", "INDIA LIMITED", "INDIA PRIVATE",
        "INDIA PESTICIDE", "INDIA PESTICIDES",
    ]),
    ("Chine", [
        "NANJING", "SHANDONG", "NINGBO", "JIANGSU", "ZHEJIANG", "HEBEI", "ANHUI",
        "SHANGHAI", "BEIJING", "SICHUAN", "HUBEI", "HUNAN", "JIANGXI", "GUANGDONG",
        "PILARQUIM", "ROTAM", "NGC AGROSCIENCES", "RAINBOW", "LIMIN", "BINNONG",
        "SINOCHEM", "HAILIR", "KINGQUENSON", "WYNCA", "YONGNONG", "XINGFA",
        "LIER CHEMICAL", "HUIFENG", "WEIFANG", "NUTRICHEM", "E-TONG CHEMICAL",
        "CAC NANTONG", "SUNJOY", "AGROPHARM CHINA",
    ]),
    ("Russie", ["AUGUST", "AVGUST", "SHCHELKOVO", "JOINT STOCK COMPANY", "JSC "]),
    ("Mexique", ["ALBAUGH MEXICO", "VELSIMEX", "TEKCHEM", "AGRICULTURA NACIONAL", "DRAGON"]),
    ("Colombie", ["BEQUISA", "BERNARDO QUIMICA", "INVESA", "COLJAP", "AGROSAVIA"]),
    ("Turquie", ["TARKIM", "HEKTAS", "SAFA TARIM", "AGROBEST GRUP", "DOKTOR TARSA"]),
    ("Brésil", ["OURO FINO", "ADAMA BRASIL", "NORTOX", "IHARABRAS"]),
    ("Taïwan", ["SINON", "TAIWAN"]),
    ("Corée du Sud", ["FARMHANNONG", "HANNONG", "DONGBU", "KYUNG NONG"]),
    ("Hongrie", ["BABOLNA"]),
    ("Jordanie", ["VAPCO"]),
    ("Chili", ["QUIMETAL"]),
    ("Singapour", ["PTE., LTD", "PTE. LTD", "PTE LTD"]),
    ("Espagne", [
        "INDUSTRIAS QUIMICAS DEL VALLES", "IQV", "SEIPASA", "LAINCO", "SIPCAM INAGRA",
        "INDUSTRIAL QUIMICA KEY", "IQK", "FUTURECO", "PROBELTE", "MASSO", "AFRASA",
        "KENOGARD", "TRADECORP", "SARABIA", "ORSANI", "ALMANDINE", "QEMETICA",
        "INGENIERIA INDUSTRIAL", "VIVAGRO", "PALLARES", "TRIS HISPANIA",
        "ADAMA AGRICULTURE ESPANA", "PROTEKTING", "AGROFINA", "CEV, SA",
    ]),
    ("Allemagne", [
        "BAYER AG", "BAYER CROPSCIENCE", "BASF SE", "BASF AGRICULTURAL", "COSACO",
        "NISSO CHEMICAL EUROPE", "DVA AGRO", "ALZCHEM", "EVONIK", "SAN AGROW",
        "AGROSTULIN", "CHEMINOVA DEUTSCHLAND",
    ]),
    ("Suisse", ["SYNGENTA CROP PROTECTION AG", "CORTEVA AGRISCIENCE INTERNATIONAL",
                "FMC IP TECHNOLOGY", "ANDERMATT BIOCONTROL"]),
    ("France", ["NUFARM SAS", "SUMITOMO CHEMICALS AGRO EUROPE", "DE SANGOSSE",
                "ACTION PIN", "AGRAUXINE", "TOTALENERGIES", "AGROFRESH HOLDING FRANCE",
                "ENVIRONMENTAL SCIENCE FR"]),
    ("Italie", ["CBC EUROPE", "MANICA", "SIPCAM ITALIA", "ISAGRO", "FINCHIMICA",
                "ICA INTERNATIONAL CHEMICALS", "DIACHEM", "TRIS INTERNATIONAL"]),
    ("Belgique", ["GLOBACHEM", "CERTIS BELCHIM", "BELCHIM", "TAMINCO", "BIOBEST",
                  "JANSSEN PHARMACEUTICA", "ARYSTA LIFESCIENCE BENELUX",
                  "FMC CHEMICAL SPRL", "EUROBROM", "MEBROM"]),
    ("Pays-Bas", ["AAKO", "BASF AGRO BV", "CERADIS", "ADAMA CELSIUS"]),
    ("Portugal", ["ASCENZA"]),
    ("Irlande", ["BARCLAY CHEMICALS"]),
    ("Danemark", ["CHEMINOVA", "FMC AGRICULTURE SOLUTION AS"]),
    ("Royaume-Uni", ["AGRICHEM UK", "FINE AGROCHEMICAL", "INTERFARM"]),
    ("États-Unis", ["CERTIS USA", "ALBAUGH LLC", "AMVAC", "GOWAN CROP", "VALENT",
                    "BRANDT CONSOLIDATED", "MARRONE BIO", "JH BIOTECH", "AGROFRESH FRUIT"]),
    ("Slovénie", ["ALBAUGH TKI"]),
    ("Tchéquie", ["BIOPREPARATY"]),
    ("Bulgarie", ["AGRIA SA"]),
    ("Maroc", ["CPCM", "COMPTOIR COMMERCIAL DES LUBRIFIANTS"]),
]

# Passe 2 — suffixes juridiques seuls. Indice faible : paysFiable=false.
SUFFIXES = [
    ("Inde", ["PVT LTD", "PRIVATE LIMITED"]),
    ("Chine", ["CO.,LTD", "CO., LTD", "CO. LTD", "CO.; LTD"]),
    ("Allemagne", ["GMBH"]),
    ("France", [" SAS", " SARL"]),
    ("Italie", [" SRL", " S.P.A", " SPA"]),
    ("Belgique", [" N.V", " NV", " SPRL"]),
    ("Pays-Bas", [" B.V", " BV"]),
    ("Espagne", [" S.L", " SL"]),
]

# Les cinq dernières ne sont pas phytosanitaires : elles apparaissent au
# registre australien, qui couvre aussi le vétérinaire.
MULTINATIONALES = ["SYNGENTA", "BAYER", "BASF", "CORTEVA", "FMC ", "UPL LIMITED",
                   "SUMITOMO", "NUFARM", "ADAMA", "MITSUI", "ZOETIS", "ELANCO",
                   "INTERVET", "VIRBAC", "NUTRIEN"]


def pays_societe(nom):
    """Infère le pays d'une société. Retourne (pays|None, fiable: bool).

    Vaut pour un fournisseur de l'index ONSSA comme pour un détenteur
    australien : c'est le nom qui parle, pas le registre qui l'héberge.
    """
    if not nom:
        return None, False
    u = nom.upper()
    for pays, motifs in REGLES_PAYS:
        if any(m in u for m in motifs):
            return pays, True
    for pays, motifs in SUFFIXES:
        if any(m in u for m in motifs):
            return pays, False
    return None, False


# Rétro-compatibilité : l'importateur ONSSA appelait ce nom-là.
pays_fournisseur = pays_societe


def est_multinationale(nom):
    u = (nom or "").upper()
    return any(m in u for m in MULTINATIONALES)


# « SHARDA AUSTRALIA PTY LTD », « SINOCHEM INTERNATIONAL AUSTRALIA PTY. LTD. » :
# l'entité inscrite au registre australien est australienne, mais le groupe qui
# la porte est indien ou chinois — et c'est le groupe qu'on veut sourcer. Le
# distinguer évite de faire passer une filiale pour la maison mère.
def est_filiale_australienne(nom):
    u = (nom or "").upper()
    return "AUSTRALIA" in u or "AUSTRALASIA" in u
