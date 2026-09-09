"""
Cultures et parasites coréens -> français.

POURQUOI UN GLOSSAIRE, ET PAS UNE TRADUCTION AUTOMATIQUE.

Le registre coréen décrit 29 462 couples culture × parasite : 429 cultures et
993 parasites. Les passer à un traducteur généraliste produirait des noms
plausibles et faux — « 차먼지응애 » deviendrait « acarien de poussière de thé »
là où il désigne le tarsonème (Polyphagotarsonemus latus). Sur un outil
phytosanitaire, un nom de ravageur faux oriente un traitement.

La nomenclature coréenne est heureusement TRÈS COMPOSITIONNELLE. Elle empile
des morphèmes dont chacun a un sens agronomique stable :

    흰   blanc      가루  poudre     병   maladie   ->  흰가루병   oïdium
    잿빛 gris-cendre 곰팡이 moisissure 병  maladie   ->  잿빛곰팡이병 pourriture grise
    복숭아 pêcher    혹    galle      진딧물 puceron ->  복숭아혹진딧물 puceron vert du pêcher

D'où trois niveaux, jamais confondus, et portés jusqu'à l'écran :

    exact    le terme entier a été lu et traduit à la main
    compose  reconstruit à partir de morphèmes connus
    brut     non traduit — le coréen reste, et c'est honnête

⚠️ LE NOM CORÉEN RESTE TOUJOURS AFFICHÉ à côté de la traduction. C'est lui qui
figure au registre, et lui seul qui permet de vérifier.
"""

import re

