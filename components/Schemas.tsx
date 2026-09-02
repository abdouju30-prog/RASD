/**
 * Schémas explicatifs.
 *
 * Ils remplacent des paragraphes : une hiérarchie de sources ou une structure
 * de dossier se comprend d'un coup d'œil, pas en trois phrases. Tout est en
 * SVG inline et en variables CSS, donc net à toute taille et cohérent avec le
 * thème.
 */

const T = {
  fg: "var(--fg)",
  mid: "var(--muted)",
  pale: "var(--muted-2)",
  bord: "var(--border-strong)",
  acc: "var(--accent)",
  crit: "var(--crit)",
  high: "var(--high)",
  info: "var(--info)",
  carte: "var(--card)",
};

function Fleche({ id, couleur }: { id: string; couleur: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 8 8"
      refX="7"
      refY="4"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L8,4 L0,8 z" fill={couleur} />
    </marker>
  );
}

/**
 * Hiérarchie des sources réglementaires.
 * Le point à faire passer : une seule source gouverne l'ONSSA.
 */
export function SchemaSources() {
  return (
    <svg viewBox="0 0 640 240" width="100%" role="img" aria-label="Hiérarchie des sources réglementaires">
      <defs>
        <Fleche id="f-acc" couleur={T.acc} />
        <Fleche id="f-pale" couleur={T.pale} />
        <Fleche id="f-info" couleur={T.info} />
      </defs>

      {/* UE — amont */}
      <rect x="14" y="16" width="150" height="46" rx="7" fill="none" stroke={T.bord} strokeDasharray="4 3" />
      <text x="89" y="36" textAnchor="middle" fontSize="12.5" fontWeight="600" fill={T.mid}>UE · PPDB</text>
      <text x="89" y="52" textAnchor="middle" fontSize="10" fill={T.pale}>approbation, échéances</text>

      {/* ANSES */}
      <rect x="14" y="96" width="150" height="52" rx="7" fill="var(--accent-fond)" stroke={T.acc} strokeWidth="1.5" />
      <text x="89" y="118" textAnchor="middle" fontSize="13" fontWeight="700" fill={T.acc}>ANSES · E-Phy</text>
      <text x="89" y="134" textAnchor="middle" fontSize="10" fill={T.acc}>statut France</text>

      {/* APVMA */}
      <rect x="14" y="180" width="150" height="46" rx="7" fill="none" stroke={T.info} strokeDasharray="4 3" />
      <text x="89" y="200" textAnchor="middle" fontSize="12.5" fontWeight="600" fill={T.info}>APVMA · Australie</text>
      <text x="89" y="216" textAnchor="middle" fontSize="10" fill={T.pale}>hors référentiel UE</text>

      {/* ONSSA */}
      <rect x="392" y="86" width="164" height="72" rx="8" fill={T.carte} stroke={T.fg} strokeWidth="2" />
      <text x="474" y="114" textAnchor="middle" fontSize="14.5" fontWeight="700" fill={T.fg}>ONSSA</text>
      <text x="474" y="132" textAnchor="middle" fontSize="10.5" fill={T.mid}>décision Maroc</text>
      <text x="474" y="147" textAnchor="middle" fontSize="10" fill={T.pale}>votre portefeuille</text>

      {/* flèches */}
      <path d="M89,66 L89,92" stroke={T.pale} strokeWidth="1.5" markerEnd="url(#f-pale)" fill="none" />
      <text x="97" y="84" fontSize="9.5" fill={T.pale}>alimente</text>

      <path d="M168,122 L386,122" stroke={T.acc} strokeWidth="2.5" markerEnd="url(#f-acc)" fill="none" />
      <text x="277" y="113" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={T.acc}>GOUVERNE</text>
      <text x="277" y="137" textAnchor="middle" fontSize="9.5" fill={T.pale}>retrait France ⇒ retrait Maroc attendu</text>

      <path d="M168,199 L330,199 L330,152" stroke={T.info} strokeWidth="1.5" strokeDasharray="5 3" markerEnd="url(#f-info)" fill="none" />
      <text x="252" y="192" textAnchor="middle" fontSize="10" fill={T.info}>recoupe · argument</text>
    </svg>
  );
}

/**
 * La boucle fermée du produit — ce que le ruban de navigation matérialise.
 */
