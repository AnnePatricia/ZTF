// src/utils/nomenclature.ts

export interface NomenclatureResult {
  valid: boolean;
  type?: string;
  year?: string;
  month?: string;
  day?: string;
  number?: string;
  extension?: string;
  department?: string;
  errors: string[];
  suggestions?: string;
}

// Préfixes officiels selon Section 3.1
export const ZTF_FILE_PREFIXES = {
  AUD: { dept: 'D1', label: 'Audio source', description: 'Fichier audio source' },
  TRANS: { dept: 'D2', label: 'Transcription', description: 'Transcription validée' },
  CLEAN: { dept: 'D3', label: 'Nettoyage', description: 'Texte brut nettoyé' },
  BOOK: { dept: 'D4', label: 'Manuscrit', description: 'Manuscrit structuré' },
  STYLE: { dept: 'D5', label: 'Style', description: 'Texte final auteur EN' },
  CORR: { dept: 'D6', label: 'Correction', description: 'Manuscrit anglais corrigé' },
  TRAD: { dept: 'D7', label: 'Traduction', description: 'Manuscrit français traduit' },
  BAT: { dept: 'D8', label: 'BAT', description: 'Fichier pré-presse final' },
} as const;

export type ZtfFilePrefix = keyof typeof ZTF_FILE_PREFIXES;

// Extensions autorisées par département
export const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  AUD: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
  TRANS: ['docx', 'doc', 'txt', 'pdf'],
  CLEAN: ['docx', 'doc', 'txt'],
  BOOK: ['docx', 'doc', 'pdf'],
  STYLE: ['docx', 'doc'],
  CORR: ['docx', 'doc'],
  TRAD: ['docx', 'doc'],
  BAT: ['pdf', 'epub', 'mobi', 'azw3'],
};

/**
 * Valide la nomenclature d'un fichier selon le format ZTF officiel
 * Format : [TYPE]_[ANNEE]_[MOIS]_[JOUR]_[NUMERO].[extension]
 * Exemple : TRANS_2026_05_20_042.docx
 */
export function validateNomenclature(filename: string): NomenclatureResult {
  const errors: string[] = [];
  const cleanFilename = filename.trim();

  // Regex stricte du format ZTF
  const regex = /^([A-Z]+)_(\d{4})_(\d{2})_(\d{2})_(\d+)\.(.+)$/;
  const match = cleanFilename.match(regex);

  if (!match) {
    errors.push(' Format invalide. Attendu : [TYPE]_[ANNEE]_[MOIS]_[JOUR]_[NUMERO].[extension]');
    errors.push('💡 Exemple correct : TRANS_2026_05_20_042.docx');
    return { valid: false, errors };
  }

  const [_, type, year, month, day, number, extension] = match;

  // 1. Vérifier le préfixe
  if (!(type in ZTF_FILE_PREFIXES)) {
    errors.push(`❌ Préfixe "${type}" non reconnu.`);
    errors.push(`💡 Préfixes valides : ${Object.keys(ZTF_FILE_PREFIXES).join(', ')}`);
  }

  // 2. Vérifier l'année
  const yearNum = parseInt(year);
  const currentYear = new Date().getFullYear();
  if (yearNum < 2020 || yearNum > currentYear + 1) {
    errors.push(`❌ Année ${year} hors plage valide (2020 - ${currentYear + 1})`);
  }

  // 3. Vérifier le mois
  const monthNum = parseInt(month);
  if (monthNum < 1 || monthNum > 12) {
    errors.push(`❌ Mois ${month} invalide (doit être entre 01 et 12)`);
  }

  // 4. Vérifier le jour
  const dayNum = parseInt(day);
  if (dayNum < 1 || dayNum > 31) {
    errors.push(`❌ Jour ${day} invalide (doit être entre 01 et 31)`);
  }

  // 5. Vérifier le numéro
  const numNum = parseInt(number);
  if (numNum < 1 || numNum > 99999) {
    errors.push(`❌ Numéro ${number} invalide (doit être entre 00001 et 99999)`);
  }

  // 6. Vérifier l'extension
  const extLower = extension.toLowerCase();
  if (type in ZTF_FILE_PREFIXES) {
    const allowed = ALLOWED_EXTENSIONS[type];
    if (!allowed.includes(extLower)) {
      errors.push(`❌ Extension ".${extLower}" non autorisée pour ${type}`);
      errors.push(`💡 Extensions autorisées : ${allowed.join(', ')}`);
    }
  }

  // 7. Vérifier la cohérence date
  if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
      errors.push(`❌ Date ${day}/${month}/${year} invalide`);
    }
  }

  const department = type in ZTF_FILE_PREFIXES ? ZTF_FILE_PREFIXES[type as ZtfFilePrefix].dept : undefined;

  return {
    valid: errors.length === 0,
    type,
    year,
    month,
    day,
    number,
    extension: extLower,
    department,
    errors,
    suggestions: errors.length === 0 ? `✅ Fichier destiné au département ${department} (${ZTF_FILE_PREFIXES[type as ZtfFilePrefix].label})` : undefined
  };
}

/**
 * Génère un nom de fichier ZTF valide
 */
export function generateZtfFilename(
  type: ZtfFilePrefix,
  number: number,
  date: Date = new Date()
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const num = String(number).padStart(5, '0');
  
  return `${type}_${year}_${month}_${day}_${num}`;
}

/**
 * Suggère une correction pour un nom de fichier invalide
 */
export function suggestCorrection(filename: string): string | null {
  const clean = filename.trim().toUpperCase();
  
  // Essayer de détecter les parties
  const parts = clean.split(/[\s._-]+/);
  if (parts.length < 5) return null;

  // Chercher un préfixe valide
  const prefix = Object.keys(ZTF_FILE_PREFIXES).find(p => 
    parts.some(part => part.startsWith(p))
  );
  if (!prefix) return null;

  // Chercher une année
  const year = parts.find(p => /^\d{4}$/.test(p) && parseInt(p) >= 2020);
  if (!year) return null;

  return `Format suggéré : ${prefix}_${year}_MM_JJ_NNNNN.ext`;
}