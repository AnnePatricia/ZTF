// =====================================================
// COMPOSANT: ValidationModal
// Description: Modal de validation des noms de fichiers à l'import
// =====================================================

import React, { useState, useEffect } from "react";
import { useFileValidation } from "../../../hooks/useFileValidation";

export interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (renamedFile?: File) => void; // ✅ MODIFIÉ: Accepte un fichier renommé en option

  // Type de validation
  validationType: 'transcription' | 'proofreading_v1' | 'proofreading_v2';

  // Données pour la validation
  file: File | null;
  linkedEntityId: string | null; // rawFileId, bookProjectId, ou proofreadingV1Id
  linkedEntityName?: string; // Nom de l'entité liée (pour affichage)

  // Callbacks optionnelles
  onRename?: (newName: string, newFile?: File) => void; // ✅ Accepte 1 ou 2 arguments
}

interface ValidationResult {
  isValid: boolean;
  expectedName: string | null;
  suggestion: string;
  canContinue: boolean;
}

const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  validationType,
  file,
  linkedEntityId,
  linkedEntityName,
  onRename
}) => {
  const {
    validateTranscriptionName,
    validateProofreadingV1Name,
    generateExpectedTranscriptionName,
    generateExpectedProofreadingV1Name
    // validateProofreadingV2Name, // ❌ Non utilisé
    // generateExpectedProofreadingV2Name // ❌ Non utilisé
  } = useFileValidation();

  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [useCustomName, setUseCustomName] = useState(false);
  const [customName, setCustomName] = useState("");
  const [isConfirming, setIsConfirming] = useState(false); // ✅ CHARGEMENT
  const [renamedFile, setRenamedFile] = useState<File | null>(null); // ✅ FICHIER RENOMMÉ

  // ✅ EFFECTUER LA VALIDATION AU CHARGEMENT
  useEffect(() => {
    if (isOpen && file && linkedEntityId) {
      performValidation();
    }
  }, [isOpen, file, linkedEntityId]);

  const performValidation = async () => {
    if (!file || !linkedEntityId) return;

    setIsChecking(true);

    try {
      let isValid = false;
      let expectedName: string | null = null;

      // Valider selon le type
      switch (validationType) {
        case 'transcription':
          isValid = await validateTranscriptionName(linkedEntityId, file.name);
          expectedName = await generateExpectedTranscriptionName(linkedEntityId);
          break;

        case 'proofreading_v1':
          // ✅ R1 : Nom attendu = "Titre Projet_R1"
          isValid = await validateProofreadingV1Name(linkedEntityId, file.name);
          expectedName = await generateExpectedProofreadingV1Name(linkedEntityId);
          break;

        case 'proofreading_v2':
          // ✅ R2 : Nom attendu = "Nom R1_R2" = "Titre Projet_R1_R2"
          // On utilise linkedEntityName qui est le book_project_title
          const projectName = linkedEntityName || '';
          expectedName = `${projectName}_R1_R2`;
          isValid = file.name === expectedName;
          console.log('🔍 [VALIDATION R2] Project name:', projectName);
          console.log('🔍 [VALIDATION R2] Expected name:', expectedName);
          console.log('🔍 [VALIDATION R2] Actual name:', file.name);
          console.log('🔍 [VALIDATION R2] Is valid:', isValid);
          break;
      }

      setValidationResult({
        isValid,
        expectedName,
        suggestion: isValid
          ? 'Le nom du fichier est conforme ✅'
          : `Le nom attendu est : "${expectedName}"`,
        canContinue: true // ✅ TOUJOURS true pour permettre "Importer quand même"
      });

      setCustomName(expectedName || "");
    } catch (err: any) {
      console.error('Erreur validation:', err);
      setValidationResult({
        isValid: false,
        expectedName: null,
        suggestion: 'Erreur lors de la validation',
        canContinue: false
      });
    } finally {
      setIsChecking(false);
    }
  };

  // ✅ GÉRER LA CONFIRMATION
  const handleConfirm = async () => {
    setIsConfirming(true); // ✅ DÉBUT CHARGEMENT
    try {
      // ✅ TOUJOURS passer le fichier renommé s'il existe (priorité au state local)
      const fileToPass = renamedFile || file;
      if (fileToPass) {
        console.log('✅ [VALIDATION MODAL] handleConfirm - passing file:', fileToPass.name);
        onConfirm(fileToPass);
      }
    } finally {
      setIsConfirming(false); // ✅ FIN CHARGEMENT
    }
  };

  // ✅ GÉRER LE RENOMMAGE ET CONFIRMER DIRECTEMENT
  const handleRenameAndConfirm = async () => {
    if (customName && file) {
      setIsConfirming(true);
      try {
        // ✅ Créer le fichier renommé
        const newFile = new File([file], customName, { type: file.type });
        console.log('🏷️ [VALIDATION MODAL] handleRenameAndConfirm - renamed file to:', newFile.name);
        
        // ✅ Mettre à jour le state
        setRenamedFile(newFile);
        
        // ✅ Mettre à jour le résultat de validation
        setValidationResult({
          isValid: true,
          expectedName: customName,
          suggestion: 'Fichier renommé avec succès ✅',
          canContinue: true
        });
        
        // ✅ Appeler onRename (pour ImportModal)
        if (onRename) {
          onRename(customName, newFile);
        }
        
        // ✅ Petit délai pour que les states se mettent à jour
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // ✅ Passer le fichier renommé directement
        console.log('✅ [VALIDATION MODAL] handleRenameAndConfirm - passing file:', newFile.name);
        onConfirm(newFile);
      } finally {
        setIsConfirming(false);
      }
    }
  };

  // ✅ TITRES ET ICONES SELON LE TYPE
  const getTypeConfig = () => {
    switch (validationType) {
      case 'transcription':
        return {
          title: 'Validation Transcription',
          icon: 'fa-keyboard',
          color: 'from-green-500 to-green-600',
          description: 'Le nom de la transcription doit correspondre au fichier brut'
        };
      case 'proofreading_v1':
        return {
          title: 'Validation Relecture 1',
          icon: 'fa-eye',
          color: 'from-amber-500 to-amber-600',
          description: `Le nom doit être : "${linkedEntityName || 'Titre'}_R1"`
        };
      case 'proofreading_v2':
        return {
          title: 'Validation Relecture 2',
          icon: 'fa-eye-double',
          color: 'from-red-500 to-red-600',
          description: `Le nom doit être : "${linkedEntityName || 'Titre'}_R1_R2"`
        };
    }
  };

  const config = getTypeConfig();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modale */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full animate-scale-in">
        {/* En-tête */}
        <div className={`bg-gradient-to-r ${config.color} text-white px-6 py-4 rounded-t-2xl`}>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <i className={`fas ${config.icon}`}></i>
            {config.title}
          </h2>
          <p className="text-white/80 text-sm mt-1">{config.description}</p>
        </div>

        <div className="p-6">
          {/* État de chargement */}
          {isChecking && (
            <div className="flex items-center justify-center py-8">
              <i className="fas fa-spinner fa-spin text-4xl text-purple-600"></i>
              <p className="ml-4 text-gray-600 dark:text-gray-400">Validation en cours...</p>
            </div>
          )}

          {/* Résultat de la validation */}
          {!isChecking && validationResult && file && (
            <>
              {/* Informations sur le fichier */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <i className="fas fa-file mr-2"></i>
                  Fichier à importer
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Nom :</span>
                    <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Taille :</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  {linkedEntityName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Lié à :
                      </span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {linkedEntityName}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Résultat */}
              <div className={`mb-6 p-4 rounded-xl border-2 ${
                validationResult.isValid
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
              }`}>
                <div className="flex items-start gap-3">
                  {validationResult.isValid ? (
                    <i className="fas fa-check-circle text-green-500 text-2xl mt-1"></i>
                  ) : (
                    <i className="fas fa-exclamation-triangle text-amber-500 text-2xl mt-1"></i>
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${
                      validationResult.isValid
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-amber-800 dark:text-amber-200'
                    }`}>
                      {validationResult.isValid ? 'Nom conforme' : 'Nom non conforme'}
                    </h4>
                    <p className={`text-sm ${
                      validationResult.isValid
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {validationResult.suggestion}
                    </p>
                  </div>
                </div>
              </div>

              {/* Option de renommage */}
              {!validationResult.isValid && validationResult.expectedName && (
                <div className="mb-6">
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomName}
                      onChange={(e) => setUseCustomName(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Renommer le fichier avant import
                    </span>
                  </label>

                  {useCustomName && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Nouveau nom du fichier"
                        />
                        <button
                          onClick={handleRenameAndConfirm}
                          disabled={isConfirming || !customName}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center disabled:cursor-not-allowed"
                        >
                          {isConfirming ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Renommage...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Renommer et importer
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <i className="fas fa-info-circle mr-1"></i>
                        Le fichier sera renommé avant l'import
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Avertissement pour import forcé */}
              {!validationResult.isValid && !useCustomName && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <i className="fas fa-exclamation-circle mr-2"></i>
                    ⚠️ Vous pouvez continuer avec ce nom, mais cela peut causer des problèmes de traçabilité.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-all duration-200"
          >
            Annuler
          </button>

          {(!validationResult?.isValid && useCustomName) ? (
            <button
              onClick={handleConfirm}
              disabled={!customName || !validationResult?.canContinue || isConfirming}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isConfirming ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Import en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  Renommer et importer
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={!validationResult?.canContinue || isConfirming}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isConfirming ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Import en cours...
                </>
              ) : validationResult?.isValid ? (
                <>
                  <i className="fas fa-check"></i>
                  Confirmer l'import
                </>
              ) : (
                <>
                  <i className="fas fa-exclamation-triangle"></i>
                  Importer quand même
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