export function SchemaChaine() {
  const etapes = [
    { n: "1", t: "Signal", d: "ce qui bouge" },
    { n: "2", t: "Matière active", d: "quelle molécule" },
    { n: "3", t: "Produits", d: "ce qui est touché" },
    { n: "4", t: "Alternative", d: "par quoi remplacer" },
    { n: "5", t: "Fournisseur", d: "qui a les études" },
    { n: "6", t: "Dossier", d: "quoi déposer" },
  ];
  const L = 96;
  const G = 8;
  return (
    <svg viewBox={`0 0 ${etapes.length * (L + G)} 118`} width="100%" role="img" aria-label="La boucle de décision en six étapes">
      <defs>
        <Fleche id="c-acc" couleur={T.acc} />
        <Fleche id="c-pale" couleur={T.pale} />
      </defs>
      {etapes.map((e, i) => {
        const x = i * (L + G);
        return (
          <g key={e.n}>
            <rect x={x} y="18" width={L} height="54" rx="7" fill={T.carte} stroke={T.bord} />
            <circle cx={x + 15} cy="33" r="8" fill="var(--accent-fond)" />
            <text x={x + 15} y="36.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill={T.acc}>{e.n}</text>
            <text x={x + 28} y="37" fontSize="11" fontWeight="600" fill={T.fg}>{e.t}</text>
            <text x={x + 10} y="59" fontSize="9.5" fill={T.pale}>{e.d}</text>
            {i < etapes.length - 1 && (
              <path d={`M${x + L + 1},45 L${x + L + G - 1},45`} stroke={T.acc} strokeWidth="1.5" markerEnd="url(#c-acc)" />
            )}
          </g>
        );
      })}
      {/* retour : le dossier déposé devient un nouveau signal à surveiller */}
      <path
        d={`M${(etapes.length - 1) * (L + G) + L / 2},76 L${(etapes.length - 1) * (L + G) + L / 2},100 L${L / 2},100 L${L / 2},76`}
        stroke={T.pale}
        strokeWidth="1.3"
        strokeDasharray="5 3"
        fill="none"
        markerEnd="url(#c-pale)"
      />
      <text x={(etapes.length * (L + G)) / 2} y="113" textAnchor="middle" fontSize="9.5" fill={T.pale}>
        le produit homologué revient sous surveillance
      </text>
    </svg>
  );
}

/**
 * Structure de l'Annexe 3-B et répartition de la charge.
 */
export function SchemaDossier() {
  return (
    <svg viewBox="0 0 640 228" width="100%" role="img" aria-label="Structure du dossier ONSSA Annexe 3-B">
      {/* Partie I */}
      <rect x="10" y="14" width="300" height="200" rx="8" fill="none" stroke={T.bord} />
      <text x="24" y="34" fontSize="10" fontWeight="700" fill={T.pale} letterSpacing="1">PARTIE I — 50 LIGNES</text>
      <text x="24" y="50" fontSize="12" fontWeight="600" fill={T.fg}>Préparation commerciale</text>
      {[
        ["1", "Identité", "10"],
        ["2", "Physico-chimie · BPL", "18"],
        ["3", "Toxicologie · BPL", "12"],
        ["4", "Méthodes d'analyse", "1"],
        ["5", "Données d'emploi", "7"],
        ["6", "Dossier biologique", "1"],
        ["7", "Classification", "1"],
      ].map(([n, t, c], i) => (
        <g key={n}>
          <rect x="24" y={60 + i * 17} width="272" height="14" rx="3" fill={i === 5 ? "color-mix(in srgb, var(--high) 12%, transparent)" : "var(--card-2)"} />
          <text x="30" y={70.5 + i * 17} fontSize="9.5" fill={T.mid}>{n}. {t}</text>
          <text x="290" y={70.5 + i * 17} fontSize="9.5" textAnchor="end" fill={T.pale} fontFamily="var(--mono)">{c}</text>
        </g>
      ))}

      {/* Partie II */}
      <rect x="330" y="14" width="300" height="200" rx="8" fill="none" stroke={T.bord} />
      <text x="344" y="34" fontSize="10" fontWeight="700" fill={T.pale} letterSpacing="1">PARTIE II — 28 LIGNES</text>
      <text x="344" y="50" fontSize="12" fontWeight="600" fill={T.fg}>Matière active</text>
      {[
        ["1", "Identité, impuretés", "10"],
        ["2", "Physico-chimie · BPL", "15"],
        ["3", "Méthodes d'analyse", "2"],
        ["4", "Classification", "1"],
      ].map(([n, t, c], i) => (
        <g key={n}>
          <rect x="344" y={60 + i * 17} width="272" height="14" rx="3" fill="var(--accent-fond)" />
          <text x="350" y={70.5 + i * 17} fontSize="9.5" fill={T.mid}>{n}. {t}</text>
          <text x="610" y={70.5 + i * 17} fontSize="9.5" textAnchor="end" fill={T.pale} fontFamily="var(--mono)">{c}</text>
        </g>
      ))}
      <text x="344" y="194" fontSize="9.5" fill={T.acc} fontWeight="600">
        Entièrement allégeable par référence
      </text>
      <text x="344" y="207" fontSize="9" fill={T.pale}>
        si la matière active est déjà homologuée au Maroc
      </text>
      <text x="24" y="194" fontSize="9.5" fill={T.high} fontWeight="600">
        Section 6 jamais allégeable
      </text>
      <text x="24" y="207" fontSize="9" fill={T.pale}>
        essais Maroc : 2 saisons, 2 régions
      </text>
    </svg>
  );
}

/**
 * Les quatre conditions d'une cible de prospection.
 */