# ── Cultures ────────────────────────────────────────────────────────────────
# Traduites une par une. Les parenthèses du registre précisent une variété ou
# un synonyme — « 고추(단고추류 포함) », piment (poivrons doux inclus) : elles
# sont retirées avant recherche puis rendues telles quelles.
CULTURES = {
    "사과": "pommier", "벼": "riz", "배추": "chou chinois", "가지": "aubergine",
    "감귤": "agrumes", "오이": "concombre", "무": "radis", "고추": "piment",
    "들깨": "périlla", "배": "poirier", "양배추": "chou", "산딸기": "framboisier",
    "꽃양배추": "chou-fleur", "복숭아": "pêcher", "멜론": "melon",
    "양앵두": "cerisier", "자두": "prunier", "콩": "soja", "부추": "ciboule de Chine",
    "매실": "prunier japonais", "포도": "vigne", "블루베리": "myrtillier",
    "쑥갓": "chrysanthème comestible", "상추": "laitue", "잔디": "gazon",
    "대추": "jujubier", "유자": "yuzu", "당근": "carotte", "마늘": "ail",
    "복분자": "ronce coréenne", "살구": "abricotier", "양상추": "laitue pommée",
    "단고추류": "poivrons doux", "양미나리": "céleri", "아로니아": "aronia",
    "케일": "chou kale", "순무": "navet", "취나물": "aster comestible",
    "시금치": "épinard", "파": "ciboule", "딸기": "fraisier",
    "감자": "pomme de terre", "무화과": "figuier", "땅콩": "arachide",
    "오미자": "schisandra", "근대": "bette", "참외": "melon coréen",
    "호박": "courge", "갯기름나물": "peucédan", "아스파라거스": "asperge",
    "망고": "manguier", "인삼": "ginseng", "석류": "grenadier",
    "팥": "haricot azuki", "감": "kaki", "녹두": "haricot mungo",
    "청경채": "pak-choï", "양파": "oignon", "유채": "colza", "쪽파": "échalote",
    "뽕나무": "mûrier", "옥수수": "maïs", "참다래": "kiwi", "비름": "amarante",
    "아욱": "mauve", "단호박": "potimarron", "기계이앙벼": "riz repiqué",
    "더덕": "codonopsis", "비트": "betterave", "모과": "cognassier",
    "수박": "pastèque", "장미": "rosier", "고구마": "patate douce",
    "순무양배추": "chou-rave", "머위": "pétasite", "갓": "moutarde brune",
    "생강": "gingembre", "구기자": "lyciet", "참깨": "sésame",
    "치커리": "chicorée", "우엉": "bardane", "국화": "chrysanthème",
    "오렌지": "oranger", "강낭콩": "haricot commun", "동부": "dolique",
    "향미나리": "persil", "미나리": "œnanthe", "수수": "sorgho",
    "고려엉겅퀴": "cirse de Corée", "잇꽃": "carthame", "조": "millet des oiseaux",
    "소나무류": "pins", "여주": "margose", "겨자채": "moutarde",
    "마": "igname", "두릅나무": "aralia", "금감": "kumquat",
    "기장": "millet commun", "앵두": "cerisier de Chine", "토마토": "tomate",
    "거베라": "gerbera", "차즈기": "shiso", "차나무": "théier", "보리": "orge",
    "다채": "tatsoi", "참나물": "cryptotaenia", "토란": "taro", "완두": "pois",
    "단감": "kaki doux", "레몬": "citronnier", "플럼코트": "pluot",
    "카네이션": "œillet", "열무": "jeune radis", "곤달비": "ligulaire",
    "밀": "blé", "호밀": "seigle", "귀리": "avoine", "메밀": "sarrasin",
    "율무": "larme-de-Job", "담배": "tabac", "목화": "cotonnier",
    "해바라기": "tournesol", "삼": "chanvre", "뽕": "mûrier",
    "밤나무": "châtaignier", "호두나무": "noyer", "감나무": "plaqueminier",
    "대나무": "bambou", "버섯": "champignon de culture",
    "느타리버섯": "pleurote", "양송이버섯": "champignon de Paris",
    "표고버섯": "shiitaké", "팽이버섯": "énoki",
    "백합": "lis", "튤립": "tulipe", "난": "orchidée", "철쭉": "azalée",
    "무궁화": "hibiscus", "소나무": "pin", "잣나무": "pin coréen",
    "은행나무": "ginkgo", "느티나무": "zelkova", "벚나무": "cerisier à fleurs",
    "배나무": "poirier", "사과나무": "pommier", "포도나무": "vigne",
    "차": "thé", "커피": "caféier", "바나나": "bananier",
    "파인애플": "ananas", "아보카도": "avocatier", "올리브": "olivier",
    "브로콜리": "brocoli", "콜리플라워": "chou-fleur", "콜라비": "chou-rave",
    "샐러리": "céleri", "셀러리": "céleri", "파슬리": "persil",
    "루꼴라": "roquette", "바질": "basilic", "민트": "menthe",
    "쪽": "indigotier", "도라지": "platycodon", "당귀": "angélique",
    "황기": "astragale", "작약": "pivoine", "천궁": "ligustique",
    "지황": "rehmannia", "오이고추": "piment concombre",
    "방울토마토": "tomate cerise", "파프리카": "poivron",
    "애호박": "courgette", "쥬키니호박": "courgette", "동아": "courge cireuse",
    "박": "gourde", "수세미": "luffa", "고들빼기": "laitue amère",
    "씀바귀": "laiteron", "달래": "ail sauvage", "냉이": "capselle",
    "돌나물": "orpin", "곰취": "ligulaire de Fischer",
    "삼채": "allium hookeri", "야콘": "yacon", "돼지감자": "topinambour",
    "마카": "maca", "울금": "curcuma", "강황": "curcuma",
    "공심채": "liseron d'eau", "큰조롱": "cynanchum", "머루": "vigne sauvage",
    "용과": "pitaya", "신선초": "ashitaba", "패션프루트": "fruit de la passion",
    "호프": "houblon", "쑥": "armoise", "어수리": "berce de Corée",
    "심비디움": "cymbidium", "호두": "noyer", "다래": "kiwi de Sibérie",
    "갯개미자리": "spergulaire", "로케트": "roquette", "배초향": "agastache",
    "민들레": "pissenlit", "둥굴레": "sceau de Salomon", "산초": "poivrier du Sichuan",
    "취": "aster", "곤드레": "cirse", "방아": "agastache",
    "부지깽이나물": "erysimum", "삼백초": "saururus", "어리연꽃": "nymphoïde",
    "연": "lotus", "연근": "racine de lotus", "미역취": "solidage",
    "참취": "aster scaber", "엉겅퀴": "chardon", "왕고들빼기": "laitue de Corée",
    "방울양배추": "chou de Bruxelles", "적환무": "radis rouge",
    "청양고추": "piment fort", "꽈리고추": "piment doux",
    "메론": "melon", "참다래나무": "kiwi", "블랙베리": "mûrier des haies",
    "크랜베리": "canneberge", "라즈베리": "framboisier", "체리": "cerisier",
    "천도복숭아": "nectarinier", "자두나무": "prunier", "매실나무": "prunier japonais",
    "석류나무": "grenadier", "무화과나무": "figuier", "대추나무": "jujubier",
    "밤": "châtaigne", "잣": "pignon de pin", "은행": "noix de ginkgo",
    "더위지기": "armoise", "황칠나무": "dendropanax", "헛개나무": "hovenia",
    "오갈피나무": "acanthopanax", "가시오갈피": "éleuthérocoque",
    "구절초": "chrysanthème coréen", "감국": "chrysanthème sauvage",
    "결명자": "casse", "決明子": "casse", "차조기": "shiso",
    "고수": "coriandre", "딜": "aneth", "타임": "thym", "로즈마리": "romarin",
    "세이지": "sauge", "오레가노": "origan", "스테비아": "stévia",
    "허브": "plantes aromatiques", "화훼류": "plantes ornementales",
    "관엽식물": "plantes vertes", "분화류": "plantes en pot",
    "묘목": "jeunes plants", "묘": "plant", "육묘": "pépinière",
    "잔디밭": "gazon", "골프장": "terrain de golf",
    "산림": "forêt", "임업": "sylviculture", "가로수": "arbres d'alignement",
    "농경지": "terres cultivées", "비농경지": "zones non cultivées",
    "과수": "arbres fruitiers", "채소": "légumes", "엽채류": "légumes-feuilles",
    "근채류": "légumes-racines", "과채류": "légumes-fruits",
    "두류": "légumineuses", "서류": "tubercules", "맥류": "céréales à paille",
    "독활": "aralia cordata", "산수유": "cornouiller", "꽃기린": "euphorbe de Milii",
    "쑥부쟁이": "aster coréen", "맥문동": "ophiopogon", "감초": "réglisse",
    "삽주": "atractylodes", "그린빈": "haricot vert", "쌈추": "chou à salade",
    "안개초": "gypsophile", "수국": "hortensia", "천마": "gastrodia",
    "하수오": "renouée multiflore", "백수오": "cynanchum",
    "땅두릅": "aralia cordata", "백출": "atractylodes",
}

