// =====================================================
// STATUTS MEDIALIBRARY (État du fichier dans le repository)
// =====================================================
export type MediaLibraryStatus = 
  | 'libre'              // Fichier brut disponible pour traitement
  | 'traité'             // Fichier brut transcrit (éviter doublon)
  | 'transcrit'          // Version texte du fichier brut
  | 'projet_livre'       // Assemblage de transcriptions
  | 'relecture_1'        // Version validée relecture 1
  | 'relecture_2';       // Version finale relecture 2

// =====================================================
// STATUTS DOCUMENTS (État du traitement dans la chemise)
// =====================================================
export type DocumentStatus =
  | 'à_traiter'              // Document créé, en attente d'assignation
  | 'transcription_en_cours' // Assigné à un transcripteur
  | 'transcrit'              // Transcription achevée
  | 'projet_de_livre'        // Assemblage en cours
  | 'relecture_1_en_cours'   // Relecture 1 en traitement
  | 'relecture_1_validé'     // Relecture 1 terminée
  | 'relecture_2_en_cours'   // Relecture 2 en traitement
  | 'relecture_2_validé';    // Version finale

// =====================================================
// MAPPING DES STATUTS (Workflow + Progression)
// =====================================================
export const STATUS_TO_STEP: Record<DocumentStatus, 1 | 2 | 3 | 4 | 5> = {
  'à_traiter': 1,
  'transcription_en_cours': 2,
  'transcrit': 3,
  'projet_de_livre': 4,
  'relecture_1_en_cours': 4,
  'relecture_1_validé': 4,
  'relecture_2_en_cours': 5,
  'relecture_2_validé': 5,
};

export const STATUS_TO_PROGRESS: Record<DocumentStatus, number> = {
  'à_traiter': 0,
  'transcription_en_cours': 15,
  'transcrit': 30,
  'projet_de_livre': 50,
  'relecture_1_en_cours': 60,
  'relecture_1_validé': 70,
  'relecture_2_en_cours': 85,
  'relecture_2_validé': 100,
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  'à_traiter': '📥 À Traiter',
  'transcription_en_cours': '✍️ Transcription en Cours',
  'transcrit': '✅ Transcrit',
  'projet_de_livre': '📖 Projet de Livre',
  'relecture_1_en_cours': '👁️ Relecture 1 en Cours',
  'relecture_1_validé': '✅ Relecture 1 Validée',
  'relecture_2_en_cours': '👁️👁️ Relecture 2 en Cours',
  'relecture_2_validé': '🎉 Version Finale',
};

export const MEDIA_STATUS_LABELS: Record<MediaLibraryStatus, string> = {
  'libre': '🟢 Libre',
  'traité': '🟡 Traité',
  'transcrit': '🔵 Transcrit',
  'projet_livre': '🟣 Projet de Livre',
  'relecture_1': '🟠 Relecture 1',
  'relecture_2': '🟢 Relecture 2',
};

// =====================================================
// INTERFACES
// =====================================================
export interface Document {
  id: string;
  title: string;
  type: string;
  source: string;
  status: DocumentStatus;
  workflow_step: 1 | 2 | 3 | 4 | 5;
  progress: number;
  assigned_to?: string;
  tags: string[];
  file_url?: string;
  content?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFormData {
  title: string;
  type: string;
  source: string;
  status: DocumentStatus;
  workflow_step?: 1 | 2 | 3 | 4 | 5;
  progress?: number;
  assigned_to?: string;
  tags?: string[];
  file_url?: string;
  file?: File;
  media_file_id?: string;  // ✅ NOUVEAU : Lien vers MediaLibrary
  content?: string;  // ✅ AJOUTÉ
}

export interface DocumentMediaLink {
  id: string;
  document_id: string;
  media_file_id: string;
  media_status: MediaLibraryStatus;
  document_status: DocumentStatus;
  linked_at: string;
  linked_by: string;
}