export function SchemaSourcing() {
  const cond = [
    { n: "1", t: "Marché large", d: "usages et cultures homologués", c: T.acc },
    { n: "2", t: "Concurrence faible", d: "peu de détenteurs au Maroc", c: T.acc },
    { n: "3", t: "Fournisseur ONSSA", d: "générique déjà référencé", c: T.crit },
    { n: "4", t: "Avenir dégagé", d: "pas de retrait ANSES", c: T.acc },
  ];
  return (
    <svg viewBox="0 0 640 150" width="100%" role="img" aria-label="Les quatre conditions d'une cible de prospection">
      <defs>
        <Fleche id="s-acc" couleur={T.acc} />
      </defs>
      {cond.map((x, i) => (
        <g key={x.n}>
          <rect
            x={i * 150}
            y="16"
            width="138"
            height="62"
            rx="7"
            fill={x.c === T.crit ? "color-mix(in srgb, var(--crit) 7%, transparent)" : T.carte}
            stroke={x.c === T.crit ? T.crit : T.bord}
            strokeWidth={x.c === T.crit ? 1.5 : 1}
          />
          <text x={i * 150 + 12} y="36" fontSize="10" fontWeight="700" fill={x.c} fontFamily="var(--mono)">{x.n}</text>
          <text x={i * 150 + 28} y="36" fontSize="11.5" fontWeight="600" fill={T.fg}>{x.t}</text>
          <text x={i * 150 + 12} y="55" fontSize="9.5" fill={T.pale}>{x.d}</text>
          {x.c === T.crit && (
            <text x={i * 150 + 12} y="70" fontSize="9" fontWeight="600" fill={T.crit}>condition décisive</text>
          )}
        </g>
      ))}
      <path d="M300,96 L300,112" stroke={T.acc} strokeWidth="1.5" markerEnd="url(#s-acc)" fill="none" />
      <rect x="176" y="112" width="290" height="30" rx="7" fill="var(--accent-fond)" stroke={T.acc} />
      <text x="321" y="132" textAnchor="middle" fontSize="12" fontWeight="700" fill={T.acc}>
        Dossier me-too — 89 % allégeable
      </text>
    </svg>
  );
}

/**
 * Les deux gisements de fournisseurs, et ce qu'ils ouvrent.
 *
 * Le point à faire passer : seul l'index marocain ouvre la voie « me-too ».
 * Le registre australien élargit le choix de fabricants, il ne raccourcit
 * aucun délai.
 */
export function SchemaGisements() {
  return (
    <svg viewBox="0 0 640 210" width="100%" role="img" aria-label="Index ONSSA et registre australien : deux gisements de fournisseurs">
      <defs>
        <Fleche id="g-acc" couleur={T.acc} />
        <Fleche id="g-info" couleur={T.info} />
      </defs>

      {/* Index ONSSA */}
      <rect x="14" y="16" width="212" height="66" rx="8" fill="var(--accent-fond)" stroke={T.acc} strokeWidth="1.5" />
      <text x="120" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={T.acc}>Index ONSSA</text>
      <text x="120" y="57" textAnchor="middle" fontSize="10.5" fill={T.acc}>fournisseurs déjà au Maroc</text>
      <text x="120" y="72" textAnchor="middle" fontSize="10" fill={T.mid}>dossier technique déjà accepté</text>

      {/* Registre australien */}
      <rect x="14" y="122" width="212" height="66" rx="8" fill="none" stroke={T.info} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="120" y="146" textAnchor="middle" fontSize="13" fontWeight="700" fill={T.info}>Registre APVMA</text>
      <text x="120" y="163" textAnchor="middle" fontSize="10.5" fill={T.info}>détenteurs australiens</text>
      <text x="120" y="178" textAnchor="middle" fontSize="10" fill={T.mid}>fabricants inconnus au Maroc</text>

      <line x1="230" y1="49" x2="366" y2="49" stroke={T.acc} strokeWidth="1.5" markerEnd="url(#g-acc)" />
      <line x1="230" y1="155" x2="366" y2="155" stroke={T.info} strokeWidth="1.5" strokeDasharray="4 3" markerEnd="url(#g-info)" />

      {/* Ce que chaque voie ouvre */}
      <rect x="372" y="16" width="254" height="66" rx="8" fill={T.carte} stroke={T.fg} strokeWidth="1.5" />
      <text x="499" y="40" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={T.fg}>Voie me-too</text>
      <text x="499" y="57" textAnchor="middle" fontSize="10.5" fill={T.mid}>dossier par référence</text>
      <text x="499" y="72" textAnchor="middle" fontSize="10" fill={T.pale}>délai réduit</text>

      <rect x="372" y="122" width="254" height="66" rx="8" fill="none" stroke={T.bord} />
      <text x="499" y="146" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={T.mid}>Dossier complet</text>
      <text x="499" y="163" textAnchor="middle" fontSize="10.5" fill={T.mid}>études à fournir intégralement</text>
      <text x="499" y="178" textAnchor="middle" fontSize="10" fill={T.pale}>plus de choix, pas moins de travail</text>

      <text x="298" y="105" textAnchor="middle" fontSize="10" fill={T.pale}>
        une homologation australienne ne vaut rien devant l&rsquo;ONSSA
      </text>
    </svg>
  );
}