# Précisions de variété entre parenthèses, rendues telles quelles quand elles
# ne sont pas au dictionnaire.
CULTURES_PARENTHESE = {
    "단고추류 포함": "poivrons doux inclus",
    "브로콜리, 콜리플라워 포함": "brocoli et chou-fleur inclus",
    "체리": "cerise",
    "셀러리": "céleri",
    "방풍": "peucédan",
    "잎": "feuille",
    "씨": "graine",
    "오디": "mûre",
    "키위": "kiwi",
    "단감 포함": "kaki doux inclus",
    "복수박 포함": "pastèque sans pépins incluse",
    "쪽파 포함": "échalote incluse",
    "콜라비": "chou-rave",
    "금귤": "kumquat",
    "산약": "igname",
    "홍화": "carthame",
    "곤드레나물": "cirse",
    "파드득나물 포함": "cryptotaenia incluse",
    "비타민": "tatsoi",
    "방울토마토 포함": "tomate cerise incluse",
    "파슬리": "persil",
}

# ── Morphèmes de parasites ──────────────────────────────────────────────────
# L'ordre compte : les groupes longs se reconnaissent avant les courts, sans
# quoi « 총채벌레 » (thrips) se lirait « 벌레 » (insecte).
MORPHEMES = [
    # ── Maladies, du terme composé au générique ──────────────────────────
    ("잿빛곰팡이병", "pourriture grise"),
    ("잿빛무늬병", "moniliose"),
    ("흰가루병", "oïdium"),
    ("노균병", "mildiou"),
    ("탄저병", "anthracnose"),
    ("역병", "mildiou (Phytophthora)"),
    ("균핵병", "sclérotiniose"),
    ("흑색썩음균핵병", "pourriture noire sclérotique"),
    ("흰비단병", "pourriture blanche (Sclerotium)"),
    ("잎집무늬마름병", "rhizoctone des gaines"),
    ("라이족토니아마름병", "rhizoctone"),
    ("잎도열병", "pyriculariose foliaire"),
    ("목도열병", "pyriculariose du col"),
    ("이삭도열병", "pyriculariose de la panicule"),
    ("도열병", "pyriculariose"),
    ("흰잎마름병", "bactériose des feuilles blanches"),
    ("깜부기병", "charbon"),
    ("더뎅이병", "gale"),
    ("검은별무늬병", "tavelure"),
    ("붉은별무늬병", "rouille grillagée"),
    ("새눈무늬병", "anthracnose œil-d'oiseau"),
    ("겹무늬썩음병", "pourriture à taches concentriques"),
    ("겹둥근무늬병", "taches concentriques"),
    ("둥근무늬낙엽병", "taches rondes défoliantes"),
    ("점무늬낙엽병", "alternariose défoliante"),
    ("갈색점무늬병", "taches brunes"),
    ("검은점무늬병", "taches noires"),
    ("검은무늬병", "taches noires"),
    ("갈색무늬병", "cercosporiose"),
    ("깨씨무늬병", "helminthosporiose"),
    ("세균점무늬병", "taches bactériennes"),
    ("세균구멍병", "criblure bactérienne"),
    ("세균벼알마름병", "bactériose des grains"),
    ("점무늬병", "taches foliaires"),
    ("갈색잎마름병", "brûlure brune des feuilles"),
    ("잎마름병", "brûlure des feuilles"),
    ("줄기마름병", "chancre des tiges"),
    ("덩굴마름병", "chancre des lianes"),
    ("덩굴쪼김병", "fusariose des lianes"),
    ("동전마름병", "taches en pièce de monnaie"),
    ("잘록병", "fonte des semis"),
    ("무름병", "pourriture molle"),
    ("뿌리썩음병", "pourriture racinaire"),
    ("줄기썩음병", "pourriture de la tige"),
    ("이삭썩음병", "pourriture de la panicule"),
    ("검은썩음병", "pourriture noire"),
    ("썩음병", "pourriture"),
    ("푸른곰팡이병", "moisissure bleue"),
    ("잎곰팡이병", "cladosporiose"),
    ("곰팡이병", "moisissure"),
    ("시들음병", "flétrissement"),
    ("뿌리혹병", "hernie des racines"),
    ("궤양병", "chancre bactérien"),
    ("녹병", "rouille"),
    ("바이러스", "virus"),
    ("세균", "bactériose"),
    ("종자소독", "désinfection des semences"),
    ("검역해충", "organisme de quarantaine"),
    # ── Ravageurs ─────────────────────────────────────────────────────────
    ("점박이응애", "tétranyque à deux points"),
    ("차먼지응애", "tarsonème"),
    ("차응애", "acarien du théier"),
    ("귤응애", "acarien des agrumes"),
    ("뿌리응애", "acarien des racines"),
    ("사과응애", "acarien rouge du pommier"),
    ("응애류", "acariens"),
    ("응애", "acarien"),
    ("복숭아혹진딧물", "puceron vert du pêcher"),
    ("목화진딧물", "puceron du cotonnier"),
    ("조팝나무진딧물", "puceron de la spirée"),
    ("무테두리진딧물", "puceron du radis"),
    ("아카시아진딧물", "puceron de l'acacia"),
    ("기장테두리진딧물", "puceron du millet"),
    ("싸리수염진딧물", "puceron du lespédéza"),
    ("우엉수염진딧물", "puceron de la bardane"),
    ("양배추가루진딧물", "puceron cendré du chou"),
    ("사과혹진딧물", "puceron cendré du pommier"),
    ("파혹진딧물", "puceron de la ciboule"),
    ("꼬부랑진딧물", "puceron"),
    ("진딧물류", "pucerons"),
    ("진딧물", "puceron"),
    ("꽃노랑총채벌레", "thrips occidental des fleurs"),
    ("파총채벌레", "thrips du tabac"),
    ("오이총채벌레", "thrips du concombre"),
    ("대만총채벌레", "thrips de Taïwan"),
    ("볼록총채벌레", "thrips du théier"),
    ("총채벌레", "thrips"),
    ("담배가루이", "aleurode du tabac"),
    ("온실가루이", "aleurode des serres"),
    ("석류가루이", "aleurode du grenadier"),
    ("가루이", "aleurode"),
    ("아메리카잎굴파리", "mineuse américaine"),
    ("완두굴파리", "mineuse du pois"),
    ("파굴파리", "mineuse de la ciboule"),
    ("고자리파리", "mouche de l'oignon"),
    ("작은뿌리파리", "sciaride"),
    ("긴수염버섯파리", "mouche des champignons"),
    ("과실파리류", "mouches des fruits"),
    ("파리", "mouche"),
    ("파밤나방", "noctuelle de la betterave"),
    ("담배거세미나방", "noctuelle du tabac"),
    ("열대거세미나방", "légionnaire d'automne"),
    ("거세미나방류", "noctuelles terricoles"),
    ("도둑나방", "noctuelle du chou"),
    ("배추좀나방", "teigne des crucifères"),
    ("파좀나방", "teigne du poireau"),
    ("담배나방", "noctuelle du tabac"),
    ("왕담배나방", "noctuelle de la tomate"),
    ("복숭아순나방", "tordeuse orientale du pêcher"),
    ("복숭아심식나방", "carpocapse du pêcher"),
    ("복숭아명나방", "pyrale du pêcher"),
    ("애모무늬잎말이나방", "tordeuse"),
    ("잎말이나방", "tordeuse"),
    ("네눈쑥가지나방", "géomètre"),
    ("매미나방", "bombyx disparate"),
    ("미국흰불나방", "hyphantrie"),
    ("멸강나방", "légionnaire orientale"),
    ("조명나방", "pyrale du maïs"),
    ("혹명나방", "pyrale enrouleuse du riz"),
    ("흰띠명나방", "pyrale du haricot"),
    ("목화바둑명나방", "pyrale du cotonnier"),
    ("들깨잎말이명나방", "pyrale du périlla"),
    ("이화명나방", "pyrale du riz"),
    ("감꼭지나방", "teigne du kaki"),
    ("귤굴나방", "mineuse des agrumes"),
    ("사과굴나방", "mineuse du pommier"),
    ("굴나방", "mineuse"),
    ("뿔나방류", "gélechiides"),
    ("명나방", "pyrale"),
    ("나방", "noctuelle"),
    ("배추흰나비", "piéride du chou"),
    ("나비", "papillon"),
    ("썩덩나무노린재", "punaise brune marbrée"),
    ("톱다리개미허리노린재", "punaise à pattes en scie"),
    ("갈색날개노린재", "punaise à ailes brunes"),
    ("알락수염노린재", "punaise à antennes tachetées"),
    ("홍줄노린재", "punaise rayée"),
    ("애무늬고리장님노린재", "mirides"),
    ("노린재류", "punaises"),
    ("노린재", "punaise"),
    ("갈색날개매미충", "fulgore à ailes brunes"),
    ("미국선녀벌레", "flatide américain"),
    ("꽃매미", "fulgore tacheté"),
    ("매미충", "cicadelle"),
    ("애멸구", "cicadelle grise du riz"),
    ("벼멸구", "cicadelle brune du riz"),
    ("멸구", "delphacide"),
    ("뿌리혹선충", "nématode à galles"),
    ("소나무재선충", "nématode du pin"),
    ("선충", "nématode"),
    ("뽕나무깍지벌레", "cochenille du mûrier"),
    ("가루깍지벌leigh", "cochenille farineuse"),
    ("가루깍지벌레", "cochenille farineuse"),
    ("깍지벌레류", "cochenilles"),
    ("깍지벌레", "cochenille"),
    ("벼룩잎벌레", "altise"),
    ("무잎벌", "tenthrède du radis"),
    ("잎벌레", "chrysomèle"),
    ("큰검정풍뎅이", "hanneton noir"),
    ("풍뎅이", "hanneton"),
    ("벼물바구미", "charançon aquatique du riz"),
    ("바구미", "charançon"),
    ("꼬마배나무이", "psylle du poirier"),
    ("나무이", "psylle"),
    ("굼벵이", "ver blanc"),
    ("벌레", "insecte"),
    # ── Adventices ────────────────────────────────────────────────────────
    ("일년생잡초 및 다년생잡초", "adventices annuelles et vivaces"),
    ("일년생잡초", "adventices annuelles"),
    ("다년생잡초", "adventices vivaces"),
    ("잡초", "adventices"),
    ("화본과", "graminées"),
    ("광엽", "dicotylédones"),
    ("방동사니", "cypéracées"),
    # ── Ce qui n'est pas un ennemi : régulateurs et adjuvants ──────────────
    # Le registre range dans la même colonne l'objet du traitement, qu'il
    # s'agisse d'un ravageur ou d'un effet recherché. Les distinguer évite de
    # présenter « stimulation de croissance » comme un parasite.
    ("생장억제", "inhibition de croissance"),
    ("생장촉진", "stimulation de croissance"),
    ("과실비대", "grossissement des fruits"),
    ("과립비대", "grossissement des grains"),
    ("착색증진", "amélioration de la coloration"),
    ("저장성향상", "amélioration de la conservation"),
    ("무종자화", "parthénocarpie"),
    ("전착효과", "effet mouillant"),
    ("낙과방지", "prévention de la chute des fruits"),
    ("착과증진", "amélioration de la nouaison"),
    ("발근촉진", "stimulation de l'enracinement"),
    ("도복경감", "réduction de la verse"),
    ("적화", "éclaircissage des fleurs"),
    ("적과", "éclaircissage des fruits"),
    ("제경", "défanage"),
    ("건조촉진", "accélération du séchage"),
    # ── Ravageurs restants les plus fréquents ─────────────────────────────
    ("선녀벌레", "flatide"),
    ("빗살무늬미주메뚜기", "criquet"),
    ("섬서구메뚜기", "criquet à tête conique"),
    ("메뚜기", "criquet"),
    ("흰점박이꽃무지", "cétoine"),
    ("꽃무지", "cétoine"),
    ("솔수염하늘소", "longicorne du pin"),
    ("하늘소", "longicorne"),
    ("민달팽이", "limace"),
    ("달팽이", "escargot"),
    ("잎벌", "tenthrède"),
    ("굴나방류", "mineuses"),
    ("먼지응애", "tarsonème"),
    ("혹파리", "cécidomyie"),
    ("총채", "thrips"),
    ("나무좀", "scolyte"),
    ("솜벌레", "puceron lanigère"),
    ("면충", "puceron lanigère"),
    ("밤나방", "noctuelle"),
    ("자벌레", "arpenteuse"),
    ("애벌레", "chenille"),
    ("유충", "larve"),
    ("성충", "adulte"),
    ("숲아기깔다구", "chironome"),
    ("깔다구", "chironome"),
    ("귀뚜라미", "grillon"),
    ("복숭아씨살이좀벌", "chalcidien du noyau de pêche"),
    ("좀벌", "chalcidien"),
    ("땅강아지", "courtilière"),
    ("풀무치", "criquet migrateur"),
    ("방아벌레", "taupin"),
    ("착립증진", "amélioration de la nouaison"),
    ("연화촉진", "accélération du ramollissement"),
    ("숙기촉진", "accélération de la maturité"),
    ("건조효과", "effet desséchant"),
    ("매트형성촉진", "formation du tapis racinaire"),
    ("신장억제", "inhibition de l'élongation"),
]

