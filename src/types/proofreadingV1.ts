// src/types/proofreadingV1.ts

export type ProofreadingV1Status = 
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'locked'
  | 'verified'
  | 'rejected';

export type ResidualErrorType = 
  | 'typo'
  | 'grammar'
  | 'punctuation'
  | 'style'
  | 'formatting'
  | 'factual'
  | 'theological'
  | 'layout';

export type ResidualErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ProofreadingV1Task {
  id: string;
  book_id: string;
  super_correction_task_id: string | null;
  plan_id: string | null;
  assigned_to: string | null;
  verified_by: string | null;
  status: ProofreadingV1Status;
  content: string;
  content_html: string | null;
  word_count: number;
  page_count: number;
  residual_errors_count: number;
  validation_count: number;
  max_validations: number;
  is_locked: boolean;
  locked_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  
  book?: {
    ztf_id: string;
    title: string;
    theme: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  errors?: ResidualError[];
}

export interface ResidualError {
  id: string;
  task_id: string;
  user_id: string;
  error_type: ResidualErrorType;
  severity: ResidualErrorSeverity;
  page_number: number | null;
  paragraph_number: number | null;
  original_text: string | null;
  corrected_text: string | null;
  description: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  
  user?: {
    id: string;
    full_name: string;
  };
}

export interface ProofreadingV1Validation {
  id: string;
  task_id: string;
  user_id: string;
  action: 'validate' | 'reject' | 'lock';
  error_count: number;
  resolved_count: number;
  notes: string | null;
  created_at: string;
}

export const PROOFREADING_V1_STATUS_CONFIG: Record<ProofreadingV1Status, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-spinner' },
  submitted: { label: 'Soumis', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  locked: { label: 'Verrouillé', color: 'bg-amber-600', icon: 'fa-lock' },
  verified: { label: 'Validé', color: 'bg-green-500', icon: 'fa-check-circle' },
  rejected: { label: 'Rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
};

export const RESIDUAL_ERROR_TYPE_CONFIG: Record<ResidualErrorType, { label: string; color: string; bgColor: string; icon: string }> = {
  typo: { label: 'Typographie', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300', icon: 'fa-spell-check' },
  grammar: { label: 'Grammaire', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300', icon: 'fa-book' },
  punctuation: { label: 'Ponctuation', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300', icon: 'fa-comma' },
  style: { label: 'Style', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300', icon: 'fa-pen-fancy' },
  formatting: { label: 'Mise en forme', color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300', icon: 'fa-paragraph' },
  factual: { label: 'Factual', color: 'text-pink-700', bgColor: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300', icon: 'fa-fact-check' },
  theological: { label: 'Théologique', color: 'text-indigo-700', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300', icon: 'fa-book-bible' },
  layout: { label: 'Mise en page', color: 'text-teal-700', bgColor: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300', icon: 'fa-layout' },
};

export const RESIDUAL_ERROR_SEVERITY_CONFIG: Record<ResidualErrorSeverity, { label: string; color: string; icon: string }> = {
  low: { label: 'Faible', color: 'text-gray-600', icon: 'fa-circle-info' },
  medium: { label: 'Moyenne', color: 'text-amber-600', icon: 'fa-triangle-exclamation' },
  high: { label: 'Élevée', color: 'text-orange-600', icon: 'fa-exclamation' },
  critical: { label: 'Critique', color: 'text-red-600', icon: 'fa-circle-xmark' },
};