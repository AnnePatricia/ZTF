// src/types/superCorrection.ts
export type SCStatus = 'OPEN' | 'LOCKED' | 'CLOSED';
export type SCCommentType = 'TYPO' | 'DOCTRINAL' | 'STYLISTIQUE' | 'QUESTION' | 'VALIDATION_PASSAGE';
export type SCLanguage = 'EN' | 'FR' | 'BOTH';

// ✅ Publication Super Correction
export interface SuperCorrectionPublication {
  id: string;
  book_id: string;
  sc_status: SCStatus;
  validation_threshold: number;
  validation_count: number;
  language_scope: SCLanguage;
  published_at: string;
  locked_at?: string;
  closed_at?: string;
  unlock_reason?: string;
  published_by?: string;
  file_url?: string;
  created_at: string;
  updated_at?: string;
  // Relations
  book?: {
    id: string;
    ztf_id: string;
    title: string;
    theme: string;
    language: string;
    ztf_status: string;
    content?: string;
  };
  publisher?: {
    id: string;
    full_name: string;
    email: string;
  };
  correcteurs?: SCCorrecteur[];
  commentaires?: SCCommentaire[];
}

// ✅ Correcteur assigné
export interface SCCorrecteur {
  id: string;
  publication_id: string;
  user_id?: string;
  invite_email?: string;
  invite_token?: string;
  reading_progress: number;
  has_validated: boolean;
  validated_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  // Relations
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    department: string;
  };
}

// ✅ Commentaire
export interface SCCommentaire {
  id: string;
  publication_id: string;
  correcteur_id: string;
  contenu: string;
  type_commentaire: SCCommentType;
  texte_selectionne?: string;
  ancrage_position?: {
    paragraphe: number;
    debut: number;
    fin: number;
  };
  resolu: boolean;
  resolu_par?: string;
  resolu_at?: string;
  created_at: string;
  updated_at?: string;
  // Relations
  correcteur?: {
    id: string;
    invite_email?: string;
    user?: {
      id: string;
      full_name: string;
      email: string;
    };
  };
}

// ✅ Labels et couleurs
export const SC_STATUS_LABELS: Record<SCStatus, { label: string; color: string; icon: string }> = {
  OPEN: { 
    label: 'Ouvert', 
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', 
    icon: 'fa-lock-open' 
  },
  LOCKED: { 
    label: 'Verrouillé', 
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', 
    icon: 'fa-lock' 
  },
  CLOSED: { 
    label: 'Fermé', 
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200', 
    icon: 'fa-times-circle' 
  },
};

export const SC_COMMENT_TYPE_LABELS: Record<SCCommentType, { label: string; color: string; icon: string }> = {
  TYPO: { 
    label: 'Typographie', 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: 'fa-spell-check' 
  },
  DOCTRINAL: { 
    label: 'Doctrinal', 
    color: 'bg-red-100 text-red-800', 
    icon: 'fa-cross' 
  },
  STYLISTIQUE: { 
    label: 'Stylistique', 
    color: 'bg-blue-100 text-blue-800', 
    icon: 'fa-pen-fancy' 
  },
  QUESTION: { 
    label: 'Question', 
    color: 'bg-purple-100 text-purple-800', 
    icon: 'fa-question-circle' 
  },
  VALIDATION_PASSAGE: { 
    label: 'Validation', 
    color: 'bg-green-100 text-green-800', 
    icon: 'fa-check-circle' 
  },
};

// ✅ Types pour les invitations
export interface SCInviteRequest {
  publication_id: string;
  email: string;
  expires_in_days?: number;
}

export interface SCInviteLink {
  id: string;
  publication_id: string;
  email: string;
  token: string;
  expires_at: string;
  used_at?: string;
  used_by?: string;
  created_at: string;
  is_active: boolean;
}