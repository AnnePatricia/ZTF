// =====================================================
// HOOK: useImportWorkflow
// Description: Gère les flux d'importation avec validation
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useFileValidation } from './useFileValidation';
import { useWorkflowAutomation } from './useWorkflowAutomation';

export interface ImportWorkflowState {
  isImporting: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export interface ImportResult {
  success: boolean;
  entityId: string;
  message: string;
  warnings?: string[];
  validationPassed?: boolean;
}

export function useImportWorkflow() {
  const [state, setState] = useState<ImportWorkflowState>({
    isImporting: false,
    progress: 0,
    error: null,
    success: false
  });

  const {
    validateTranscriptionName,
    validateProofreadingV1Name,
    validateProofreadingV2Name
  } = useFileValidation();

  const {
    autoLinkTranscriptionToRaw
    // autoLinkTranscriptionToBookProject // ❌ Non utilisé
  } = useWorkflowAutomation();

  /**
   * ✅ ÉTAPE 1 : Import d'un fichier brut (aucune validation)
   */
  const importRawFile = useCallback(async (
    file: File,
    metadata?: Record<string, any>
  ): Promise<ImportResult> => {
    setState({ isImporting: true, progress: 0, error: null, success: false });

    try {
      // Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `raw-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('document-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data : publicUrl } = supabase.storage
        .from('document-files')
        .getPublicUrl(storagePath);

      const user = await supabase.auth.getUser();

      let fileType: 'pdf' | 'audio' | 'image' = 'pdf';
      if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type === 'application/pdf') fileType = 'pdf';

      const { data: dbData, error: dbError } = await supabase
        .from('raw_files')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileType,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          bucket_name: 'document-files',
          metadata: metadata || {},
          imported_by: user.data.user?.id,
          status: 'libre',
          is_linked: false,
          linked_documents_count: 0
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setState({ isImporting: false, progress: 100, error: null, success: true });

      return {
        success: true,
        entityId: dbData.id,
        message: 'Fichier brut importé avec succès'
      };
    } catch (err: any) {
      setState({ isImporting: false, progress: 0, error: err.message, success: false });
      return {
        success: false,
        entityId: '',
        message: err.message
      };
    }
  }, []);

