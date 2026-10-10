/**
 * Emblème Rasd (رصد, « veille ») : une feuille qui est aussi un œil. La nervure
 * traverse une pupille de radar ; le secteur vert est le signal détecté.
 * Même dessin que app/icon.svg (icône d'onglet).
 */
export function EmblemeRasd({ taille = 28, titre = "Rasd" }: { taille?: number; titre?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" role="img" aria-label={titre}>
      <rect width="64" height="64" rx="15" fill="#0d5c73" />
      <path d="M10 37 L4.5 42.5" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10 37 C14 19 39 9 59 24 C51 45 26 54 10 37 Z" fill="#ffffff" />
      <path d="M10 37 Q32 33 59 24" fill="none" stroke="#0d5c73" strokeWidth="2.2" strokeLinecap="round" />
      <g fill="none" stroke="#0d5c73" strokeWidth="1.3" strokeLinecap="round" opacity="0.45">
        <path d="M16 35.6 Q19 30 23.5 27.5" />
        <path d="M16 35.9 Q20.5 40 25 41.2" />
        <path d="M44.5 28.4 Q47 24 51 21.6" />
        <path d="M44.5 28.7 Q48.5 32.5 52 33" />
      </g>
      <circle cx="32" cy="31.8" r="9" fill="#0d5c73" />
      <circle cx="32" cy="31.8" r="5.4" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.35" />
      <path d="M32 31.8 L32 22.8 A9 9 0 0 1 40.2 28.1 Z" fill="#3ec48a" />
      <circle cx="32" cy="31.8" r="1.9" fill="#ffffff" />
      <circle cx="37.4" cy="26.9" r="1.4" fill="#ffffff" />
    </svg>
  );
}
