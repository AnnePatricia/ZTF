// =====================================================
// HOOK: useFileValidation
// Description: Valide les noms de fichiers selon le workflow
// =====================================================

import { supabase } from '../supabaseClient';

export interface ValidationResponse {
  is_valid: boolean;
  provided_name: string;
  raw_file_name?: string;
  project_title?: string;
  expected_name: string;
  suggestion: string;
}

export interface TranscriptionImportCheck {
  is_valid: boolean;
  matching_raw_files_count: number;
  matching_raw_files: Array<{
    id: string;
    file_name: string;
    is_linked: boolean;
    status: string;
    validation: ValidationResponse;
  }>;
  message: string;
}

export function useFileValidation() {
  /**
   * ✅ Valider le nom d'un fichier transcrit par rapport à un fichier brut
   * @param rawFileId - ID du fichier brut
   * @param transcriptionFileName - Nom du fichier transcrit
   * @returns true si les noms correspondent (même base, extension différente)
   */
  const validateTranscriptionName = async (
    rawFileId: string,
    transcriptionFileName: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_transcription_name', {
        p_raw_file_id: rawFileId,
        p_transcription_file_name: transcriptionFileName
      });

      if (error) {
        console.error('Erreur validation nom transcrit:', error);
        return false;
      }

      return data || false;
    } catch (err: any) {
      console.error('Erreur validateTranscriptionName:', err);
      return false;
    }
  };

  /**
   * ✅ Valider le nom d'un fichier R1 par rapport à un projet
   * @param bookProjectId - ID du projet de livre
   * @param proofreadingFileName - Nom du fichier R1
   * @returns true si nom = "Titre Projet_R1"
   */
  const validateProofreadingV1Name = async (
    bookProjectId: string,
    proofreadingFileName: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_proofreading_v1_name', {
        p_book_project_id: bookProjectId,
        p_proofreading_file_name: proofreadingFileName
      });

      if (error) {
        console.error('Erreur validation nom R1:', error);
        return false;
      }

      return data || false;
    } catch (err: any) {
      console.error('Erreur validateProofreadingV1Name:', err);
      return false;
    }
  };

  /**
   * ✅ Valider le nom d'un fichier R2 par rapport à une R1
   * @param proofreadingV1Id - ID de la relecture 1
   * @param proofreadingFileName - Nom du fichier R2
   * @returns true si nom = "Titre Projet_R2"
   */
  const validateProofreadingV2Name = async (
    proofreadingV1Id: string,
    proofreadingFileName: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_proofreading_v2_name', {
        p_proofreading_v1_id: proofreadingV1Id,
        p_proofreading_file_name: proofreadingFileName
      });

      if (error) {
        console.error('Erreur validation nom R2:', error);
        return false;
      }

      return data || false;
    } catch (err: any) {
      console.error('Erreur validateProofreadingV2Name:', err);
      return false;
    }
  };

  /**
   * ✅ Générer le nom attendu pour un fichier transcrit
   * @param rawFileId - ID du fichier brut
   * @returns Nom attendu (ex: "interview.mp3" → "interview.txt")
   */
  const generateExpectedTranscriptionName = async (
    rawFileId: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('generate_expected_transcription_name', {
        p_raw_file_id: rawFileId
      });

      if (error) {
        console.error('Erreur génération nom transcrit:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur generateExpectedTranscriptionName:', err);
      return null;
    }
  };

  /**
   * ✅ Générer le nom attendu pour une R1
   * @param bookProjectId - ID du projet de livre
   * @returns Nom attendu (ex: "Mon Livre" → "Mon Livre_R1.pdf")
   */
  const generateExpectedProofreadingV1Name = async (
    bookProjectId: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('generate_expected_proofreading_v1_name', {
        p_book_project_id: bookProjectId
      });

      if (error) {
        console.error('Erreur génération nom R1:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur generateExpectedProofreadingV1Name:', err);
      return null;
    }
  };

  /**
   * ✅ Générer le nom attendu pour une R2
   * @param proofreadingV1Id - ID de la relecture 1
   * @returns Nom attendu (ex: "Mon Livre" → "Mon Livre_R2.pdf")
   */
  const generateExpectedProofreadingV2Name = async (
    proofreadingV1Id: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('generate_expected_proofreading_v2_name', {
        p_proofreading_v1_id: proofreadingV1Id
      });

      if (error) {
        console.error('Erreur génération nom R2:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur generateExpectedProofreadingV2Name:', err);
      return null;
    }
  };

  /**
   * ✅ Valider avec suggestion de correction pour un transcrit
   * @param rawFileId - ID du fichier brut
   * @param transcriptionFileName - Nom du fichier transcrit
   * @returns Objet avec validation et suggestion
   */
  const validateAndSuggestTranscriptionCorrection = async (
    rawFileId: string,
    transcriptionFileName: string
  ): Promise<ValidationResponse | null> => {
    try {
      const { data, error } = await supabase.rpc('validate_and_suggest_transcription_correction', {
        p_raw_file_id: rawFileId,
        p_transcription_file_name: transcriptionFileName
      });

      if (error) {
        console.error('Erreur validation avec suggestion:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur validateAndSuggestTranscriptionCorrection:', err);
      return null;
    }
  };

  /**
   * ✅ Valider avec suggestion de correction pour une R1
   * @param bookProjectId - ID du projet de livre
   * @param proofreadingFileName - Nom du fichier R1
   * @returns Objet avec validation et suggestion
   */
  const validateAndSuggestProofreadingV1Correction = async (
    bookProjectId: string,
    proofreadingFileName: string
  ): Promise<ValidationResponse | null> => {
    try {
      const { data, error } = await supabase.rpc('validate_and_suggest_proofreading_v1_correction', {
        p_book_project_id: bookProjectId,
        p_proofreading_file_name: proofreadingFileName
      });

      if (error) {
        console.error('Erreur validation R1 avec suggestion:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur validateAndSuggestProofreadingV1Correction:', err);
      return null;
    }
  };

  /**
   * ✅ Valider avec suggestion de correction pour une R2
   * @param proofreadingV1Id - ID de la relecture 1
   * @param proofreadingFileName - Nom du fichier R2
   * @returns Objet avec validation et suggestion
   */
  const validateAndSuggestProofreadingV2Correction = async (
    proofreadingV1Id: string,
    proofreadingFileName: string
  ): Promise<ValidationResponse | null> => {
    try {
      const { data, error } = await supabase.rpc('validate_and_suggest_proofreading_v2_correction', {
        p_proofreading_v1_id: proofreadingV1Id,
        p_proofreading_file_name: proofreadingFileName
      });

      if (error) {
        console.error('Erreur validation R2 avec suggestion:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur validateAndSuggestProofreadingV2Correction:', err);
      return null;
    }
  };

  /**
   * ✅ Vérifier les requirements avant import d'une transcription
   * @param transcriptionFileName - Nom du fichier transcrit à importer
   * @returns Objet avec correspondances et message
   */
  const checkTranscriptionImportRequirements = async (
    transcriptionFileName: string
  ): Promise<TranscriptionImportCheck | null> => {
    try {
      const { data, error } = await supabase.rpc('check_transcription_import_requirements', {
        p_transcription_file_name: transcriptionFileName
      });

      if (error) {
        console.error('Erreur vérification requirements:', error);
        return null;
      }

      return data;
    } catch (err: any) {
      console.error('Erreur checkTranscriptionImportRequirements:', err);
      return null;
    }
  };

  /**
   * ✅ Valider un lot de fichiers (bulk validation)
   * @param files - Tableau de fichiers avec leurs métadonnées
   * @returns Résultats de validation pour chaque fichier
   */
  const validateBatchFiles = async (
    files: Array<{
      type: 'transcription' | 'proofreading_v1' | 'proofreading_v2';
      fileName: string;
      linkedId: string; // rawFileId, bookProjectId, ou proofreadingV1Id
    }>
  ): Promise<Array<{
    fileName: string;
    isValid: boolean;
    expectedName: string | null;
    error?: string;
  }>> => {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          let isValid = false;
          let expectedName: string | null = null;

          switch (file.type) {
            case 'transcription':
              expectedName = await generateExpectedTranscriptionName(file.linkedId);
              isValid = await validateTranscriptionName(file.linkedId, file.fileName);
              break;
            case 'proofreading_v1':
              expectedName = await generateExpectedProofreadingV1Name(file.linkedId);
              isValid = await validateProofreadingV1Name(file.linkedId, file.fileName);
              break;
            case 'proofreading_v2':
              expectedName = await generateExpectedProofreadingV2Name(file.linkedId);
              isValid = await validateProofreadingV2Name(file.linkedId, file.fileName);
              break;
          }

          return {
            fileName: file.fileName,
            isValid,
            expectedName,
            error: isValid ? undefined : `Nom attendu: ${expectedName}`
          };
        } catch (err: any) {
          return {
            fileName: file.fileName,
            isValid: false,
            expectedName: null,
            error: err.message
          };
        }
      })
    );

    return results;
  };

  return {
    // ✅ Validations simples
    validateTranscriptionName,
    validateProofreadingV1Name,
    validateProofreadingV2Name,

    // ✅ Génération de noms
    generateExpectedTranscriptionName,
    generateExpectedProofreadingV1Name,
    generateExpectedProofreadingV2Name,

    // ✅ Validations avec suggestions
    validateAndSuggestTranscriptionCorrection,
    validateAndSuggestProofreadingV1Correction,
    validateAndSuggestProofreadingV2Correction,

    // ✅ Vérification complète import
    checkTranscriptionImportRequirements,

    // ✅ Validation en lot
    validateBatchFiles
  };
}