# Qualificatifs qui précisent sans changer la nature.
QUALIFICATIFS = {"류": "", "및": "et"}


def _sans_parenthese(nom):
    """« 고추(단고추류 포함) » -> (« 고추 », « 단고추류 포함 »)."""
    if "(" in nom and nom.endswith(")"):
        base, _, reste = nom.partition("(")
        return base.strip(), reste[:-1].strip()
    return nom.strip(), None


def culture(nom):
    """(français, niveau) pour une culture. niveau : exact | compose | brut."""
    base, precision = _sans_parenthese(nom)
    fr = CULTURES.get(base)
    if fr is None:
        # Un composé du type « 파(쪽파 포함) » où seule la base est connue.
        for k in sorted(CULTURES, key=len, reverse=True):
            if base.endswith(k) and len(base) > len(k):
                fr = CULTURES[k]
                break
    if fr is None:
        return nom, "brut"
    niveau = "exact" if CULTURES.get(base) else "compose"
    if precision:
        p = CULTURES_PARENTHESE.get(precision)
        if p:
            return f"{fr} ({p})", niveau
        return f"{fr} ({precision})", "compose"
    return fr, niveau


def _pluriel(fr):
    """« hanneton » -> « hannetons ». Le suffixe « 류 » marque le groupe."""
    if fr.endswith(("s", "x")):
        return fr
    return fr + "s"