  /**
   * ✅ ÉTAPE 2-BIS : Import d'une transcription SANS liaison (standalone)
   * CAS : Transcription importée sans fichier brut lié (liaison à faire plus tard)
   */
  const importTranscriptionStandalone = useCallback(async (
    file: File
  ): Promise<ImportResult> => {
    setState({ isImporting: true, progress: 0, error: null, success: false });

    try {
      // 1. Upload du fichier de transcription
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `transcriptions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('transcription-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setState(prev => ({ ...prev, progress: 40 }));

      // 2. Création de la transcription SANS liaison
      const user = await supabase.auth.getUser();

      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: '',
          status: 'à_traiter', // ✅ STATUT FRANÇAIS (cohérent avec le reste de l'app)
          workflow_step: 1,
          progress: 0,
          assigned_to: '',
          tags: ['import', 'standalone'],
          metadata: {
            original_file: file.name,
            storage_path: storagePath,
            imported_without_link: true
          },
          source: file.name,
          language: 'fr',
          created_by: user.data.user?.id
        })
        .select()
        .single();

      if (transcriptionError) throw transcriptionError;

      setState(prev => ({ ...prev, progress: 100 }));

      return {
        success: true,
        entityId: transcriptionData.id,
        message: 'Transcription importée (sans liaison). Vous pourrez la lier plus tard.',
        validationPassed: true
      };
    } catch (err: any) {
      setState({ isImporting: false, progress: 0, error: err.message, success: false });
      return {
        success: false,
        entityId: '',
        message: err.message
      };
    }
  }, []);
  const importTranscription = useCallback(async (
    file: File,
    linkedRawFileIds: string | string[], // ✅ MAINTENANT : string OU string[]
    skipValidation: boolean = false
  ): Promise<ImportResult> => {
    setState({ isImporting: true, progress: 0, error: null, success: false });

    const warnings: string[] = [];

    try {
      // Normaliser en tableau
      const rawFileIds = Array.isArray(linkedRawFileIds) ? linkedRawFileIds : [linkedRawFileIds];
      
      // 1. Validation du nom (si requis) - avec le PREMIER fichier brut
      if (!skipValidation && rawFileIds.length > 0) {
        const isValid = await validateTranscriptionName(rawFileIds[0], file.name);

        if (!isValid) {
          return {
            success: false,
            entityId: '',
            message: `Le nom du fichier ne correspond pas au fichier brut. Nom attendu: ${file.name.replace(/\.[^/.]+$/, '')}.txt`,
            warnings: ['Validation du nom échouée']
          };
        }
      }

      setState(prev => ({ ...prev, progress: 20 }));

      // 2. Upload du fichier de transcription
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `transcriptions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('transcription-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setState(prev => ({ ...prev, progress: 40 }));

      // 3. Création de la transcription
      const user = await supabase.auth.getUser();

      const { data: transcriptionData, error: transcriptionError } = await supabase
        .from('transcriptions')
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: '',
          status: 'transcription_en_cours',
          workflow_step: 2,
          progress: 15,
          assigned_to: '',
          tags: ['import', 'auto'],
          metadata: {
            original_file: file.name,
            storage_path: storagePath
          },
          source: file.name,
          language: 'fr',
          created_by: user.data.user?.id
        })
        .select()
        .single();

      if (transcriptionError) throw transcriptionError;

      setState(prev => ({ ...prev, progress: 60 }));

      // 4. Liaison automatique avec TOUS les fichiers bruts sélectionnés
      console.log('🔗 [WORKFLOW] Linking transcription to', rawFileIds.length, 'raw file(s)');
      for (const rawFileId of rawFileIds) {
        const linkResult = await autoLinkTranscriptionToRaw(transcriptionData.id, rawFileId);
        if (!linkResult.success) {
          warnings.push(`Liaison avec ${rawFileId}: ${linkResult.message}`);
        } else {
          console.log('  ✅ Linked to raw file:', rawFileId);
        }
      }

      setState(prev => ({ ...prev, progress: 80 }));

      setState(prev => ({ ...prev, progress: 100 }));

      return {
        success: true,
        entityId: transcriptionData.id,
        message: `Transcription importée et liée à ${rawFileIds.length} fichier(s) brut(s)`,
        warnings: warnings.length > 0 ? warnings : undefined,
        validationPassed: !skipValidation
      };
    } catch (err: any) {
      setState({ isImporting: false, progress: 0, error: err.message, success: false });
      return {
        success: false,
        entityId: '',
        message: err.message
      };
    }
  }, [validateTranscriptionName, autoLinkTranscriptionToRaw]);

  /**
   * ✅ ÉTAPE 3 : Import d'un projet de livre avec transcriptions
   * SOUS-CAS 2: FICHIER TRANSCRIT LIE PAR UN PROJET IMPORTE
   */
  const importBookProject = useCallback(async (
    file: File,
    linkedTranscriptionIds: string[],
    metadata?: Record<string, any>
  ): Promise<ImportResult> => {
    setState({ isImporting: true, progress: 0, error: null, success: false });

    try {
      // 1. Upload du fichier projet
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `book-projects/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-project-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setState(prev => ({ ...prev, progress: 30 }));

      // 2. Création du projet de livre
      const user = await supabase.auth.getUser();
      const projectTitle = file.name.replace(/\.[^/.]+$/, '');

      const { data: projectData, error: projectError } = await supabase
        .from('book_projects')
        .insert({
          title: projectTitle,
          content: '',
          status: 'projet_de_livre',
          workflow_step: 4,
          progress: 50,
          author: metadata?.author || '',
          tags: ['import', 'auto'],
          metadata: {
            original_file: file.name,
            storage_path: storagePath,
            linked_transcriptions: linkedTranscriptionIds
          },
          assigned_to: '',
          created_by: user.data.user?.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      setState(prev => ({ ...prev, progress: 60 }));

      // 3. Liaison avec les transcriptions sélectionnées
      if (linkedTranscriptionIds.length > 0) {
        const links = linkedTranscriptionIds.map((id, index) => ({
          book_project_id: projectData.id,
          transcription_id: id,
          order_index: index,
          linked_by: user.data.user?.id
        }));

        const { error: linkError } = await supabase
          .from('book_project_transcriptions')
          .insert(links);

        if (linkError) {
          console.error('Erreur liaison transcriptions:', linkError);
        }
      }

      setState(prev => ({ ...prev, progress: 100 }));

      return {
        success: true,
        entityId: projectData.id,
        message: 'Projet de livre importé avec succès',
        validationPassed: true
      };
    } catch (err: any) {
      setState({ isImporting: false, progress: 0, error: err.message, success: false });
      return {
        success: false,
        entityId: '',
        message: err.message
      };
    }
  }, []);

  /**
   * ✅ ÉTAPE 4 : Import d'une Relecture 1 avec validation
   * SOUS-CAS 2: LE PROJET DE LIVRE LIE PAR RELECTURE 1 IMPORTE
   */
  const importProofreadingV1 = useCallback(async (
    file: File,
    linkedBookProjectId: string,
    skipValidation: boolean = false
  ): Promise<ImportResult> => {
    setState({ isImporting: true, progress: 0, error: null, success: false });

    try {
      // 1. Validation du nom (obligatoire selon cahier des charges)
      if (!skipValidation) {
        const isValid = await validateProofreadingV1Name(linkedBookProjectId, file.name);
        
        if (!isValid) {
          // Récupérer le nom attendu
          const { generateExpectedProofreadingV1Name } = useFileValidation();
          const expectedName = await generateExpectedProofreadingV1Name(linkedBookProjectId);
          
          return {
            success: false,
            entityId: '',
            message: `Le nom du fichier ne correspond pas. Nom attendu: ${expectedName}`,
            warnings: ['Validation du nom échouée - Le nom doit être "Titre Projet_R1"']
          };
        }
      }

      // 2. Vérifier si une R1 existe déjà pour ce projet (contrainte d'unicité)
      const { data: existingR1 } = await supabase
        .from('proofreading_v1')
        .select('id')
        .eq('book_project_id', linkedBookProjectId)
        .eq('is_deleted', false)
        .maybeSingle(); // ✅ maybeSingle() au lieu de single() (retourne null si pas trouvé)

      if (existingR1) {
        return {
          success: false,
          entityId: '',
          message: 'Une relecture 1 existe déjà pour ce projet de livre',
          warnings: ['Contrainte d\'unicité violée - 1 projet = 1 R1']
        };
      }

      // 3. Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `proofreading-v1/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('proofreading-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setState(prev => ({ ...prev, progress: 40 }));

      // 3.5. Récupérer le titre du projet pour les logs
      const { data: projectData } = await supabase
        .from('book_projects')
        .select('title')
        .eq('id', linkedBookProjectId)
        .single();
      const projectTitle = projectData?.title || 'Projet inconnu';
      console.log('👁️ [UPLOAD] Importing PROOFREADING V1 with project:', projectTitle, `(${linkedBookProjectId})`);

      // 4. Création de la R1
      const user = await supabase.auth.getUser();

      const { data: r1Data, error: r1Error } = await supabase
        .from('proofreading_v1')
        .insert({
          book_project_id: linkedBookProjectId,
          content: '',
          status: 'relecture_1_en_cours',
          workflow_step: 4,
          progress: 60,
          reviewer_id: user.data.user?.id,
          reviewer_name: '',
          notes: '',
          corrections_count: 0,
          metadata: {
            original_file: file.name,
            storage_path: storagePath
          }
        })
        .select()
        .single();

      if (r1Error) throw r1Error;

      setState(prev => ({ ...prev, progress: 100 }));

      return {
        success: true,
        entityId: r1Data.id,
        message: 'Relecture 1 importée avec succès',
        validationPassed: !skipValidation
      };
    } catch (err: any) {
      setState({ isImporting: false, progress: 0, error: err.message, success: false });
      return {
        success: false,
        entityId: '',
        message: err.message
      };
    }
  }, [validateProofreadingV1Name]);

  /**
   * ✅ ÉTAPE 5 : Import d'une Relecture 2 avec validation
   * DERNIER CAS: DE RELECTURE 1 à RELECTURE 2
   */
  const importProofreadingV2 = useCallback(async (
    file: File,
    linkedProofreadingV1Id: string,
    skipValidation: boolean = false
  ): Promise<ImportResult> => {
    setState({ isImporting: true, progress: 0, error: null, success: false });

    try {
      // 1. Validation du nom (obligatoire selon cahier des charges)
      if (!skipValidation) {
        const isValid = await validateProofreadingV2Name(linkedProofreadingV1Id, file.name);
        
        if (!isValid) {
          const { generateExpectedProofreadingV2Name } = useFileValidation();
          const expectedName = await generateExpectedProofreadingV2Name(linkedProofreadingV1Id);
          
          return {
            success: false,
            entityId: '',
            message: `Le nom du fichier ne correspond pas. Nom attendu: ${expectedName}`,
            warnings: ['Validation du nom échouée - Le nom doit être "Titre Projet_R2"']
          };
        }
      }

      // 2. Vérifier si une R2 existe déjà pour cette R1 (contrainte d'unicité)
      const { data: existingR2 } = await supabase
        .from('proofreading_v2')
        .select('id')
        .eq('proofreading_v1_id', linkedProofreadingV1Id)
        .eq('is_deleted', false)
        .single();

      if (existingR2) {
        return {
          success: false,
          entityId: '',
          message: 'Une relecture 2 existe déjà pour cette relecture 1',
          warnings: ['Contrainte d\'unicité violée - 1 R1 = 1 R2']
        };
      }

      // 3. Upload du fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `proofreading-v2/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('proofreading-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setState(prev => ({ ...prev, progress: 40 }));

      // 4. Création de la R2
      const user = await supabase.auth.getUser();

      const { data: r2Data, error: r2Error } = await supabase
        .from('proofreading_v2')
        .insert({
          proofreading_v1_id: linkedProofreadingV1Id,
          content: '',
          status: 'relecture_2_en_cours',
          workflow_step: 5,
          progress: 85,
          reviewer_id: user.data.user?.id,
          reviewer_name: '',
          notes: '',
          corrections_count: 0,
          metadata: {
            original_file: file.name,
            storage_path: storagePath
          }
        })
        .select()
        .single();

      if (r2Error) throw r2Error;

      setState(prev => ({ ...prev, progress: 100 }));

      return {
        success: true,
        entityId: r2Data.id,
        message: 'Relecture 2 importée avec succès',
        validationPassed: !skipValidation
      };
    } catch (err: any) {
      setState({ isImporting: false, progress: 0, error: err.message, success: false });
      return {
        success: false,
        entityId: '',
        message: err.message
      };
    }
  }, [validateProofreadingV2Name]);

  /**
   * ✅ Reset du state
   */
  const resetState = useCallback(() => {
    setState({
      isImporting: false,
      progress: 0,
      error: null,
      success: false
    });
  }, []);

  return {
    // State
    ...state,

    // Actions
    importRawFile,
    importTranscription,
    importTranscriptionStandalone, // ✅ NOUVEAU : Transcription sans liaison
    importBookProject,
    importProofreadingV1,
    importProofreadingV2,
    resetState
  };
}
