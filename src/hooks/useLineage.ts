// =====================================================
// HOOK: useLineage
// Description: Exploite la fonction get_raw_file_lineage()
// pour afficher toute la lignée éditoriale d'un fichier brut
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

export interface RawFileData {
  id: string;
  file_name: string;
  file_type: 'pdf' | 'audio' | 'image';
  file_size: number;
  status: string | null;
  is_linked: boolean | null;
  linked_documents_count: number | null;
  imported_by: string | null;
  imported_at: string;
  created_at: string;
}

export interface TranscriptionData {
  id: string;
  title: string;
  status: string;
  workflow_step: number;
  progress: number;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookProjectData {
  id: string;
  title: string;
  status: string;
  workflow_step: number;
  progress: number;
  author: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProofreadingV1Data {
  id: string;
  status: string;
  workflow_step: number;
  progress: number;
  reviewer_id: string | null;
  reviewer_name: string | null;
  notes: string | null;
  corrections_count: number;
  created_at: string;
  updated_at: string;
  book_project_id: string | null;
}

export interface ProofreadingV2Data {
  id: string;
  status: string;
  workflow_step: number;
  progress: number;
  reviewer_id: string | null;
  reviewer_name: string | null;
  notes: string | null;
  corrections_count: number;
  created_at: string;
  updated_at: string;
  proofreading_v1_id: string | null;
}

export interface LinkedDocumentData {
  id: string;
  title: string;
  status: string;
  workflow_step: number;
  progress: number;
  assigned_to: string | null;
  media_status: string;
  document_status: string;
  linked_at: string;
}

export interface LineageData {
  raw_file: RawFileData | null;
  transcriptions: TranscriptionData[];
  book_projects: BookProjectData[];
  proofreading_v1: ProofreadingV1Data[];
  proofreading_v2: ProofreadingV2Data[];
  linked_documents: LinkedDocumentData[];
  global_progress: number;
}

export interface UseLineageReturn {
  // Données
  lineage: LineageData | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchLineage: (rawFileId: string) => Promise<void>;
  refreshLineage: () => Promise<void>;
  getGlobalProgress: (rawFileId: string) => Promise<number>;
  getLineageSummary: () => string;
  canAdvanceToNextStep: () => boolean;
  getNextStep: () => string | null;
}

// =====================================================
// HOOK
// =====================================================

export function useLineage(initialRawFileId?: string): UseLineageReturn {
  const [lineage, setLineage] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRawFileId, setCurrentRawFileId] = useState<string | null>(
    initialRawFileId || null
  );

  /**
   * ✅ Récupérer la lignée complète d'un fichier brut
   */
  const fetchLineage = useCallback(async (rawFileId: string) => {
    setLoading(true);
    setError(null);
    setCurrentRawFileId(rawFileId);

    try {
      const { data, error } = await supabase.rpc('get_raw_file_lineage', {
        p_raw_file_id: rawFileId
      });

      if (error) {
        console.error('Erreur get_raw_file_lineage:', error);
        setError(error.message);
        setLineage(null);
        return;
      }

      if (!data) {
        setError('Fichier brut non trouvé ou supprimé');
        setLineage(null);
        return;
      }

      // Parser les données JSONB
      const parsedLineage: LineageData = {
        raw_file: data.raw_file,
        transcriptions: data.transcriptions || [],
        book_projects: data.book_projects || [],
        proofreading_v1: data.proofreading_v1 || [],
        proofreading_v2: data.proofreading_v2 || [],
        linked_documents: data.linked_documents || [],
        global_progress: data.global_progress || 0
      };

      setLineage(parsedLineage);
    } catch (err: any) {
      console.error('Erreur fetchLineage:', err);
      setError(err.message || 'Erreur inconnue');
      setLineage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ✅ Rafraîchir la lignée actuelle
   */
  const refreshLineage = useCallback(async () => {
    if (currentRawFileId) {
      await fetchLineage(currentRawFileId);
    }
  }, [currentRawFileId, fetchLineage]);

  /**
   * ✅ Obtenir uniquement la progression globale
   */
  const getGlobalProgress = useCallback(async (rawFileId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('get_raw_file_lineage', {
        p_raw_file_id: rawFileId
      });

      if (error) {
        console.error('Erreur getGlobalProgress:', error);
        return 0;
      }

      return data?.global_progress || 0;
    } catch (err: any) {
      console.error('Erreur getGlobalProgress:', err);
      return 0;
    }
  }, []);

  /**
   * ✅ Obtenir un résumé textuel de la lignée
   */
  const getLineageSummary = useCallback((): string => {
    if (!lineage) return 'Aucune donnée';

    const parts: string[] = [];

    // Fichier brut
    if (lineage.raw_file) {
      parts.push(`📁 ${lineage.raw_file.file_name}`);
    }

    // Transcriptions
    if (lineage.transcriptions.length > 0) {
      parts.push(`\n✏️ ${lineage.transcriptions.length} transcription(s)`);
      lineage.transcriptions.forEach(t => {
        parts.push(`   • ${t.title} (${t.status})`);
      });
    }

    // Projets de livre
    if (lineage.book_projects.length > 0) {
      parts.push(`\n📖 ${lineage.book_projects.length} projet(s) de livre`);
      lineage.book_projects.forEach(p => {
        parts.push(`   • ${p.title} (${p.status})`);
      });
    }

    // Relectures V1
    if (lineage.proofreading_v1.length > 0) {
      parts.push(`\n👁️ ${lineage.proofreading_v1.length} relecture(s) 1`);
      lineage.proofreading_v1.forEach(r => {
        parts.push(`   • ${r.status} (${r.progress}%)`);
      });
    }

    // Relectures V2
    if (lineage.proofreading_v2.length > 0) {
      parts.push(`\n👁️👁️ ${lineage.proofreading_v2.length} relecture(s) 2`);
      lineage.proofreading_v2.forEach(r => {
        parts.push(`   • ${r.status} (${r.progress}%)`);
      });
    }

    // Documents liés
    if (lineage.linked_documents.length > 0) {
      parts.push(`\n📄 ${lineage.linked_documents.length} document(s) lié(s)`);
      lineage.linked_documents.forEach(d => {
        parts.push(`   • ${d.title} (${d.status})`);
      });
    }

    // Progression globale
    parts.push(`\n📊 Progression: ${lineage.global_progress}%`);

    return parts.join('\n');
  }, [lineage]);

  /**
   * ✅ Vérifier si on peut passer à l'étape suivante
   */
  const canAdvanceToNextStep = useCallback((): boolean => {
    if (!lineage) return false;

    // Si pas de transcriptions, on peut en créer
    if (lineage.transcriptions.length === 0) {
      return true;
    }

    // Vérifier si toutes les transcriptions sont "transcrit"
    const allTranscriptionsComplete = lineage.transcriptions.every(
      t => t.status === 'transcrit' || t.workflow_step >= 3
    );

    // Si pas de projets et transcriptions complètes, on peut créer un projet
    if (lineage.book_projects.length === 0 && allTranscriptionsComplete) {
      return true;
    }

    // Vérifier si tous les projets ont une R1
    const allProjectsHaveR1 = lineage.book_projects.every(p =>
      lineage.proofreading_v1.some(r1 => r1.book_project_id === p.id)
    );

    // Si des projets sans R1 et transcriptions complètes, on peut créer R1
    if (!allProjectsHaveR1 && allTranscriptionsComplete) {
      return true;
    }

    // Vérifier si toutes les R1 sont validées
    const allR1Validated = lineage.proofreading_v1.every(
      r => r.status === 'relecture_1_validé' || r.workflow_step >= 5
    );

    // Si pas de R2 et R1 validées, on peut créer R2
    if (lineage.proofreading_v2.length === 0 && allR1Validated) {
      return true;
    }

    return false;
  }, [lineage]);

  /**
   * ✅ Obtenir la prochaine étape recommandée
   */
  const getNextStep = useCallback((): string | null => {
    if (!lineage) return null;

    // Étape 1: Créer une transcription
    if (lineage.transcriptions.length === 0) {
      return 'Créer une transcription';
    }

    // Étape 2: Finaliser les transcriptions
    const incompleteTranscriptions = lineage.transcriptions.filter(
      t => t.status !== 'transcrit'
    );
    if (incompleteTranscriptions.length > 0) {
      return `Finaliser ${incompleteTranscriptions.length} transcription(s)`;
    }

    // Étape 3: Créer un projet de livre
    if (lineage.book_projects.length === 0) {
      return 'Créer un projet de livre';
    }

    // Étape 4: Créer des relectures 1
    const projectsWithoutR1 = lineage.book_projects.filter(
      p => !lineage.proofreading_v1.some(r1 => r1.book_project_id === p.id)
    );
    if (projectsWithoutR1.length > 0) {
      return `Créer ${projectsWithoutR1.length} relecture(s) 1`;
    }

    // Étape 5: Valider les relectures 1
    const unvalidatedR1 = lineage.proofreading_v1.filter(
      r => r.status !== 'relecture_1_validé'
    );
    if (unvalidatedR1.length > 0) {
      return `Valider ${unvalidatedR1.length} relecture(s) 1`;
    }

    // Étape 6: Créer des relectures 2
    if (lineage.proofreading_v2.length === 0) {
      return 'Créer la relecture 2';
    }

    // Étape 7: Valider la relecture 2
    const unvalidatedR2 = lineage.proofreading_v2.filter(
      r => r.status !== 'relecture_2_validé'
    );
    if (unvalidatedR2.length > 0) {
      return `Valider ${unvalidatedR2.length} relecture(s) 2`;
    }

    // Terminé
    if (lineage.global_progress >= 100) {
      return 'Workflow terminé ✅';
    }

    return null;
  }, [lineage]);

  /**
   * ✅ Effet: Charger la lignée initiale si fournie
   */
  useEffect(() => {
    if (initialRawFileId) {
      fetchLineage(initialRawFileId);
    }
  }, [initialRawFileId, fetchLineage]);

  return {
    // ✅ Données
    lineage,
    loading,
    error,

    // ✅ Actions
    fetchLineage,
    refreshLineage,
    getGlobalProgress,
    getLineageSummary,
    canAdvanceToNextStep,
    getNextStep
  };
}

// =====================================================
// HOOK SPÉCIALISÉ: useProofreadingLineage
// Pour obtenir la lignée depuis une R1 ou R2
// =====================================================

export function useProofreadingLineage(proofreadingV1Id?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineage, setLineage] = useState<any>(null);

  const fetchFromProofreadingV1 = useCallback(async (pr1Id: string) => {
    setLoading(true);
    setError(null);

    try {
      // D'abord, récupérer la R1
      const { data: pr1Data, error: pr1Error } = await supabase
        .from('proofreading_v1')
        .select(`
          *,
          book_projects (
            id,
            title,
            status,
            book_project_transcriptions (
              transcription_id,
              transcriptions (
                id,
                title,
                transcription_raw_files (
                  raw_file_id
                )
              )
            )
          )
        `)
        .eq('id', pr1Id)
        .single();

      if (pr1Error) {
        throw pr1Error;
      }

      // Extraire les IDs des fichiers bruts
      const rawFileIds = (pr1Data.book_projects as any)
        ?.book_project_transcriptions
        ?.flatMap((bpt: any) => 
          (bpt.transcriptions as any)?.transcription_raw_files
            ?.map((trf: any) => trf.raw_file_id)
        )
        .filter((id: string) => id !== null) || [];

      // Si on a des raw files, utiliser get_raw_file_lineage
      if (rawFileIds.length > 0) {
        const { data: lineageData, error: lineageError } = await supabase.rpc(
          'get_raw_file_lineage',
          { p_raw_file_id: rawFileIds[0] }
        );

        if (lineageError) {
          throw lineageError;
        }

        setLineage(lineageData);
      } else {
        setLineage({ proofreading_v1: [pr1Data] });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (proofreadingV1Id) {
      fetchFromProofreadingV1(proofreadingV1Id);
    }
  }, [proofreadingV1Id, fetchFromProofreadingV1]);

  return {
    lineage,
    loading,
    error,
    fetchFromProofreadingV1
  };
}
