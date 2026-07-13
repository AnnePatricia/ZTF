// =====================================================
// HOOK: useWorkflowAutomation
// Description: Automatise les transitions de statut et créations
// =====================================================

import { supabase } from '../supabaseClient';
import type { DocumentStatus } from '../components/Documents/document';

export interface WorkflowTransition {
  success: boolean;
  fromStatus: string;
  toStatus: string;
  entityId: string;
  message?: string;
}

export interface AutoCreateResult {
  success: boolean;
  entityId: string;
  documentId?: string;
  message?: string;
}

export function useWorkflowAutomation() {
  /**
   * ✅ Lier automatiquement une transcription à un fichier brut
   * et mettre à jour le statut du brut à "transcrit" (pas "traité")
   */
  const autoLinkTranscriptionToRaw = async (
    transcriptionId: string,
    rawFileId: string
  ): Promise<WorkflowTransition> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        return {
          success: false,
          fromStatus: '',
          toStatus: '',
          entityId: rawFileId,
          message: 'Utilisateur non authentifié'
        };
      }

      // Insérer la liaison (le trigger mettra à jour le statut automatiquement)
      const { data, error } = await supabase
        .from('transcription_raw_files')
        .insert([{
          transcription_id: transcriptionId,
          raw_file_id: rawFileId,
          linked_by: userData.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur liaison transcription → brut:', error);
        return {
          success: false,
          fromStatus: 'libre',
          toStatus: '',
          entityId: rawFileId,
          message: error.message
        };
      }

      return {
        success: true,
        fromStatus: 'libre',
        toStatus: 'transcrit', // ✅ CHANGÉ: "transcrit" au lieu de "traité"
        entityId: rawFileId,
        message: 'Fichier brut lié et statut mis à jour automatiquement'
      };
    } catch (err: any) {
      console.error('Erreur autoLinkTranscriptionToRaw:', err);
      return {
        success: false,
        fromStatus: '',
        toStatus: '',
        entityId: rawFileId,
        message: err.message
      };
    }
  };

  /**
   * ✅ Lier automatiquement une transcription à un projet de livre
   * et mettre à jour le statut de la transcription
   */
  const autoLinkTranscriptionToBookProject = async (
    transcriptionId: string,
    bookProjectId: string,
    orderIndex: number = 0
  ): Promise<WorkflowTransition> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        return {
          success: false,
          fromStatus: '',
          toStatus: '',
          entityId: transcriptionId,
          message: 'Utilisateur non authentifié'
        };
      }

      // Insérer la liaison (le trigger mettra à jour le statut automatiquement)
      const { data, error } = await supabase
        .from('book_project_transcriptions')
        .insert([{
          book_project_id: bookProjectId,
          transcription_id: transcriptionId,
          order_index: orderIndex,
          linked_by: userData.user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Erreur liaison transcription → projet:', error);
        return {
          success: false,
          fromStatus: '',
          toStatus: '',
          entityId: transcriptionId,
          message: error.message
        };
      }

      return {
        success: true,
        fromStatus: 'transcrit',
        toStatus: 'projet_de_livre',
        entityId: transcriptionId,
        message: 'Transcription liée au projet et statut mis à jour automatiquement'
      };
    } catch (err: any) {
      console.error('Erreur autoLinkTranscriptionToBookProject:', err);
      return {
        success: false,
        fromStatus: '',
        toStatus: '',
        entityId: transcriptionId,
        message: err.message
      };
    }
  };

  /**
   * ✅ Créer automatiquement un document depuis un projet de livre
   * avec le statut "relecture_1_en_cours" et nom = titre + "_R1"
   */
  const autoCreateDocumentFromBookProject = async (
    bookProjectId: string
  ): Promise<AutoCreateResult> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        return {
          success: false,
          entityId: bookProjectId,
          message: 'Utilisateur non authentifié'
        };
      }

      // Récupérer le projet
      const { data: project, error: fetchError } = await supabase
        .from('book_projects')
        .select('title, status')
        .eq('id', bookProjectId)
        .single();

      if (fetchError) {
        console.error('Erreur récupération projet:', fetchError);
        return {
          success: false,
          entityId: bookProjectId,
          message: fetchError.message
        };
      }

      // Vérifier si un document R1 existe déjà
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('title', `${project.title}_R1`)
        .single();

      if (existingDoc) {
        return {
          success: false,
          entityId: bookProjectId,
          message: `Un document R1 existe déjà: "${project.title}_R1"`
        };
      }

      // Créer le document
      const newDocument = {
        title: `${project.title}_R1`,
        type: 'Relecture 1',
        source: project.title,
        status: 'relecture_1_en_cours' as DocumentStatus,
        workflow_step: 4,
        progress: 60,
        assigned_to: '',
        tags: ['relecture_1', 'auto'],
        file_url: '',
        user_id: userData.user.id
      };

      const { data: createdDoc, error: createError } = await supabase
        .from('documents')
        .insert([newDocument])
        .select()
        .single();

      if (createError) {
        console.error('Erreur création document R1:', createError);
        return {
          success: false,
          entityId: bookProjectId,
          message: createError.message
        };
      }

      return {
        success: true,
        entityId: bookProjectId,
        documentId: createdDoc.id,
        message: `Document R1 créé: "${project.title}_R1"`
      };
    } catch (err: any) {
      console.error('Erreur autoCreateDocumentFromBookProject:', err);
      return {
        success: false,
        entityId: bookProjectId,
        message: err.message
      };
    }
  };

  /**
   * ✅ Créer automatiquement un document depuis une R1
   * avec le statut "relecture_2_en_cours" et nom = titre + "_R2"
   */
  const autoCreateDocumentFromProofreadingV1 = async (
    proofreadingV1Id: string
  ): Promise<AutoCreateResult> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData?.user) {
        return {
          success: false,
          entityId: proofreadingV1Id,
          message: 'Utilisateur non authentifié'
        };
      }

      // Récupérer la R1 et le projet lié
      const { data: proofreading, error: fetchError } = await supabase
        .from('proofreading_v1')
        .select(`
          id,
          status,
          book_project_id,
          book_projects (
            title
          )
        `)
        .eq('id', proofreadingV1Id)
        .single();

      if (fetchError) {
        console.error('Erreur récupération R1:', fetchError);
        return {
          success: false,
          entityId: proofreadingV1Id,
          message: fetchError.message
        };
      }

      const projectTitle = (proofreading.book_projects as any)?.title;

      if (!projectTitle) {
        return {
          success: false,
          entityId: proofreadingV1Id,
          message: 'Projet de livre non trouvé'
        };
      }

      // Vérifier si un document R2 existe déjà
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('title', `${projectTitle}_R2`)
        .single();

      if (existingDoc) {
        return {
          success: false,
          entityId: proofreadingV1Id,
          message: `Un document R2 existe déjà: "${projectTitle}_R2"`
        };
      }

      // Créer le document
      const newDocument = {
        title: `${projectTitle}_R2`,
        type: 'Relecture 2',
        source: projectTitle,
        status: 'relecture_2_en_cours' as DocumentStatus,
        workflow_step: 5,
        progress: 85,
        assigned_to: '',
        tags: ['relecture_2', 'auto'],
        file_url: '',
        user_id: userData.user.id
      };

      const { data: createdDoc, error: createError } = await supabase
        .from('documents')
        .insert([newDocument])
        .select()
        .single();

      if (createError) {
        console.error('Erreur création document R2:', createError);
        return {
          success: false,
          entityId: proofreadingV1Id,
          message: createError.message
        };
      }

      return {
        success: true,
        entityId: proofreadingV1Id,
        documentId: createdDoc.id,
        message: `Document R2 créé: "${projectTitle}_R2"`
      };
    } catch (err: any) {
      console.error('Erreur autoCreateDocumentFromProofreadingV1:', err);
      return {
        success: false,
        entityId: proofreadingV1Id,
        message: err.message
      };
    }
  };

  /**
   * ✅ Mettre à jour le statut après une liaison
   * (pour les cas où les triggers ne suffisent pas)
   */
  const updateStatusAfterLink = async (
    entityType: 'raw_file' | 'transcription' | 'book_project' | 'proofreading_v1',
    entityId: string,
    newStatus: string
  ): Promise<boolean> => {
    try {
      let table = '';
      switch (entityType) {
        case 'raw_file':
          table = 'raw_files';
          break;
        case 'transcription':
          table = 'transcriptions';
          break;
        case 'book_project':
          table = 'book_projects';
          break;
        case 'proofreading_v1':
          table = 'proofreading_v1';
          break;
      }

      if (!table) {
        console.error('Type d\'entité inconnu:', entityType);
        return false;
      }

      const { error } = await supabase
        .from(table)
        .update({
          status: newStatus,
          metadata: {
            status_history: [
              { status: newStatus, timestamp: new Date().toISOString(), reason: 'Liaison automatique' }
            ]
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', entityId);

      if (error) {
        console.error('Erreur mise à jour statut:', error);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Erreur updateStatusAfterLink:', err);
      return false;
    }
  };

  /**
   * ✅ Finaliser une transcription (bouton "Fin")
   * - Crée le document avec statut "transcrit"
   * - Met à jour le statut du brut
   */
  const finalizeTranscription = async (
    transcriptionId: string,
    rawFileId: string,
    content: string
  ): Promise<AutoCreateResult> => {
    try {
      // 1. Mettre à jour le contenu de la transcription
      const { error: updateError } = await supabase
        .from('transcriptions')
        .update({
          content,
          status: 'transcrit',
          workflow_step: 3,
          progress: 30
        })
        .eq('id', transcriptionId);

      if (updateError) {
        return {
          success: false,
          entityId: transcriptionId,
          message: updateError.message
        };
      }

      // 2. Lier au fichier brut (trigger mettra à jour le statut du brut)
      const linkResult = await autoLinkTranscriptionToRaw(transcriptionId, rawFileId);

      if (!linkResult.success) {
        return {
          success: false,
          entityId: transcriptionId,
          message: linkResult.message
        };
      }

      return {
        success: true,
        entityId: transcriptionId,
        message: 'Transcription finalisée avec succès'
      };
    } catch (err: any) {
      console.error('Erreur finalizeTranscription:', err);
      return {
        success: false,
        entityId: transcriptionId,
        message: err.message
      };
    }
  };

  /**
   * ✅ Finaliser une relecture 1 (bouton "Fin")
   * - Met à jour le statut de R1 à "relecture_1_validé"
   * - Le trigger mettra à jour le statut du projet
   */
  const finalizeProofreadingV1 = async (
    proofreadingV1Id: string,
    content: string,
    correctionsCount: number = 0
  ): Promise<WorkflowTransition> => {
    try {
      const { error: updateError } = await supabase
        .from('proofreading_v1')
        .update({
          content,
          status: 'relecture_1_validé',
          workflow_step: 4,
          progress: 70,
          corrections_count: correctionsCount,
          notes: 'Relecture 1 validée - Prêt pour R2'
        })
        .eq('id', proofreadingV1Id);

      if (updateError) {
        return {
          success: false,
          fromStatus: '',
          toStatus: '',
          entityId: proofreadingV1Id,
          message: updateError.message
        };
      }

      // Le trigger mettra à jour le statut du projet automatiquement

      return {
        success: true,
        fromStatus: 'relecture_1_en_cours',
        toStatus: 'relecture_1_validé',
        entityId: proofreadingV1Id,
        message: 'Relecture 1 validée avec succès'
      };
    } catch (err: any) {
      console.error('Erreur finalizeProofreadingV1:', err);
      return {
        success: false,
        fromStatus: '',
        toStatus: '',
        entityId: proofreadingV1Id,
        message: err.message
      };
    }
  };

  /**
   * ✅ Finaliser une relecture 2 (bouton "Fin")
   * - Met à jour le statut de R2 à "relecture_2_validé"
   * - Le trigger mettra à jour le statut de R1
   */
  const finalizeProofreadingV2 = async (
    proofreadingV2Id: string,
    content: string,
    correctionsCount: number = 0
  ): Promise<WorkflowTransition> => {
    try {
      const { error: updateError } = await supabase
        .from('proofreading_v2')
        .update({
          content,
          status: 'relecture_2_validé',
          workflow_step: 5,
          progress: 100,
          corrections_count: correctionsCount,
          notes: 'Relecture 2 validée - Version finale'
        })
        .eq('id', proofreadingV2Id);

      if (updateError) {
        return {
          success: false,
          fromStatus: '',
          toStatus: '',
          entityId: proofreadingV2Id,
          message: updateError.message
        };
      }

      // Le trigger mettra à jour le statut de R1 automatiquement

      return {
        success: true,
        fromStatus: 'relecture_2_en_cours',
        toStatus: 'relecture_2_validé',
        entityId: proofreadingV2Id,
        message: 'Relecture 2 validée - Version finale atteinte !'
      };
    } catch (err: any) {
      console.error('Erreur finalizeProofreadingV2:', err);
      return {
        success: false,
        fromStatus: '',
        toStatus: '',
        entityId: proofreadingV2Id,
        message: err.message
      };
    }
  };

  /**
   * ✅ Workflow complet: Import transcription → Liaison → Statut
   */
  const completeTranscriptionImportWorkflow = async (
    rawFileId: string,
    transcriptionId: string,
    transcriptionFileName: string
  ): Promise<{
    success: boolean;
    message: string;
    warnings?: string[];
  }> => {
    const warnings: string[] = [];

    // 1. Valider le nom
    const { validateTranscriptionName } = await import('./useFileValidation');
    const isValid = await validateTranscriptionName(rawFileId, transcriptionFileName);

    if (!isValid) {
      warnings.push(`Le nom du fichier transcrit ne correspond pas au fichier brut`);
    }

    // 2. Lier
    const linkResult = await autoLinkTranscriptionToRaw(transcriptionId, rawFileId);

    if (!linkResult.success) {
      return {
        success: false,
        message: linkResult.message || 'Erreur lors de la liaison'
      };
    }

    return {
      success: true,
      message: 'Transcription importée et liée avec succès',
      warnings: warnings.length > 0 ? warnings : undefined
    };
  };

  return {
    // ✅ Liaisons automatiques
    autoLinkTranscriptionToRaw,
    autoLinkTranscriptionToBookProject,

    // ✅ Créations automatiques de documents
    autoCreateDocumentFromBookProject,
    autoCreateDocumentFromProofreadingV1,

    // ✅ Mises à jour de statut
    updateStatusAfterLink,

    // ✅ Finalisations (bouton "Fin")
    finalizeTranscription,
    finalizeProofreadingV1,
    finalizeProofreadingV2,

    // ✅ Workflow complet
    completeTranscriptionImportWorkflow
  };
}
