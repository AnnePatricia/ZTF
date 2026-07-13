// src/types/ztf.ts
// =====================================================
// DÉPARTEMENTS
// =====================================================
export type ZtfDepartment = 'D0' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8';
export const DEPARTMENTS: ZtfDepartment[] = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];

export const DEPARTMENT_LABELS: Record<ZtfDepartment, string> = {
  D0: 'Base de Données',
  D1: 'Analyse et Préparation',
  D2: 'Transcription',
  D3: 'Nettoyage Éditorial',
  D4: 'Éditorialisation',
  D5: 'Réécriture & Style',
  D6: 'Correction Intelligente',
  D7: 'Traduction',
  D8: 'Pré-BAT & BAT'
};

// ✅ Nomenclature officielle (Section 3.1)
export const ZTF_NOMENCLATURE = {
  AUD: { dept: 'D1', label: 'Fichier audio source', example: 'AUD_2026_05_13_001.mp3' },
  TRANS: { dept: 'D2', label: 'Transcription validée', example: 'TRANS_2026_05_20_042.docx' },
  CLEAN: { dept: 'D3', label: 'Texte brut nettoyé', example: 'CLEAN_2026_05_21_042.docx' },
  BOOK: { dept: 'D4', label: 'Manuscrit structuré', example: 'BOOK_2026_0042_v1.docx' },
  STYLE: { dept: 'D5', label: 'Texte final auteur EN', example: 'STYLE_2026_0042_v2.docx' },
  CORR: { dept: 'D6', label: 'Manuscrit anglais corrigé', example: 'CORR_2026_0042_v3.docx' },
  TRAD: { dept: 'D7', label: 'Manuscrit français traduit', example: 'TRAD_2026_0042_v1_FR.docx' },
  BAT: { dept: 'D8', label: 'Fichier pré-presse final', example: 'BAT_2026_0042_EN.pdf' }
};

export function validateZtfNomenclature(filename: string): {
  valid: boolean;
  prefix?: string;
  error?: string;
} {
  const regex = /^(AUD|TRANS|CLEAN|BOOK|STYLE|CORR|TRAD|BAT)_(\d{4})_(\d{2})_(\d{2})_(\d{3})\.\w+$/;
  const match = filename.match(regex);
  if (!match) {
    return {
      valid: false,
      error: 'Format invalide. Attendu: [TYPE]_[ANNEE]_[MOIS]_[JOUR]_[NUMERO].[ext]'
    };
  }
  return { valid: true, prefix: match[1] };
}

// =====================================================
// STATUTS OFFICIELS (14 statuts - Section 3.2)
// =====================================================
export type ZtfBookStatus =
  | 'DRAFT'
  | 'TRANSCRIBED'
  | 'CLEANED'          // ✅ EXISTE
  | 'STRUCTURED'
  | 'REWRITTEN'
  | 'CORRECTED'
  | 'TRANSLATED'
  | 'BAT_PENDING'
  | 'BAT_APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED'
  | 'SUPER_CORRECTION_OPEN'
  | 'SUPER_CORRECTION_LOCKED'
  | 'SUPER_CORRECTION_CLOSED';

export const STATUS_CONFIG: Record<ZtfBookStatus, { label: string; percentage: number; color: string }> = {
  'DRAFT': { label: 'Brouillon', percentage: 0, color: 'bg-gray-500' },
  'TRANSCRIBED': { label: 'Transcrit', percentage: 15, color: 'bg-blue-500' },
  'CLEANED': { label: 'Nettoyé', percentage: 30, color: 'bg-cyan-500' },  // ✅ EXISTE
  'STRUCTURED': { label: 'Structuré', percentage: 50, color: 'bg-indigo-500' },
  'REWRITTEN': { label: 'Réécrit', percentage: 65, color: 'bg-pink-500' },
  'CORRECTED': { label: 'Corrigé', percentage: 75, color: 'bg-emerald-500' },
  'TRANSLATED': { label: 'Traduit', percentage: 88, color: 'bg-amber-500' },
  'BAT_PENDING': { label: 'BAT en attente', percentage: 95, color: 'bg-orange-500' },
  'BAT_APPROVED': { label: 'BAT approuvé', percentage: 98, color: 'bg-green-500' },
  'PUBLISHED': { label: 'Publié', percentage: 100, color: 'bg-green-600' },
  'ARCHIVED': { label: 'Archivé', percentage: 100, color: 'bg-gray-600' },
  'SUPER_CORRECTION_OPEN': { label: 'Super Correction ouvert', percentage: 0, color: 'bg-purple-500' },
  'SUPER_CORRECTION_LOCKED': { label: 'Super Correction verrouillé', percentage: 0, color: 'bg-purple-700' },
  'SUPER_CORRECTION_CLOSED': { label: 'Super Correction terminé', percentage: 0, color: 'bg-purple-900' },
};

// =====================================================
// RÔLES (18 rôles - Section 4.1)
// =====================================================
export type UserRole =
  | 'admin'
  | 'chef_D0' | 'chef_D2' | 'chef_D3' | 'chef_D4' | 'chef_D5' | 'chef_D6' | 'chef_D7' | 'chef_D8'
  | 'membre_D0' | 'membre_D2' | 'membre_D3' | 'membre_D4' | 'membre_D5' | 'membre_D6' | 'membre_D7' | 'membre_D8'
  | 'correcteur_communautaire';

