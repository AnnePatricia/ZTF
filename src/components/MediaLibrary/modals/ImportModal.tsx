import React, { useRef, useState } from "react";
import { useFileValidation } from "../../../hooks/useFileValidation";
import { useImportWorkflow } from "../../../hooks/useImportWorkflow";
import ValidationModal from "./ValidationModal";
import BulkImportModal from "./BulkImportModal";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importType: string | null;
  setImportType: (type: any) => void;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  isUploading: boolean;
  setIsUploading: (uploading: boolean) => void;
  onUpload: (file: File, metadata?: Record<string, any>) => Promise<any>;
  
  // ✅ NOUVEAU : Pour la sélection de fichiers sources
  rawFiles?: any[];
  transcriptions?: any[];
  bookProjects?: any[];
  proofreadingV1?: any[];
  onSourceSelect?: (sourceIds: string[]) => void;
  
  // ✅ POUR RAFRAÎCHIR APRÈS IMPORT
  onImportSuccess?: () => void;
}

interface FileUploadStatus {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: any;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  importType,
  setImportType,
  selectedFiles,
  setSelectedFiles,
  uploadProgress,
  setUploadProgress,
  isUploading,
  setIsUploading,
  onUpload,
  rawFiles = [],
  transcriptions = [],
  bookProjects = [],
  proofreadingV1 = [],
  onSourceSelect, // eslint-disable-line @typescript-eslint/no-unused-vars
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);

  // ✅ NOUVEAU : Variable locale pour le fichier renommé (évite le problème de state asynchrone)
  const renamedFileRef = useRef<File | null>(null);

  // ✅ NOUVEAUX ÉTATS POUR LA SÉLECTION DE FICHIERS SOURCES
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [fileToValidate, setFileToValidate] = useState<File | null>(null);
  const [isConfirmingSelection, setIsConfirmingSelection] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  const { validateTranscriptionName, validateProofreadingV1Name, validateProofreadingV2Name } = useFileValidation();

  // ✅ HOOK POUR LES IMPORTS SPÉCIFIQUES
  const {
    importRawFile, // ✅ AJOUTÉ : Pour uploadRawFile
    importTranscription,
    importTranscriptionStandalone, // ✅ NOUVEAU
    importBookProject,
    importProofreadingV1,
    importProofreadingV2
  } = useImportWorkflow();

  // ✅ FONCTION POUR UPLOADER UN FICHIER BRUT (utilisé par BulkImportModal)
  const uploadRawFile = async (file: File, metadata?: Record<string, any>) => {
    return await importRawFile(file, metadata);
  };

  const importOptions = [
    {
      id: 'raw',
      title: 'Fichier Brut',
      icon: 'fa-file-import',
      color: 'from-blue-500 to-blue-600',
      description: 'PDF, Audio, Image',
      accepted: '.pdf,.mp3,.wav,.mp4,.jpg,.jpeg,.png'
    },
    {
      id: 'transcription',
      title: 'Transcription',
      icon: 'fa-keyboard',
      color: 'from-green-500 to-green-600',
      description: 'Texte transcrit',
      accepted: '.txt,.doc,.docx'
    },
    {
      id: 'book',
      title: 'Projet de Livre',
      icon: 'fa-book',
      color: 'from-purple-500 to-purple-600',
      description: 'Assemblage de transcriptions',
      accepted: '.txt,.doc,.docx,.pdf'
    },
    {
      id: 'proofreading1',
      title: 'Relecture 1',
      icon: 'fa-eye',
      color: 'from-amber-500 to-amber-600',
      description: 'Première relecture',
      accepted: '.txt,.doc,.docx,.pdf'
    },
    {
      id: 'proofreading2',
      title: 'Relecture 2',
      icon: 'fa-eye-double',
      color: 'from-red-500 to-red-600',
      description: 'Seconde relecture',
      accepted: '.txt,.doc,.docx,.pdf'
    },
    {
      id: 'bulk',
      title: 'Import en Masse',
      icon: 'fa-layer-group',
      color: 'from-indigo-500 to-purple-600',
      description: 'Appariement automatique',
      accepted: ''
    },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from<File>(e.target.files);
      setSelectedFiles(filesArray);
      renamedFileRef.current = null; // ✅ RESET DU FICHIER RENOMMÉ
      setFileStatuses(
        filesArray.map(file => ({
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          file,
          progress: 0,
          status: 'pending' as const,
        }))
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from<File>(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      renamedFileRef.current = null; // ✅ RESET DU FICHIER RENOMMÉ
      setFileStatuses(
        filesArray.map(file => ({
          id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
          file,
          progress: 0,
          status: 'pending' as const,
        }))
      );
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > 50 * 1024 * 1024) {
      return { valid: false, error: 'Fichier trop volumineux (max 50MB)' };
    }

    const allowedTypes = [
      'application/pdf',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Type non autorisé (${file.type})` };
    }

    return { valid: true };
  };

  // ✅ VALIDER AVANT IMPORT (seulement pour transcription, R1, R2 avec sources)
  const validateBeforeUpload = async (fileToUse?: File): Promise<boolean> => {
    const file = fileToUse || (selectedFiles.length > 0 ? selectedFiles[0] : null);

    console.log('🔍 [VALIDATION] validateBeforeUpload called');
    console.log('  - fileToUse:', fileToUse?.name || 'none');
    console.log('  - selectedFiles.length:', selectedFiles.length);
    console.log('  - selectedSourceIds.length:', selectedSourceIds.length);
    console.log('  - importType:', importType);

    if (!file) {
      console.log('  ✅ [VALIDATION] No files selected, returning true');
      return true;
    }

    // ✅ SEULEMENT si des sources sont sélectionnées
    if (selectedSourceIds.length === 0) {
      console.log('  ✅ [VALIDATION] No sources selected, skipping validation');
      return true; // Pas de validation nécessaire
    }

    console.log('  🔍 [VALIDATION] Checking name validation...');

    if (importType === 'transcription') {
      // ✅ CORRECTION 3 : Vérifier si le fichier brut est déjà "transcrit"
      const rawFile = rawFiles?.find((f: any) => f.id === selectedSourceIds[0]);
      if (rawFile?.status === 'transcrit') {
        console.log('  ❌ [VALIDATION] Raw file is already "transcrit", blocking to avoid duplicates');
        alert('⚠️ Ce fichier brut est déjà marqué comme "transcrit".\n\nIl a déjà été transcrit et ne peut pas être réutilisé pour éviter les doublons.\n\nSi vous voulez vraiment continuer, cliquez sur OK.');
        const confirm = window.confirm('Voulez-vous vraiment continuer ? (déconseillé)');
        if (!confirm) {
          return false;
        }
      }

      console.log('  - Validating transcription name against raw file:', selectedSourceIds[0]);
      const isValid = await validateTranscriptionName(selectedSourceIds[0], file.name);
      console.log('  - Validation result:', isValid);
      if (!isValid) {
        console.log('  ❌ [VALIDATION] Name invalid, opening validation modal');
        setFileToValidate(file);
        setShowValidationModal(true);
        return false;
      }
      console.log('  ✅ [VALIDATION] Name valid');
    }
    
    if (importType === 'proofreading1') {
      console.log('  - Validating proofreading V1 name against project:', selectedSourceIds[0]);
      const isValid = await validateProofreadingV1Name(selectedSourceIds[0], file.name);
      console.log('  - Validation result:', isValid);
      if (!isValid) {
        console.log('  ❌ [VALIDATION] Name invalid, opening validation modal');
        setFileToValidate(file);
        setShowValidationModal(true);
        return false;
      }
      console.log('  ✅ [VALIDATION] Name valid');
    }
    
    if (importType === 'proofreading2') {
      console.log('  - Validating proofreading V2 name against R1:', selectedSourceIds[0]);
      const isValid = await validateProofreadingV2Name(selectedSourceIds[0], file.name);
      console.log('  - Validation result:', isValid);
      if (!isValid) {
        console.log('  ❌ [VALIDATION] Name invalid, opening validation modal');
        setFileToValidate(file);
        setShowValidationModal(true);
        return false;
      }
      console.log('  ✅ [VALIDATION] Name valid');
    }
    
    console.log('  ✅ [VALIDATION] All checks passed, returning true');
    return true;
  };

  // ✅ LANCER L'IMPORT APRÈS SÉLECTION DE SOURCES
  const proceedWithUpload = async () => {
    console.log('🚀 [UPLOAD] proceedWithUpload called');
    setIsConfirmingSelection(true); // ✅ ACTIVER LE SPINNER
    const isValid = await validateBeforeUpload();
    console.log('  - Validation result:', isValid);
    if (isValid) {
      console.log('  🚀 [UPLOAD] Calling handleUpload(true) - skip validation');
      handleUpload(true);
    } else {
      console.log('  ❌ [UPLOAD] Validation failed, stopping');
      setIsConfirmingSelection(false); // ✅ DÉSACTIVER LE SPINNER
    }
  };

  // ✅ GESTIONNAIRE PRINCIPAL D'IMPORT
  const handleUpload = async (skipValidation: boolean = false, fileToUse?: File) => {
    // ✅ UTILISER LE FICHIER RENOMMÉ S'IL EXISTE
    const filesToUpload = fileToUse ? [fileToUse] : selectedFiles;
    
    if (filesToUpload.length === 0 || !importType) {
      console.log('  ❌ [UPLOAD] No files or no type, showing alert and returning');
      alert('⚠️ Veuillez sélectionner des fichiers et un type');
      return;
    }

    // ✅ INITIALISER LA PROGRESSION
    setIsUploading(true);
    setUploadProgress(0);

    // ✅ CRÉER LES IDs UNE SEULE FOIS ET LES RÉUTILISER
    const initialFileStatuses = filesToUpload.map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
      file: f,
      progress: 0,
      status: 'pending' as const,
    }));
    setFileStatuses(initialFileStatuses);

    console.log('\n🚀 [UPLOAD] handleUpload called with skipValidation:', skipValidation);
    console.log('  📁 [UPLOAD] filesToUpload.length:', filesToUpload.length);
    console.log('  📁 [UPLOAD] filesToUpload[0].name:', filesToUpload[0]?.name);
    console.log('  📁 [UPLOAD] fileToUse param:', fileToUse?.name || 'none');
    console.log('  📁 [UPLOAD] importType:', importType);
    console.log('  📁 [UPLOAD] selectedSourceIds.length:', selectedSourceIds.length);

    // ✅ CAS 1 : AVEC fichiers sources → Utiliser useImportWorkflow avec liaison
    if (selectedSourceIds.length > 0) {
      console.log('  📁 [UPLOAD] CASE 1: WITH sources - Using useImportWorkflow with linking');

      // ✅ BOUCLER SUR TOUS LES FICHIERS
      for (let index = 0; index < filesToUpload.length; index++) {
        const file = filesToUpload[index];
        const fileId = initialFileStatuses[index].id; // ✅ UTILISER LA RÉFÉRENCE LOCALE

        console.log(`\n📁 [UPLOAD] Processing file ${index + 1}/${filesToUpload.length}:`, file.name);

        // Validation pour le premier fichier seulement
        if (index === 0 && !skipValidation) {
          console.log('  🔍 [UPLOAD] skipValidation=false, validating...');
          const isValid = await validateBeforeUpload(file);
          if (!isValid) {
            console.log('  ❌ [UPLOAD] Validation failed, returning');
            setIsUploading(false);
            return;
          }
          console.log('  ✅ [UPLOAD] Validation passed');
        }

        // ✅ METTRE À JOUR AVEC UNE FONCTION POUR ÉVITER LE STALE STATE
        setFileStatuses(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading' as const, progress: 25 } : f));
        setUploadProgress(Math.round(((index + 0.25) / filesToUpload.length) * 100));

        // Import avec liaison selon le type
        if (importType === 'transcription') {
          console.log('  📝 [UPLOAD] Importing TRANSCRIPTION with raw file(s):', selectedSourceIds);
          const result = await importTranscription(file, selectedSourceIds, skipValidation);
          console.log('  - Import result:', result);
          
          setUploadProgress(Math.round(((index + 0.75) / filesToUpload.length) * 100));
          setFileStatuses(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            status: result?.success ? 'success' as const : 'error' as const,
            progress: result?.success ? 100 : 0,
            result,
            error: result?.success ? undefined : result?.message
          } : f));
          
          if (!result?.success) {
            console.log('  ❌ [UPLOAD] Transcription import failed:', result?.message);
            setIsUploading(false);
            alert(`❌ Erreur lors de l'import du fichier ${index + 1}:\n${result?.message || 'Échec de l\'import'}`);
            return;
          }
        }

        if (importType === 'book') {
          console.log('  📖 [UPLOAD] Importing BOOK PROJECT with transcriptions:', selectedSourceIds);
          const result = await importBookProject(file, selectedSourceIds, {});
          console.log('  - Import result:', result);
          
          setUploadProgress(Math.round(((index + 0.75) / filesToUpload.length) * 100));
          setFileStatuses(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            status: result?.success ? 'success' as const : 'error' as const,
            progress: result?.success ? 100 : 0,
            result,
            error: result?.success ? undefined : result?.message
          } : f));
          
          if (!result?.success) {
            console.log('  ❌ [UPLOAD] Book project import failed:', result?.message);
            setIsUploading(false);
            alert(`❌ Erreur lors de l'import du fichier ${index + 1}:\n${result?.message || 'Échec de l\'import'}`);
            return;
          }
        }

        if (importType === 'proofreading1') {
          console.log('  👁️ [UPLOAD] Importing PROOFREADING V1 with project:', selectedSourceIds[0]);
          const result = await importProofreadingV1(file, selectedSourceIds[0], skipValidation);
          console.log('  - Import result:', result);
          
          setUploadProgress(Math.round(((index + 0.75) / filesToUpload.length) * 100));
          setFileStatuses(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            status: result?.success ? 'success' as const : 'error' as const,
            progress: result?.success ? 100 : 0,
            result,
            error: result?.success ? undefined : result?.message
          } : f));
          
          if (!result?.success) {
            console.log('  ❌ [UPLOAD] Proofreading V1 import failed:', result?.message);
            setIsUploading(false);
            alert(`❌ Erreur lors de l'import du fichier ${index + 1}:\n${result?.message || 'Échec de l\'import'}`);
            return;
          }
        }

        if (importType === 'proofreading2') {
          console.log('  👁️👁️ [UPLOAD] Importing PROOFREADING V2 with R1:', selectedSourceIds[0]);
          const result = await importProofreadingV2(file, selectedSourceIds[0], skipValidation);
          console.log('  - Import result:', result);
          
          setUploadProgress(Math.round(((index + 0.75) / filesToUpload.length) * 100));
          setFileStatuses(prev => prev.map(f => f.id === fileId ? { 
            ...f, 
            status: result?.success ? 'success' as const : 'error' as const,
            progress: result?.success ? 100 : 0,
            result,
            error: result?.success ? undefined : result?.message
          } : f));
          
          if (!result?.success) {
            console.log('  ❌ [UPLOAD] Proofreading V2 import failed:', result?.message);
            setIsUploading(false);
            alert(`❌ Erreur lors de l'import du fichier ${index + 1}:\n${result?.message || 'Échec de l\'import'}`);
            return;
          }
        }

        // Petit délai entre chaque fichier pour voir la progression
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // ✅ TOUS LES FICHIERS ONT ÉTÉ IMPORTÉS
      setUploadProgress(100);
      setFileStatuses(prev => prev.map(f => ({ ...f, progress: 100 })));

      console.log(`\n✅ [UPLOAD] All ${filesToUpload.length} file(s) imported successfully!`);

      // ✅ Délai pour afficher la progression
      await new Promise(resolve => setTimeout(resolve, 500));

      alert(`✅ ${filesToUpload.length} fichier(s) importé(s) et lié(s) avec succès !`);
      if (onImportSuccess) onImportSuccess();
      handleClose();
      return;
    }

    // ✅ CAS 2 : SANS fichiers sources → Import standalone (sans liaison)
    console.log('  📁 [UPLOAD] CASE 2: WITHOUT sources - Import standalone (no linking)');

    // Pour transcription : utiliser importTranscriptionStandalone
    if (importType === 'transcription') {
      console.log('  📝 [UPLOAD] Importing TRANSCRIPTION standalone...');

      // ✅ BOUCLER SUR TOUS LES FICHIERS
      for (let index = 0; index < filesToUpload.length; index++) {
        const file = filesToUpload[index];
        const fileId = initialFileStatuses[index].id; // ✅ UTILISER LA RÉFÉRENCE LOCALE

        setFileStatuses(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading' as const, progress: 25 } : f));
        setUploadProgress(Math.round(((index + 0.25) / filesToUpload.length) * 100));

        const result = await importTranscriptionStandalone(file);
        console.log('  - Import result:', result);

        setUploadProgress(Math.round(((index + 0.75) / filesToUpload.length) * 100));
        setFileStatuses(prev => prev.map(f => f.id === fileId ? {
          ...f,
          status: result?.success ? 'success' as const : 'error' as const,
          progress: result?.success ? 100 : 0,
          result,
          error: result?.success ? undefined : result?.message
        } : f));

        if (!result?.success) {
          console.log('  ❌ [UPLOAD] Transcription standalone import failed:', result?.message);
          setIsUploading(false);
          alert(`❌ Erreur lors de l'import du fichier ${index + 1}:\n${result?.message || 'Échec de l\'import'}`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`✅ ${filesToUpload.length} transcription(s) importée(s) !`);
      if (onImportSuccess) onImportSuccess();
      handleClose();
      return;
    }

    // Pour fichier brut : utiliser handleClassicUpload
    if (importType === 'raw') {
      console.log('  📁 [UPLOAD] Importing RAW FILE...');
      await handleClassicUpload();
      return;
    }

    // ✅ Pour projet de livre SANS source : import standalone (optionnel)
    if (importType === 'book') {
      console.log('  📖 [UPLOAD] Importing BOOK PROJECT standalone...');

      // ✅ BOUCLER SUR TOUS LES FICHIERS
      for (let index = 0; index < filesToUpload.length; index++) {
        const file = filesToUpload[index];
        const fileId = initialFileStatuses[index].id; // ✅ UTILISER LA RÉFÉRENCE LOCALE

        setFileStatuses(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading' as const, progress: 25 } : f));
        setUploadProgress(Math.round(((index + 0.25) / filesToUpload.length) * 100));

        const result = await importBookProject(file, [], {});
        console.log('  - Import result:', result);

        setUploadProgress(Math.round(((index + 0.75) / filesToUpload.length) * 100));
        setFileStatuses(prev => prev.map(f => f.id === fileId ? {
          ...f,
          status: result?.success ? 'success' as const : 'error' as const,
          progress: result?.success ? 100 : 0,
          result,
          error: result?.success ? undefined : result?.message
        } : f));

        if (!result?.success) {
          console.log('  ❌ [UPLOAD] Book project import failed:', result?.message);
          setIsUploading(false);
          alert(`❌ Erreur lors de l'import du fichier ${index + 1}:\n${result?.message || 'Échec de l\'import'}`);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`✅ ${selectedFiles.length} projet(s) de livre importé(s) !`);
      if (onImportSuccess) onImportSuccess();
      handleClose();
      return;
    }

    // Pour autres types sans source : message d'erreur
    console.log('  ❌ [UPLOAD] Import without source not supported for this type');
    setIsUploading(false);
    alert(`⚠️ L'import d'un(e) ${importType} sans source n'est pas supporté.\n\nVeuillez sélectionner une source.`);
  };

  // ✅ MÉTHODE CLASSIQUE POUR LES FICHIERS BRUTS (SANS SOURCES)
  const handleClassicUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    const initialStatuses = selectedFiles.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setFileStatuses(initialStatuses);

    let successCount = 0;
    let errorCount = 0;

    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];
      const fileId = initialStatuses[index].id;

      // ✅ 1. Validation
      const validation = validateFile(file);
      if (!validation.valid) {
        errorCount++;
        setFileStatuses(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'error' as const, error: validation.error, progress: 0 } : f
        ));
        const globalProgress = Math.round(((index + 1) / selectedFiles.length) * 100);
        setUploadProgress(globalProgress);
        continue;
      }

      // ✅ 2. Marquer comme "uploading"
      setFileStatuses(prev => prev.map(f =>
        f.id === fileId ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));

      try {
        const metadata = {
          import_type: importType,
          imported_via: 'media_library',
          original_name: file.name,
        };

        // ✅ 3. Upload RÉEL
        const result = await onUpload(file, metadata);

        // ✅ 4. Mettre à jour avec 100% GARANTI
        if (result) {
          successCount++;
          setFileStatuses(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress: 100, status: 'success' as const, result } : f
          ));
        } else {
          errorCount++;
          setFileStatuses(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress: 0, status: 'error' as const, error: 'Échec de l\'upload' } : f
          ));
        }

        // ✅ 5. Progression globale (basée sur l'index)
        const globalProgress = Math.round(((index + 1) / selectedFiles.length) * 100);
        setUploadProgress(globalProgress);

        // ✅ 6. Délai pour affichage
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err: any) {
        errorCount++;
        console.error('Erreur upload:', err);
        setFileStatuses(prev => prev.map(f =>
          f.id === fileId ? { ...f, progress: 0, status: 'error' as const, error: err.message } : f
        ));

        const globalProgress = Math.round(((index + 1) / selectedFiles.length) * 100);
        setUploadProgress(globalProgress);

        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // ✅ 7. Vérifier que TOUS les succès sont à 100%
    setFileStatuses(prev => prev.map(f =>
      f.status === 'success' ? { ...f, progress: 100 } : f
    ));

    // ✅ 8. Délai final avant fermeture
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsUploading(false);

    // ✅ 9. Message final
    if (successCount > 0) {
      alert(`✅ ${successCount}/${selectedFiles.length} fichier(s) importé(s) avec succès !`);
      handleClose();
    } else {
      alert(`❌ Échec de l'import (${errorCount} erreurs)`);
    }
  };

  const handleClose = () => {
    setShowSourceSelector(false);
    setShowValidationModal(false);
    setSelectedSourceIds([]);
    renamedFileRef.current = null; // ✅ RESET DU FICHIER RENOMMÉ
    onClose();
  };

  const handleValidationConfirm = async (renamedFile?: File) => {
    console.log('🚀 [VALIDATION] handleValidationConfirm called with renamedFile:', renamedFile?.name || 'none');
    
    setShowValidationModal(false);

    // ✅ Si un fichier renommé est passé, l'utiliser et mettre à jour TOUS les states
    if (renamedFile) {
      console.log('🏷️ [VALIDATION] Using renamed file:', renamedFile.name);
      // Mettre à jour selectedFiles avec le fichier renommé
      setSelectedFiles([renamedFile]);
      // Mettre à jour fileToValidate
      setFileToValidate(renamedFile);
      // Mettre à jour la référence locale
      renamedFileRef.current = renamedFile;
      
      // ✅ Attendre un peu que les states se mettent à jour
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // ✅ Utiliser le fichier renommé directement
      console.log('🚀 [VALIDATION] Will upload renamed file:', renamedFile.name);
      console.log('  - renamedFileRef.current:', renamedFileRef.current?.name);
      console.log('  - fileToValidate state:', fileToValidate?.name);
      
      // ✅ Passer le fichier renommé directement à handleUpload
      handleUpload(true, renamedFile); // ✅ Skip validation + fichier renommé
    } else {
      // Pas de fichier renommé, utiliser fileToValidate
      const fileToUse = fileToValidate;
      console.log('🚀 [VALIDATION] No renamed file, using fileToValidate:', fileToUse?.name);
      
      if (fileToUse) {
        handleUpload(true, fileToUse); // ✅ Skip validation + fichier à utiliser
      } else {
        console.error('❌ [VALIDATION] No file to upload!');
        setIsConfirmingSelection(false);
      }
    }
  };

  // ✅ RENOMMER LE FICHIER AVANT IMPORT
  const handleRenameFile = (newName: string, renamedFile?: File) => {
    console.log('🏷️ [RENAME] handleRenameFile called - newName:', newName);
    console.log('🏷️ [RENAME] renamedFile param:', renamedFile?.name || 'none');
    
    if (renamedFile) {
      // ✅ METTRE À JOUR LE STATE
      setSelectedFiles([renamedFile]);
      console.log('  ✅ [RENAME] setSelectedFiles updated to:', renamedFile.name);

      // ✅ METTRE À JOUR AUSSI fileToValidate ET renamedFileRef
      setFileToValidate(renamedFile);
      console.log('  ✅ [RENAME] setFileToValidate updated to:', renamedFile.name);
      
      renamedFileRef.current = renamedFile; // ✅ VARIABLE LOCALE (pas asynchrone)
      console.log('  ✅ [RENAME] renamedFileRef.current updated to:', renamedFile.name);
    }
  };

  // ✅ PETIT COMPOSANT POUR AFFICHER UN FICHIER SOURCE
  const SourceFileCard = ({ file, type = 'raw', onRemove }: { file: any, type?: string, onRemove: () => void }) => (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <i className={`fas text-xl ${
        type === 'raw' || type === 'audio' ? 'fa-music text-blue-500' :
        type === 'book' ? 'fa-book text-purple-500' :
        type === 'proofreading' ? 'fa-eye text-amber-500' :
        'fa-file-alt text-green-500'
      }`}></i>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{file.file_name || file.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {type === 'raw' && `${file.file_type} • ${(file.file_size / 1024 / 1024).toFixed(2)} MB`}
          {type === 'transcription' && `Transcription`}
          {type === 'book' && `Projet de livre`}
          {type === 'proofreading' && `Relecture 1`}
        </p>
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );

  const currentOption = importOptions.find((opt: any) => opt.id === importType);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const uploadingCount = fileStatuses.filter(f => f.status === 'uploading').length;
  const successCount = fileStatuses.filter(f => f.status === 'success').length;
  const errorCount = fileStatuses.filter(f => f.status === 'error').length;
  const pendingCount = fileStatuses.filter(f => f.status === 'pending').length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
        <div
          className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        ></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
          {/* En-tête avec effet glassmorphism */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white px-6 py-5 rounded-t-3xl flex justify-between items-center shadow-lg z-10">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <i className="fas fa-upload text-xl"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  Importer des Fichiers
                </div>
                <p className="text-purple-100 text-sm font-normal mt-0.5">
                  {importType ? `Type : ${currentOption?.title}` : 'Sélectionnez un type de fichier'}
                </p>
              </div>
            </h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-110"
              title={isUploading ? 'Upload en cours...' : 'Fermer'}
            >
              {isUploading ? (
                <i className="fas fa-spinner fa-spin text-xl"></i>
              ) : (
                <i className="fas fa-times text-xl"></i>
              )}
            </button>
          </div>

          {/* Contenu avec scrollbar personnalisée */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-purple-300 dark:scrollbar-thumb-purple-700 scrollbar-track-transparent">
            {/* Étape 1 : Choisir le type */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Choisissez le type de fichier
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {importOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (option.id === 'bulk') {
                        // ✅ OUVRIR BULK IMPORT MODAL
                        setShowBulkImportModal(true);
                      } else {
                        setImportType(option.id);
                        setSelectedFiles([]);
                        setFileStatuses([]);
                        setSelectedSourceIds([]);
                      }
                    }}
                    disabled={isUploading}
                    className={`group p-5 rounded-2xl border-2 transition-all duration-300 text-left disabled:opacity-50 hover:shadow-xl hover:-translate-y-1 ${
                      importType === option.id
                        ? `border-${option.color.split('-')[1]}-500 bg-gradient-to-br from-${option.color.split('-')[1]}-50 to-white dark:from-${option.color.split('-')[1]}-900/20 dark:to-gray-800 shadow-lg`
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${option.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      {isUploading ? (
                        <i className="fas fa-spinner fa-spin text-white text-xl"></i>
                      ) : (
                        <i className={`fas ${option.icon} text-white text-xl`}></i>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{option.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Étape 2 : Sélectionner les fichiers */}
            {importType && currentOption && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Sélectionnez vos fichiers
                </h3>

                {!isUploading && (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-3 border-dashed border-purple-300 dark:border-purple-600 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-500 hover:bg-gradient-to-br hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all duration-300 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 shadow-inner"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={currentOption.accepted}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                      <i className="fas fa-cloud-upload-alt text-4xl text-white"></i>
                    </div>
                    <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      Glissez-déposez vos fichiers ici
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      ou cliquez pour parcourir
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
                      <i className="fas fa-folder-open"></i>
                      Formats : {currentOption.accepted}
                    </div>
                  </div>
                )}

                {/* LISTE DES FICHIERS */}
                {fileStatuses.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {/* ✅ BARRE DE PROGRESSION GLOBALE */}
                    {isUploading && (
                      <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            <i className="fas fa-upload mr-2"></i>
                            Progression globale
                          </p>
                          <p className="text-sm font-bold text-purple-900 dark:text-purple-100">
                            {successCount + errorCount} / {fileStatuses.length} fichiers
                          </p>
                        </div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300 flex items-center justify-end pr-2"
                            style={{ width: `${uploadProgress}%` }}
                          >
                            <span className="text-xs text-white font-bold">{uploadProgress}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            {successCount} réussi(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            {errorCount} erreur(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            {pendingCount} en attente
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {fileStatuses.length} fichier(s) sélectionné(s)
                      </p>
                      <button
                        onClick={() => {
                          setSelectedFiles([]);
                          setFileStatuses([]);
                          setSelectedSourceIds([]);
                        }}
                        disabled={isUploading}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isUploading ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Nettoyage...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-trash"></i>
                            Tout retirer
                          </>
                        )}
                      </button>
                    </div>

                    {fileStatuses.map((fileStatus) => (
                      <div
                        key={fileStatus.id}
                        className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 transition-all duration-200"
                      >
                        <div className="flex-shrink-0 w-10 flex items-center justify-center">
                          {fileStatus.status === 'pending' && (
                            <i className="fas fa-file text-gray-400 text-xl"></i>
                          )}
                          {fileStatus.status === 'uploading' && (
                            <i className="fas fa-spinner fa-spin text-blue-500 text-xl"></i>
                          )}
                          {fileStatus.status === 'success' && (
                            <i className="fas fa-check-circle text-green-500 text-xl"></i>
                          )}
                          {fileStatus.status === 'error' && (
                            <i className="fas fa-times-circle text-red-500 text-xl"></i>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {fileStatus.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                            {fileStatus.status === 'uploading' && ' • En cours...'}
                            {fileStatus.status === 'success' && ' • ✅ Terminé'}
                            {fileStatus.status === 'error' && ' • ❌ Erreur'}
                          </p>

                          {/* ✅ BARRE DE PROGRESSION INDIVIDUELLE - TOUJOURS VISIBLE */}
                          <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 flex items-center justify-end pr-1 ${
                                fileStatus.status === 'success'
                                  ? 'bg-green-500'
                                  : fileStatus.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
                              } ${fileStatus.status === 'uploading' ? 'animate-pulse' : ''}`}
                              style={{ width: `${fileStatus.progress}%` }}
                            >
                              {fileStatus.progress > 0 && fileStatus.progress < 100 && (
                                <span className="text-xs text-white font-bold">{fileStatus.progress}%</span>
                              )}
                            </div>
                          </div>

                          {fileStatus.status === 'error' && fileStatus.error && (
                            <p className="mt-1 text-xs text-red-500">
                              {fileStatus.error}
                            </p>
                          )}
                        </div>
                        {/* ✅ BOUTON POUR RETIRER LE FICHIER */}
                        {!isUploading && (
                          <button
                            onClick={() => {
                              const index = fileStatuses.findIndex(f => f.id === fileStatus.id);
                              if (index !== -1) {
                                const newFiles = selectedFiles.filter((_, i) => i !== index);
                                const newStatuses = fileStatuses.filter((_, i) => i !== index);
                                setSelectedFiles(newFiles);
                                setFileStatuses(newStatuses);
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                            title="Retirer ce fichier"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ✅ BOUTON POUR SÉLECTIONNER LES FICHIERS SOURCES */}
                {importType && selectedFiles.length > 0 && importType !== 'raw' && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-link text-blue-600 dark:text-blue-400 text-xl"></i>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {importType === 'transcription' && '📁 Fichier(s) brut(s) source(s)'}
                            {importType === 'book' && '📄 Transcription(s) source(s)'}
                            {importType === 'proofreading1' && '📖 Projet de livre source'}
                            {importType === 'proofreading2' && '👁️ Relecture 1 source'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {importType === 'transcription' && 'Optionnel - Plusieurs fichiers possibles'}
                            {importType === 'book' && 'Optionnel - Plusieurs transcriptions possibles'}
                            {importType === 'proofreading1' && 'Obligatoire - Un seul projet (unicité)'}
                            {importType === 'proofreading2' && 'Obligatoire - Une seule R1 (unicité)'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowSourceSelector(true)}
                        disabled={
                          isUploading ||
                          (importType === 'proofreading1' && selectedSourceIds.length >= 1) ||
                          (importType === 'proofreading2' && selectedSourceIds.length >= 1)
                        }
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Chargement...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-folder-open"></i>
                            {selectedSourceIds.length === 0
                              ? 'Sélectionner'
                              : selectedSourceIds.length === 1
                                ? 'Modifier'
                                : `${selectedSourceIds.length} sélectionné(s)`}
                          </>
                        )}
                      </button>
                    </div>
                    
                    {selectedSourceIds.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {/* Affichage des sources sélectionnées selon le type */}
                        {importType === 'transcription' && rawFiles?.filter((f: any) => selectedSourceIds.includes(f.id)).map((file: any) => (
                          <SourceFileCard key={file.id} file={file} onRemove={() => setSelectedSourceIds(selectedSourceIds.filter(id => id !== file.id))} />
                        ))}
                        {importType === 'book' && transcriptions?.filter((f: any) => selectedSourceIds.includes(f.id)).map((file: any) => (
                          <SourceFileCard key={file.id} file={file} type="transcription" onRemove={() => setSelectedSourceIds(selectedSourceIds.filter(id => id !== file.id))} />
                        ))}
                        {importType === 'proofreading1' && bookProjects?.filter((f: any) => selectedSourceIds.includes(f.id)).map((file: any) => (
                          <SourceFileCard key={file.id} file={file} type="book" onRemove={() => setSelectedSourceIds([])} />
                        ))}
                        {importType === 'proofreading2' && proofreadingV1?.filter((f: any) => selectedSourceIds.includes(f.id)).map((file: any) => (
                          <SourceFileCard key={file.id} file={file} type="proofreading" onRemove={() => setSelectedSourceIds([])} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-8 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:from-gray-300 disabled:to-gray-400 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    En cours...
                  </span>
                ) : (
                  'Annuler'
                )}
              </button>
              <button
                onClick={() => handleUpload()}
                disabled={selectedFiles.length === 0 || isUploading || !importType}
                className="px-8 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {isUploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Import en cours... ({successCount}/{selectedFiles.length})
                  </>
                ) : (
                  <>
                    <i className="fas fa-upload"></i>
                    Importer {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MODAL DE VALIDATION */}
      {showValidationModal && fileToValidate && (
        <ValidationModal
          isOpen={showValidationModal}
          onClose={() => {
            setShowValidationModal(false);
            setFileToValidate(null);
          }}
          onConfirm={handleValidationConfirm}
          onRename={handleRenameFile}
          validationType={importType === 'proofreading1' ? 'proofreading_v1' : importType === 'proofreading2' ? 'proofreading_v2' : 'transcription'}
          file={fileToValidate}
          linkedEntityId={selectedSourceIds[0]}
          linkedEntityName={(() => {
            const name = importType === 'transcription'
              ? rawFiles?.find((f: any) => f.id === selectedSourceIds[0])?.file_name || ''
              : importType === 'proofreading1'
                ? bookProjects?.find((p: any) => p.id === selectedSourceIds[0])?.title || ''
                : importType === 'proofreading2'
                  ? proofreadingV1?.find((r1: any) => r1.id === selectedSourceIds[0])?.book_project_title || ''
                  : '';
            return name;
          })()}
        />
      )}

      {/* ✅ BULK IMPORT MODAL */}
      {showBulkImportModal && (
        <BulkImportModal
          isOpen={showBulkImportModal}
          onClose={() => {
            setShowBulkImportModal(false);
          }}
          rawFiles={rawFiles}
          transcriptions={transcriptions}
          bookProjects={bookProjects}
          proofreadingV1={proofreadingV1}
          onImportSuccess={() => {
            setShowBulkImportModal(false);
            if (onImportSuccess) onImportSuccess();
          }}
          uploadRawFile={uploadRawFile}
        />
      )}

      {/* ✅ SÉLECTEUR DE FICHIERS SOURCES */}
      {showSourceSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowSourceSelector(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <i className="fas fa-folder-open"></i>
                {importType === 'transcription' && 'Sélectionner des Fichiers Bruts'}
                {importType === 'book' && 'Sélectionner des Transcriptions'}
                {importType === 'proofreading1' && 'Sélectionner un Projet de Livre'}
                {importType === 'proofreading2' && 'Sélectionner une Relecture 1'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {importType === 'transcription' && 'Plusieurs fichiers bruts possibles pour une transcription'}
                {importType === 'book' && 'Plusieurs transcriptions possibles pour un projet'}
                {importType === 'proofreading1' && 'Un seul projet de livre (unicité)'}
                {importType === 'proofreading2' && 'Une seule relecture 1 (unicité)'}
              </p>
            </div>
            <div className="p-6">
              {/* Liste selon le type */}
              {importType === 'transcription' && rawFiles?.length === 0 && (
                <NoDataSourceMessage type="fichier brut" />
              )}
              {importType === 'book' && transcriptions?.length === 0 && (
                <NoDataSourceMessage type="transcription" />
              )}
              {importType === 'proofreading1' && bookProjects?.length === 0 && (
                <NoDataSourceMessage type="projet de livre" />
              )}
              {importType === 'proofreading2' && proofreadingV1?.length === 0 && (
                <NoDataSourceMessage type="relecture 1" />
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {importType === 'transcription' && rawFiles?.filter((f: any) => f.status === 'libre' || f.status === 'traité').map((file: any) => (
                  <SourceSelectorItem
                    key={file.id}
                    file={file}
                    type="raw"
                    isSelected={selectedSourceIds.includes(file.id)}
                    isSingleSelect={false}
                    onSelect={() => {
                      if (selectedSourceIds.includes(file.id)) {
                        setSelectedSourceIds(selectedSourceIds.filter(id => id !== file.id));
                      } else {
                        setSelectedSourceIds([...selectedSourceIds, file.id]);
                      }
                    }}
                  />
                ))}
                {importType === 'book' && transcriptions?.map((file: any) => (
                  <SourceSelectorItem
                    key={file.id}
                    file={file}
                    type="transcription"
                    isSelected={selectedSourceIds.includes(file.id)}
                    isSingleSelect={false}
                    onSelect={() => {
                      if (selectedSourceIds.includes(file.id)) {
                        setSelectedSourceIds(selectedSourceIds.filter(id => id !== file.id));
                      } else {
                        setSelectedSourceIds([...selectedSourceIds, file.id]);
                      }
                    }}
                  />
                ))}
                {importType === 'proofreading1' && bookProjects?.map((file: any) => (
                  <SourceSelectorItem
                    key={file.id}
                    file={file}
                    type="book"
                    isSelected={selectedSourceIds.includes(file.id)}
                    isSingleSelect={true}
                    onSelect={() => setSelectedSourceIds([file.id])}
                  />
                ))}
                {importType === 'proofreading2' && proofreadingV1?.map((file: any) => (
                  <SourceSelectorItem
                    key={file.id}
                    file={file}
                    type="proofreading"
                    isSelected={selectedSourceIds.includes(file.id)}
                    isSingleSelect={true}
                    onSelect={() => setSelectedSourceIds([file.id])}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedSourceIds.length} fichier(s) sélectionné(s)
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSourceSelector(false);
                      setIsConfirmingSelection(false);
                    }}
                    disabled={isConfirmingSelection}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    {isConfirmingSelection ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Annulation...
                      </>
                    ) : (
                      'Annuler'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowSourceSelector(false);
                      proceedWithUpload();
                    }}
                    disabled={selectedSourceIds.length === 0 || isConfirmingSelection}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    {isConfirmingSelection ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Validation...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle"></i>
                        Confirmer ({selectedSourceIds.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ✅ COMPOSANT : Message "Aucune donnée"
const NoDataSourceMessage = ({ type }: { type: string }) => (
  <div className="text-center py-8 mb-4">
    <i className="fas fa-inbox text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
    <p className="text-gray-600 dark:text-gray-400">Aucun {type} disponible</p>
    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Importez d'abord des {type}s</p>
  </div>
);

// ✅ COMPOSANT : Item de sélection
const SourceSelectorItem = ({ file, type, isSelected, isSingleSelect, onSelect }: {
  file: any, type: string, isSelected: boolean, isSingleSelect: boolean, onSelect: () => void
}) => (
  <button
    onClick={onSelect}
    className={`w-full p-4 border-2 rounded-xl transition-all duration-200 text-left ${
      isSelected
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        type === 'raw' || type === 'audio' ? 'bg-blue-100 dark:bg-blue-900/30' :
        type === 'transcription' ? 'bg-green-100 dark:bg-green-900/30' :
        type === 'book' ? 'bg-purple-100 dark:bg-purple-900/30' :
        'bg-amber-100 dark:bg-amber-900/30'
      }`}>
        <i className={`fas text-lg ${
          type === 'raw' || type === 'audio' ? 'fa-music text-blue-600 dark:text-blue-400' :
          type === 'transcription' ? 'fa-file-alt text-green-600 dark:text-green-400' :
          type === 'book' ? 'fa-book text-purple-600 dark:text-purple-400' :
          'fa-eye text-amber-600 dark:text-amber-400'
        }`}></i>
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">
          {type === 'book' 
            ? (file.title || 'Sans titre') // ✅ PROJET : utiliser title
            : file.file_name || file.title || (type === 'proofreading' && file.book_project_title ? `${file.book_project_title}_R1` : 'Sans nom')}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {type === 'raw' && `${file.file_type} • ${(file.file_size / 1024 / 1024).toFixed(2)} MB • ${file.status}`}
          {type === 'transcription' && `Transcription • ${file.status || 'imported'}`}
          {type === 'book' && `Projet de livre • ${file.status || 'projet_de_livre'}`}
          {type === 'proofreading' && `Relecture 1 • ${file.status || 'proofreading_1'}${file.book_project_title ? ` • ${file.book_project_title}_R1` : ''}`}
        </p>
      </div>
      {isSelected && <i className="fas fa-check-circle text-blue-500 text-xl"></i>}
      {!isSelected && isSingleSelect && <i className="far fa-circle text-gray-400 text-xl"></i>}
      {!isSelected && !isSingleSelect && <i className="far fa-square text-gray-400 text-xl"></i>}
    </div>
  </button>
);

export default ImportModal;

// ✅ STYLES POUR SCROLLBAR PERSONNALISÉE
const scrollbarStyles = `
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #c4b5fd;
    border-radius: 3px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #8b5cf6;
  }
  .dark .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #7c3aed;
  }
  .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #6d28d9;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = scrollbarStyles;
  document.head.appendChild(styleSheet);
}
