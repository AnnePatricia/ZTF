// src/types/superCorrection.ts
// import type { ZtfBook } from './ztf';

export type SuperCorrectionStatus =
  | 'SUPER_CORRECTION_OPEN'
  | 'SUPER_CORRECTION_LOCKED'
  | 'SUPER_CORRECTION_CLOSED';

export type CommentType =
  | 'typo'
  | 'doctrinal'
  | 'stylistic'
  | 'question'
  | 'validation';

export type CorrectorRole =
  | 'admin'
  | 'correcteur_communautaire'
  | 'correcteur_invite';

export interface SuperCorrectionBook {
  id: string;
  book_id: string;
  status: SuperCorrectionStatus;
  validation_threshold: number;
  validation_count: number;
  language: 'EN' | 'FR' | 'BOTH';
  published_by: string;
  published_at: string;
  locked_at: string | null;
  closed_at: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  // Champs plats pour les données du livre
  book_title?: string;
  book_ztf_id?: string;
  book_theme?: string;
  book_language?: string;
  book_word_count?: number;
  invited_correctors?: InvitedCorrector[];
}

export interface InvitedCorrector {
  id: string;
  sc_book_id?: string;
  email: string;
  full_name?: string;
  invitation_token?: string;
  invited_at?: string;
  accepted_at?: string | null;
  expired_at?: string | null;
  validation_count?: number;
}

export interface SuperCorrectionComment {
  id: string;
  sc_book_id: string;
  corrector_id: string;
  corrector_name: string;
  corrector_email: string;
  comment_type: CommentType;
  selected_text: string;
  comment_text: string;
  paragraph_index?: number;
  character_offset?: number;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuperCorrectionValidation {
  id: string;
  sc_book_id: string;
  corrector_id: string;
  corrector_name: string;
  corrector_email: string;
  is_validated: boolean;
  validation_notes: string | null;
  reading_progress: number;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuperCorrectionConfig {
  validation_threshold: number;
  expiry_days: number;
  language: 'EN' | 'FR' | 'BOTH';
  invited_correctors: string[];
}

export const COMMENT_TYPE_CONFIG: Record<CommentType, { label: string; color: string; icon: string }> = {
  typo: { label: 'Erreur typographique', color: 'bg-yellow-100 text-yellow-800', icon: 'fa-spell-check' },
  doctrinal: { label: 'Erreur doctrinale', color: 'bg-red-100 text-red-800', icon: 'fa-cross' },
  stylistic: { label: 'Suggestion stylistique', color: 'bg-blue-100 text-blue-800', icon: 'fa-pen-fancy' },
  question: { label: 'Question', color: 'bg-purple-100 text-purple-800', icon: 'fa-question-circle' },
  validation: { label: 'Validation passage', color: 'bg-green-100 text-green-800', icon: 'fa-check-circle' },
};

export const SC_STATUS_CONFIG: Record<SuperCorrectionStatus, { label: string; color: string; icon: string }> = {
  SUPER_CORRECTION_OPEN: { label: 'Correction en cours', color: 'bg-blue-500', icon: 'fa-lock-open' },
  SUPER_CORRECTION_LOCKED: { label: 'Verrouillé', color: 'bg-green-500', icon: 'fa-lock' },
  SUPER_CORRECTION_CLOSED: { label: 'Fermé', color: 'bg-gray-500', icon: 'fa-times-circle' },
};