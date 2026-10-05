export interface Emploi {
  culture: string;
  cible: string;
  doses: string[];
  dar: string[];
}

export interface Matiere {
  id: string;
  nom: string;
  categorie: string | null;
  cultures: string[];
  cibles: string[];
  emplois: Emploi[];
  nbLignes: number;
}

export interface Melange {
  id: string;
  composants: string[];
  composantIds: string[];
  categorie: string | null;
  cultures: string[];
  cibles: string[];
  emplois: Emploi[];
  nbLignes: number;
}

export interface Culture {
  id: string;
  nom: string;
  perimetres: string[];
  originePerimetres: "homologa" | "ajout-bpe" | "non-rattache";
  nbMatieres: number;
}

export interface Organisme {
  nom: string | null;
  siege: string | null;
  telephone: string | null;
  fax: string | null;
  emails: string[];
  agrement: { numero: string | null; date: string | null; expiration: string | null };
  couverture: string[];
}

export interface Corpus {
  meta: {
    nom: string;
    sourceIndex: string;
    genereIndex: string | null;
    sourceBpe: string | null;
    attributionBpe: string | null;
    majBpe: string | null;
    avertissement: string;
  };
  matieres: Matiere[];
  melanges: Melange[];
  cultures: Culture[];
  organismes: Organisme[];
}

export type Echeance = "expire" | "proche" | "valide" | "inconnue";