export const ROLE_LABELS: Record<UserRole, string> = {
  'admin': 'Administrateur',
  'chef_D0': 'Chef Registre',
  'chef_D2': 'Chef Transcription',
  'chef_D3': 'Chef Nettoyage',
  'chef_D4': 'Chef Éditorialisation',
  'chef_D5': 'Chef Réécriture',
  'chef_D6': 'Chef Correction',
  'chef_D7': 'Chef Traduction',
  'chef_D8': 'Chef BAT',
  'membre_D0': 'Membre Registre',
  'membre_D2': 'Membre Transcription',
  'membre_D3': 'Membre Nettoyage',
  'membre_D4': 'Membre Éditorialisation',
  'membre_D5': 'Membre Réécriture',
  'membre_D6': 'Membre Correction',
  'membre_D7': 'Membre Traduction',
  'membre_D8': 'Membre BAT',
  'correcteur_communautaire': 'Correcteur communautaire',
};

// =====================================================
// TYPES DE FICHIERS ZTF (Section 3.1)
// =====================================================
export const ZTF_FILE_TYPES = {
  AUD: { dept: 'D1', label: 'Audio', description: 'Fichier audio source' },
  TRANS: { dept: 'D2', label: 'Transcription', description: 'Transcription validée' },
  CLEAN: { dept: 'D3', label: 'Nettoyage', description: 'Texte brut nettoyé' },
  BOOK: { dept: 'D4', label: 'Manuscrit', description: 'Manuscrit structuré' },
  STYLE: { dept: 'D5', label: 'Style', description: 'Texte final auteur EN' },
  CORR: { dept: 'D6', label: 'Correction', description: 'Manuscrit anglais corrigé' },
  TRAD: { dept: 'D7', label: 'Traduction', description: 'Manuscrit français traduit' },
  BAT: { dept: 'D8', label: 'BAT', description: 'Fichier pré-presse final' },
} as const;

export type ZtfFileType = keyof typeof ZTF_FILE_TYPES;
export const ZTF_FILE_TYPE_PREFIXES = Object.keys(ZTF_FILE_TYPES) as ZtfFileType[];

// =====================================================
// THÈMES OFFICIELS ZTF (Section 3.3)
// =====================================================
export const ZTF_THEMES = {
  FOI: { label: 'Foi', category: 'doctrinal' },
  PRIERE: { label: 'Prière', category: 'spiritual' },
  SAINTETE: { label: 'Sainteté', category: 'spiritual' },
  MISSION: { label: 'Mission', category: 'evangelism' },
  FAMILLE: { label: 'Famille', category: 'social' },
  JEUNESSE: { label: 'Jeunesse', category: 'youth' },
  SANTE: { label: 'Santé', category: 'social' },
  EDUCATION: { label: 'Éducation', category: 'social' },
  ECONOMIE: { label: 'Économie', category: 'social' },
  GOUVERNANCE: { label: 'Gouvernance', category: 'leadership' },
  EVANGELISATION: { label: 'Évangélisation', category: 'evangelism' },
  DISCIPLESHIP: { label: 'Discipulat', category: 'spiritual' },
  LEADERSHIP: { label: 'Leadership', category: 'leadership' },
  MINISTERE: { label: 'Ministère', category: 'ministry' },
  BIBLE: { label: 'Bible', category: 'doctrinal' },
  THEOLOGIE: { label: 'Théologie', category: 'doctrinal' },
  HISTOIRE: { label: 'Histoire', category: 'historical' },
  AUTRE: { label: 'Autre', category: 'other' },
} as const;

export type ZtfTheme = keyof typeof ZTF_THEMES;
export const ZTF_THEME_LABELS = Object.fromEntries(
  Object.entries(ZTF_THEMES).map(([key, value]) => [key, value.label])
) as Record<ZtfTheme, string>;

// =====================================================
// ENTITÉS PRINCIPALES
// =====================================================
export interface ZtfBook {
  id: string;
  ztf_id: string;
  title: string;
  subtitle?: string;
  theme: string;
  language: 'EN' | 'FR' | 'EN+FR';
  ztf_status: string;
  status: ZtfBookStatus;
  current_department: ZtfDepartment;
  responsible_id: string | null;
  responsible_name?: string;
  target_date?: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  published_date: string | null;
  sources_linked: string[];
  metadata: any;
}

export interface ZtfUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: ZtfDepartment | null;
  is_native_english: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface BookContent {
  id: string;
  book_id: string;
  department: ZtfDepartment;
  content: string;
  word_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface BookTransmission {
  id: string;
  book_id: string;
  from_department: ZtfDepartment;
  to_department: ZtfDepartment;
  interventions: string[];
  flagged_passages: string[];
  status: 'pending' | 'accepted' | 'rejected';
  signed_by: string | null;
  signed_at: string | null;
  notes: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_status: ZtfBookStatus | null;
  new_status: ZtfBookStatus | null;
  details: any;
  created_at: string;
}

// =====================================================
// SUPER CORRECTION (Section 8)
// =====================================================
export interface SuperCorrectionBook {
  id: string;
  book_id: string;
  status: 'OPEN' | 'LOCKED' | 'CLOSED';
  validation_threshold: number;
  validations_count: number;
  published_by: string | null;
  published_at: string;
  locked_at: string | null;
  closed_at: string | null;
  unlock_reason: string | null;
  language: 'EN' | 'FR' | 'EN+FR';
}

export interface SuperCorrectionComment {
  id: string;
  sc_book_id: string;
  user_id: string | null;
  comment_type: 'typo' | 'doctrinal' | 'style' | 'question' | 'validation';
  selected_text: string;
  comment: string;
  page_number: number | null;
  chapter: string | null;
  resolved: boolean;
  resolved_by: string | null;
  created_at: string;
}

export interface SuperCorrectionValidation {
  id: string;
  sc_book_id: string;
  user_id: string;
  validated_at: string;
  reading_progress: number;
}

export interface SuperCorrectionInvite {
  id: string;
  sc_book_id: string;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}