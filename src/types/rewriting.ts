// src/types/rewriting.ts
import type { ZtfBook, ZtfUser } from './ztf';

export type RewritingStatus =
  | 'pending'
  | 'in_progress'
  | 'pass_1_fluidity'
  | 'pass_2_clarity'
  | 'pass_3_coherence'
  | 'submitted'
  | 'validated'
  | 'rejected';

export type RewritingPass = 1 | 2 | 3;

export interface RewritingTask {
  id: string;
  book_id: string | null;
  source_task_id: string | null;
  
  rewritten_content: string | null;
  original_content: string | null;
  
  status: RewritingStatus;
  current_pass: number;
  
  assigned_to: string | null;
  assigned_at: string | null;
  started_at: string | null;
  
  validator_1: string | null;
  validator_1_validated_at: string | null;
  validator_1_notes: string | null;
  
  validator_2: string | null;
  validator_2_validated_at: string | null;
  validator_2_notes: string | null;
  
  approved_by: string | null;
  approved_at: string | null;
  
  word_count: number;
  manuscript_theme: string | null;
  manuscript_title: string | null;
  
  notes: string | null;
  doctrinal_issues: string | null;
  
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  rejected_at: string | null;
  
  // Relations
  book?: ZtfBook | null;
  source_task?: any; // EditorializationTask
  assigned_user?: ZtfUser | null;
  validator_1_user?: ZtfUser | null;
  validator_2_user?: ZtfUser | null;
  approved_user?: ZtfUser | null;
}

export interface RewritingPassConfig {
  id: RewritingPass;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const REWRITING_PASSES: RewritingPassConfig[] = [
  {
    id: 1,
    name: 'Fluidité',
    description: 'Assurer la fluidité naturelle du texte en anglais',
    icon: 'fa-water',
    color: 'bg-blue-600',
  },
  {
    id: 2,
    name: 'Clarté',
    description: 'Clarifier le message et la structure',
    icon: 'fa-lightbulb',
    color: 'bg-yellow-600',
  },
  {
    id: 3,
    name: 'Cohérence stylistique',
    description: 'Harmoniser avec le style ZTF',
    icon: 'fa-palette',
    color: 'bg-purple-600',
  },
];

export const REWRITING_STATUS_CONFIG: Record<RewritingStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-edit' },
  pass_1_fluidity: { label: 'Passe 1: Fluidité', color: 'bg-blue-600', icon: 'fa-water' },
  pass_2_clarity: { label: 'Passe 2: Clarté', color: 'bg-yellow-600', icon: 'fa-lightbulb' },
  pass_3_coherence: { label: 'Passe 3: Cohérence', color: 'bg-purple-600', icon: 'fa-palette' },
  submitted: { label: 'Soumis', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  validated: { label: 'Validé', color: 'bg-green-500', icon: 'fa-check-circle' },
  rejected: { label: 'Rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
};