def parasite(nom):
    """(français, niveau) pour un parasite, une adventice ou un effet visé."""
    n = nom.strip()

    # ⚠️ LES PARENTHÈSES PRÉCISENT, ELLES NE REMPLACENT PAS. « 일년생잡초(화본과) »
    # est « adventices annuelles (graminées) » : traduire les deux morceaux et
    # les recoller vaut mieux que d'abandonner le terme entier.
    base, precision = _sans_parenthese(n)
    if precision is not None:
        fr, niv = parasite(base)
        parts = [parasite(x.strip())[0] for x in precision.split(",") if x.strip()]
        detail = ", ".join(parts)
        if niv == "brut" and not parts:
            return n, "brut"
        return f"{fr} ({detail})" if detail else fr, "compose" if niv != "brut" else "compose"

    # ⚠️ « 류 » MARQUE LE PLURIEL, pas une espèce. « 풍뎅이류 » est le groupe des
    # hannetons : sans cette règle, cent quarante termes restaient bruts.
    if n.endswith("류") and len(n) > 2:
        fr, niv = parasite(n[:-1])
        if niv != "brut":
            return _pluriel(fr), "compose"

    for k, v in MORPHEMES:
        if n == k:
            return v, "exact"
    # Composition : on reconnaît le morphème le plus long présent, et on garde
    # le préfixe coréen entre parenthèses quand il n'est pas traduisible.
    for k, v in MORPHEMES:
        if n.endswith(k) and len(n) > len(k):
            prefixe = n[: -len(k)]
            hote = CULTURES.get(prefixe)
            if hote:
                return f"{v} du {hote}", "compose"
            return f"{v} ({prefixe})", "compose"
    if n.endswith("병"):
        return f"maladie ({n[:-1]})", "compose"
    return n, "brut"


