// src/types/transcription.ts
import type { ZtfDepartment } from './ztf';

export type TranscriptionLevel = 1 | 2;

export type TranscriptionStatus = 
  | 'pending'       // En attente d'assignation
  | 'in_progress'   // En cours de transcription
  | 'submitted'     // Soumise au vérificateur
  | 'verified'      // Validée par vérificateur
  | 'rejected';     // Rejetée (retour au transcripteur)

export interface TranscriptionTask {
  id: string;
  book_id: string;
  assigned_to: string | null;
  verified_by: string | null;
  transcription_level: TranscriptionLevel;
  status: TranscriptionStatus;
  source_file_url: string | null;
  transcription_content: string | null;
  word_count: number;
  ai_used: boolean;
  ai_percentage: number;
  human_revision_done: boolean;
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
  verified_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface TranscriptionDraft {
  id: string;
  task_id: string;
  content: string;
  word_count: number;
  auto_saved: boolean;
  created_at: string;
}

export interface D2Transmission {
  id: string;
  task_id: string;
  book_id: string;
  from_user: string;
  to_department: ZtfDepartment;
  interventions: string[];
  flagged_passages: string[];
  source_references: string[];
  notes: string | null;
  signed_at: string;
  created_at: string;
}

export const TRANSCRIPTION_LEVEL_LABELS: Record<TranscriptionLevel, { label: string; description: string }> = {
  1: { 
    label: 'Niveau 1', 
    description: 'Transcription brute fidèle — mot pour mot, sans modification' 
  },
  2: { 
    label: 'Niveau 2', 
    description: 'Transcription légèrement nettoyée — ponctuation corrigée, hésitations mineures retirées' 
  },
};

export const TRANSCRIPTION_STATUS_CONFIG: Record<TranscriptionStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-spinner' },
  submitted: { label: 'Soumise', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  verified: { label: 'Validée', color: 'bg-green-500', icon: 'fa-check-circle' },
  rejected: { label: 'Rejetée', color: 'bg-red-500', icon: 'fa-times-circle' },
};