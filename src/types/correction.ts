// src/types/correction.ts
import type { ZtfBook, ZtfUser } from './ztf';

export type CorrectionStatus =
  | 'pending'
  | 'in_progress'
  | 'pass_1_grammar'
  | 'pass_2_british'
  | 'pass_3_terminology'
  | 'submitted'
  | 'validated'
  | 'rejected';

export type CorrectionPass = 1 | 2 | 3;

export interface CorrectionTask {
  id: string;
  book_id: string | null;
  source_task_id: string | null; // rewritting_task_id
  corrected_content: string | null;
  original_content: string | null;
  status: CorrectionStatus;
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
  grammar_errors_fixed: number;
  british_english_applied: boolean;
  terminology_issues: string | null;
  manuscript_title: string | null;
  manuscript_theme: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  validated_at: string | null;
  rejected_at: string | null;
  // Relations
  book?: ZtfBook | null;
  source_task?: any;
  assigned_user?: ZtfUser | null;
  validator_1_user?: ZtfUser | null;
  validator_2_user?: ZtfUser | null;
  approved_user?: ZtfUser | null;
}

export interface CorrectionPassConfig {
  id: CorrectionPass;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const CORRECTION_PASSES: CorrectionPassConfig[] = [
  {
    id: 1,
    name: 'Grammaire & Orthographe',
    description: 'Correction des fautes d\'orthographe, grammaire, syntaxe et ponctuation',
    icon: 'fa-spell-check',
    color: 'bg-emerald-600',
  },
  {
    id: 2,
    name: 'British English',
    description: 'Application systématique du British English (organisation, colour, etc.)',
    icon: 'fa-flag',
    color: 'bg-blue-600',
  },
  {
    id: 3,
    name: 'Terminologie ZTF',
    description: 'Vérification de la cohérence terminologique et des mots-clés doctrinaux',
    icon: 'fa-book',
    color: 'bg-purple-600',
  },
];

export const CORRECTION_STATUS_CONFIG: Record<CorrectionStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  in_progress: { label: 'En cours', color: 'bg-blue-500', icon: 'fa-edit' },
  pass_1_grammar: { label: 'Passe 1: Grammaire', color: 'bg-emerald-600', icon: 'fa-spell-check' },
  pass_2_british: { label: 'Passe 2: British', color: 'bg-blue-600', icon: 'fa-flag' },
  pass_3_terminology: { label: 'Passe 3: Terminologie', color: 'bg-purple-600', icon: 'fa-book' },
  submitted: { label: 'Soumis', color: 'bg-orange-500', icon: 'fa-paper-plane' },
  validated: { label: 'Validé', color: 'bg-green-500', icon: 'fa-check-circle' },
  rejected: { label: 'Rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
};

// Règles British English courantes
export const BRITISH_ENGLISH_RULES = [
  { american: 'organization', british: 'organisation' },
  { american: 'realize', british: 'realise' },
  { american: 'recognize', british: 'recognise' },
  { american: 'color', british: 'colour' },
  { american: 'honor', british: 'honour' },
  { american: 'favor', british: 'favour' },
  { american: 'behavior', british: 'behaviour' },
  { american: 'neighbor', british: 'neighbour' },
  { american: 'center', british: 'centre' },
  { american: 'meter', british: 'metre' },
  { american: 'theater', british: 'theatre' },
  { american: 'analyze', british: 'analyse' },
  { american: 'catalog', british: 'catalogue' },
  { american: 'dialog', british: 'dialogue' },
  { american: 'program', british: 'programme' },
  { american: 'defense', british: 'defence' },
  { american: 'offense', british: 'offence' },
  { american: 'license (noun)', british: 'licence' },
  { american: 'practice (noun)', british: 'practice' },
  { american: 'judgment', british: 'judgement' },
  { american: 'aging', british: 'ageing' },
  { american: 'acknowledgment', british: 'acknowledgement' },
  { american: 'traveled', british: 'travelled' },
  { american: 'canceled', british: 'cancelled' },
  { american: 'modeled', british: 'modelled' },
];

// Mots-clés doctrinaux intouchables
export const DOCTRINAL_KEYWORDS = [
  'holiness', 'prayer', 'consecration', 'sanctification',
  'righteousness', 'redemption', 'salvation', 'grace',
  'faith', 'repentance', 'baptism', 'communion',
];