# ── Stades, cadences et méthodes ────────────────────────────────────────────
# Ces trois colonnes suivent des motifs réguliers : « 수확N일전 » = N jours avant
# récolte, « N회 » = N applications. Les traduire par règle plutôt que par
# dictionnaire couvre aussi les valeurs rares.
STADES = {
    "발생초기": "début d'infestation",
    "발병초기": "début des symptômes",
    "잡초발생기": "levée des adventices",
    "정식기": "plantation",
    "파종기": "semis",
    "이앙기": "repiquage",
    "이앙당일": "jour du repiquage",
    "파종·정식기": "semis ou plantation",
    "파종(정식)기": "semis (plantation)",
    "검역시": "au contrôle phytosanitaire",
    "생육기": "végétation",
    "수확기": "récolte",
    "휴면기": "repos végétatif",
    "개화기": "floraison",
    "수확직후": "juste après récolte",
}

METHODES = {
    "경엽처리": "traitement foliaire",
    "토양처리": "traitement du sol",
    "관주처리": "arrosage au pied",
    "육묘상처리": "traitement en pépinière",
    "수면처liage": "traitement à la surface de l'eau",
    "수면처리": "traitement à la surface de l'eau",
    "나무주사": "injection dans le tronc",
    "침지처리": "trempage",
    "토양혼화": "incorporation au sol",
    "훈증처리": "fumigation",
    "분무처리": "pulvérisation",
    "균상표면처리": "traitement de surface du substrat",
    "무인항공": "drone",
    "ULV": "ULV",
    "육묘상": "pépinière",
}


