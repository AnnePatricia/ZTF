// src/types/cleaning.ts
import type { ZtfDepartment } from './ztf';

export type CleaningStatus = 
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'verified'
  | 'rejected';

export type AnnotationType = 
  | 'typo'
  | 'fact'
  | 'doctrine'
  | 'style'
  | 'question'
  | 'flag';

export interface CleaningTask {
  id: string;
  book_id: string;
  source_task_id: string | null;
  assigned_to: string | null;
  verified_by: string | null;
  status: CleaningStatus;
  original_content: string;
  cleaned_content: string | null;
  word_count_original: number;
  word_count_cleaned: number;
  checklist: CleaningChecklistItem[];
  annotations_count: number;
  notes: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations
  book?: {
    ztf_id: string;
    title: string;
    theme: string;
    language: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface CleaningAnnotation {
  id: string;
  task_id: string;
  user_id: string;
  type: AnnotationType;
  content: string;
  original_text: string | null;
  suggested_correction: string | null;
  position_start: number | null;
  position_end: number | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  
  user?: {
    full_name: string;
  };
}

export interface CleaningChecklistItem {
  id: string;
  label: string;
  category: 'orthographe' | 'ponctuation' | 'style' | 'factuel' | 'theologique' | 'structure';
  checked: boolean;
  required: boolean;
}

export const CLEANING_STATUS_CONFIG: Record<CleaningStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-spinner' },
  submitted: { label: 'Soumis', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  verified: { label: 'Validé', color: 'bg-green-500', icon: 'fa-check-circle' },
  rejected: { label: 'Rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
};

export const ANNOTATION_TYPE_CONFIG: Record<AnnotationType, { label: string; color: string; icon: string }> = {
  typo: { label: 'Faute', color: 'bg-red-500', icon: 'fa-spell-check' },
  fact: { label: 'Fait', color: 'bg-blue-500', icon: 'fa-info-circle' },
  doctrine: { label: 'Doctrine', color: 'bg-purple-500', icon: 'fa-book-bible' },
  style: { label: 'Style', color: 'bg-pink-500', icon: 'fa-pen-fancy' },
  question: { label: 'Question', color: 'bg-yellow-500', icon: 'fa-question-circle' },
  flag: { label: 'Signalement', color: 'bg-orange-500', icon: 'fa-flag' },
};

// Checklist par défaut selon le CDC
export const DEFAULT_CLEANING_CHECKLIST: CleaningChecklistItem[] = [
  { id: 'ortho', label: 'Orthographe et grammaire vérifiées', category: 'orthographe', checked: false, required: true },
  { id: 'ponct', label: 'Ponctuation cohérente et uniforme', category: 'ponctuation', checked: false, required: true },
  { id: 'noms', label: 'Noms propres uniformisés', category: 'style', checked: false, required: true },
  { id: 'biblique', label: 'Références bibliques vérifiées', category: 'factuel', checked: false, required: true },
  { id: 'factuel', label: 'Données factuelles vérifiées (dates, lieux, noms)', category: 'factuel', checked: false, required: true },
  { id: 'sous-theme', label: 'Changements de sous-thème marqués [---]', category: 'structure', checked: false, required: true },
  { id: 'sens', label: 'Sens original préservé (pas de modification doctrinale)', category: 'theologique', checked: false, required: true },
  { id: 'style-ztf', label: 'Style ZTF respecté', category: 'style', checked: false, required: true },
  { id: 'coherence', label: 'Cohérence terminologique', category: 'style', checked: false, required: true },
  { id: 'paragraphes', label: 'Paragraphes bien structurés', category: 'structure', checked: false, required: false },
];