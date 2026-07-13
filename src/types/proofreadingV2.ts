// src/types/proofreadingV2.ts

export type ProofreadingV2Status = 
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'bat_pending'
  | 'bat_validated'
  | 'bat_rejected'
  | 'signed'
  | 'archived'
  | 'rejected';

export type BatStatus = 'pending' | 'submitted' | 'validated' | 'rejected';

export type ObservationType = 
  | 'typo'
  | 'grammar'
  | 'layout'
  | 'image'
  | 'formatting'
  | 'content'
  | 'metadata';

export type ObservationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type SignatureType = 'bat' | 'final' | 'archive';

export interface ProofreadingV2Task {
  id: string;
  book_id: string;
  proofreading_v1_task_id: string | null;
  assigned_to: string | null;
  verified_by: string | null;
  status: ProofreadingV2Status;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  content: string | null;
  content_html: string | null;
  word_count: number;
  page_count: number;
  bat_status: BatStatus;
  bat_notes: string | null;
  bat_submitted_at: string | null;
  bat_validated_at: string | null;
  bat_validated_by: string | null;
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
  observations?: ProofreadingV2Observation[];
  signatures?: DigitalSignature[];
}

export interface ProofreadingV2Observation {
  id: string;
  task_id: string;
  user_id: string;
  page_number: number | null;
  observation_type: ObservationType;
  severity: ObservationSeverity;
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

export interface DigitalSignature {
  id: string;
  task_id: string;
  user_id: string;
  signature_type: SignatureType;
  signature_data: string;
  signature_image_url: string | null;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  
  user?: {
    id: string;
    full_name: string;
  };
}

export interface BatValidation {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  decision: 'approve' | 'reject' | 'request_changes';
  notes: string | null;
  signature_id: string | null;
  created_at: string;
}

export interface FinalArchive {
  id: string;
  book_id: string;
  proofreading_v2_task_id: string | null;
  archive_number: string;
  archive_date: string;
  archived_by: string;
  final_pdf_url: string | null;
  final_pdf_storage_path: string | null;
  metadata: any;
  checksum: string | null;
  archive_status: string;
  retention_years: number;
  notes: string | null;
  created_at: string;
  
  book?: {
    ztf_id: string;
    title: string;
  };
  archived_user?: {
    id: string;
    full_name: string;
  };
}

export const PROOFREADING_V2_STATUS_CONFIG: Record<ProofreadingV2Status, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-spinner' },
  submitted: { label: 'Soumis', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  bat_pending: { label: 'BAT en attente', color: 'bg-amber-500', icon: 'fa-file-signature' },
  bat_validated: { label: 'BAT validé', color: 'bg-green-500', icon: 'fa-check-double' },
  bat_rejected: { label: 'BAT rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
  signed: { label: 'Signé', color: 'bg-purple-500', icon: 'fa-signature' },
  archived: { label: 'Archivé', color: 'bg-indigo-500', icon: 'fa-archive' },
  rejected: { label: 'Rejeté', color: 'bg-red-600', icon: 'fa-ban' },
};

export const OBSERVATION_TYPE_CONFIG: Record<ObservationType, { label: string; color: string; bgColor: string; icon: string }> = {
  typo: { label: 'Typographie', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300', icon: 'fa-spell-check' },
  grammar: { label: 'Grammaire', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300', icon: 'fa-book' },
  layout: { label: 'Mise en page', color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300', icon: 'fa-layout' },
  image: { label: 'Image', color: 'text-pink-700', bgColor: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300', icon: 'fa-image' },
  formatting: { label: 'Formatage', color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300', icon: 'fa-paragraph' },
  content: { label: 'Contenu', color: 'text-teal-700', bgColor: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300', icon: 'fa-file-alt' },
  metadata: { label: 'Métadonnées', color: 'text-indigo-700', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300', icon: 'fa-tags' },
};

export const OBSERVATION_SEVERITY_CONFIG: Record<ObservationSeverity, { label: string; color: string; icon: string }> = {
  low: { label: 'Faible', color: 'text-gray-600', icon: 'fa-circle-info' },
  medium: { label: 'Moyenne', color: 'text-amber-600', icon: 'fa-triangle-exclamation' },
  high: { label: 'Élevée', color: 'text-orange-600', icon: 'fa-exclamation' },
  critical: { label: 'Critique', color: 'text-red-600', icon: 'fa-circle-xmark' },
};