def stade(v):
    """« 수확7일전 » -> « 7 j avant récolte ». (français, niveau)."""
    n = (v or "").strip()
    if not n or n == "-":
        return None, "brut"
    if n in STADES:
        return STADES[n], "exact"
    m = re.fullmatch(r"수확\s*(\d+)\s*일전", n)
    if m:
        return f"{m.group(1)} j avant récolte", "exact"
    m = re.fullmatch(r"정식\s*(\d+)\s*주전", n)
    if m:
        return f"{m.group(1)} sem. avant plantation", "exact"
    m = re.fullmatch(r"파종\s*(\d+)\s*일전", n)
    if m:
        return f"{m.group(1)} j avant semis", "exact"
    return n, "brut"


def cadence(v):
    """« 2회 » -> « 2 applications » ; « 연1회 » -> « 1 par an »."""
    n = (v or "").strip()
    if not n or n == "-":
        return None, "brut"
    m = re.fullmatch(r"연\s*(\d+)\s*회", n)
    if m:
        return f"{m.group(1)} par an", "exact"
    m = re.fullmatch(r"(\d+)\s*회", n)
    if m:
        return f"{m.group(1)} application" + ("s" if m.group(1) != "1" else ""), "exact"
    return n, "brut"


def dilution(v):
    """« 2000배 » -> « 1:2000 ». Le registre coréen raisonne en dilution."""
    n = (v or "").strip()
    if not n or n == "-":
        return None, "brut"
    m = re.fullmatch(r"([\d,\.]+)\s*배", n)
    if m:
        return f"1:{m.group(1)}", "exact"
    return n, "brut"


def methode(v):
    """« 경엽처리(무인항공) » -> « traitement foliaire (drone) »."""
    n = (v or "").strip()
    if not n or n == "-":
        return None, "brut"
    base, precision = _sans_parenthese(n)
    fr = METHODES.get(base)
    if fr is None:
        return n, "brut"
    if precision:
        return f"{fr} ({METHODES.get(precision, precision)})", "compose"
    return fr, "exact"


def traduire(nom, genre):
    """genre : « culture » ou « parasite »."""
    return culture(nom) if genre == "culture" else parasite(nom)
