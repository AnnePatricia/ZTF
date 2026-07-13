import React, { useState, useRef } from "react";
// import { useFileValidation } from "../../../hooks/useFileValidation"; // ← Pour utilisation future
import { useImportWorkflow } from "../../../hooks/useImportWorkflow";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawFiles?: any[];
  transcriptions?: any[];
  bookProjects?: any[];
  proofreadingV1?: any[];
  onImportSuccess?: () => void;
  uploadRawFile?: (file: File, metadata?: Record<string, any>) => Promise<any>;
}

interface FileSource {
  files: File[];
  entities: any[];
}

interface FilePair {
  id: string;
  sources: FileSource;
  target: File;
  pairingType: PairingType;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  results?: {
    uploadedFiles?: any[];
    createdEntities?: any[];
  };
}

interface ImportReport {
  totalPairs: number;
  successCount: number;
  errorCount: number;
  ignoredCount: number;
  details: {
    success: Array<{ pairId: string; message: string }>;
    errors: Array<{ pairId: string; error: string }>;
    ignored: Array<{ pairId: string; reason: string }>;
  };
}

type PairingType = 'raw-transcription' | 'transcription-book' | 'book-proofreading1' | 'proofreading1-proofreading2';
type EditMode = 'none' | 'dissociate' | 'reassign';

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  rawFiles = [],
  transcriptions = [],
  bookProjects = [],
  proofreadingV1 = [],
  onImportSuccess,
  uploadRawFile
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pairingType, setPairingType] = useState<PairingType | null>(null);
  const [filePairs, setFilePairs] = useState<FilePair[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [draggedPairIndex, setDraggedPairIndex] = useState<number | null>(null);
  const [selectedPairForEdit, setSelectedPairForEdit] = useState<[number, number] | null>(null);
  const [selectedPairsForDissociate, setSelectedPairsForDissociate] = useState<number[]>([]);

  // États pour la sélection hybride (utile pour la suite)
  const [filesFromMachine, setFilesFromMachine] = useState<File[]>([]);
  const [entitiesFromPlatform, setEntitiesFromPlatform] = useState<{
    type: 'raw' | 'transcription' | 'book' | 'proofreading1';
    ids: string[];
    entities: any[];
  }>({ type: 'raw', ids: [], entities: [] });

  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  // ✅ MODE D'APPARIEMENT : 1↔1 ou N↔1
  const [pairingMode, setPairingMode] = useState<'one-to-one' | 'many-to-one'>('one-to-one');

  // ✅ VÉRIFIER SI LE MODE N↔1 EST AUTORISÉ
  const isManyToManyAllowed = () => {
    // Seul raw-transcription et transcription-book autorisent N↔1
    return pairingType === 'raw-transcription' || pairingType === 'transcription-book';
  };

  // ✅ CHANGER LE MODE (avec vérification)
  const handlePairingModeChange = (mode: 'one-to-one' | 'many-to-one') => {
    if (mode === 'many-to-one' && !isManyToManyAllowed()) {
      alert('⚠️ Ce type d\'appariement ne permet que le mode 1↔1');
      return;
    }
    setPairingMode(mode);
  };

  // ✅ ÉTATS POUR VALIDATION GROUPÉE
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [filesToValidate, setFilesToValidate] = useState<Array<{
    id: string;
    originalName: string;
    proposedName: string;
    isValid: boolean;
    pairIndex: number;
  }>>([]);

  // États pour dissociation/réassociation
  const [unpairedFiles, setUnpairedFiles] = useState<{ file1s: File[], file2s: File[] }>({ file1s: [], file2s: [] });
  const [draggedFile1Index, setDraggedFile1Index] = useState<number | null>(null);
  const [draggedFile2Index, setDraggedFile2Index] = useState<number | null>(null);
  const [selectedFile1Indices, setSelectedFile1Indices] = useState<number[]>([]); // ✅ PLUSIEURS fichiers 1
  const [selectedFile2Index, setSelectedFile2Index] = useState<number | null>(null); // ✅ 1 fichier 2

  const { importTranscription, importBookProject, importProofreadingV1, importProofreadingV2 } = useImportWorkflow();

  // ✅ FORCER MODE 1↔1 POUR R1 ET R2
  React.useEffect(() => {
    if (pairingType === 'book-proofreading1' || pairingType === 'proofreading1-proofreading2') {
      setPairingMode('one-to-one');
    }
  }, [pairingType]);

  // Options d'appariement
  const pairingOptions = [
    {
      id: 'raw-transcription' as PairingType,
      title: 'Fichier Brut → Transcription',
      icon: 'fa-arrow-right',
      color: 'from-blue-500 to-green-500',
      description: 'Importer des bruts et les lier à des transcriptions',
      file1Label: 'Fichiers Bruts (MP3, PDF, Image)',
      file2Label: 'Transcriptions (.txt, .doc, .docx)',
      file1Accept: '.mp3,.wav,.mp4,.pdf,.jpg,.jpeg,.png',
      file2Accept: '.txt,.doc,.docx'
    },
    {
      id: 'transcription-book' as PairingType,
      title: 'Transcription → Projet de Livre',
      icon: 'fa-book',
      color: 'from-green-500 to-purple-500',
      description: 'Lier des transcriptions à des projets de livre',
      file1Label: 'Transcriptions (.txt, .doc, .docx)',
      file2Label: 'Projets de Livre (.txt, .doc, .docx, .pdf)',
      file1Accept: '.txt,.doc,.docx',
      file2Accept: '.txt,.doc,.docx,.pdf'
    },
    {
      id: 'book-proofreading1' as PairingType,
      title: 'Projet de Livre → Relecture 1',
      icon: 'fa-eye',
      color: 'from-purple-500 to-amber-500',
      description: 'Créer des relectures 1 liées aux projets',
      file1Label: 'Projets de Livre (.txt, .doc, .docx, .pdf)',
      file2Label: 'Relectures 1 (.txt, .doc, .docx, .pdf)',
      file1Accept: '.txt,.doc,.docx,.pdf',
      file2Accept: '.txt,.doc,.docx,.pdf'
    },
    {
      id: 'proofreading1-proofreading2' as PairingType,
      title: 'Relecture 1 → Relecture 2',
      icon: 'fa-eye-double',
      color: 'from-amber-500 to-red-500',
      description: 'Créer des relectures 2 liées aux relectures 1',
      file1Label: 'Relectures 1 (.txt, .doc, .docx, .pdf)',
      file2Label: 'Relectures 2 (.txt, .doc, .docx, .pdf)',
      file1Accept: '.txt,.doc,.docx,.pdf',
      file2Accept: '.txt,.doc,.docx,.pdf'
    }
  ];

  // Détecter le type d'un fichier (avec contexte)
  const detectFileType = (file: File, context?: PairingType): 'raw' | 'transcription' | 'proofreading1' | 'proofreading2' | 'book' => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const name = file.name.toLowerCase();

    // Fichiers audio/image → toujours raw
    if (['mp3', 'wav', 'mp4', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      return 'raw';
    }

    // Vérifier les indices dans le nom (_R1, _R2)
    if (name.includes('_r2')) return 'proofreading2';
    if (name.includes('_r1')) return 'proofreading1';

    // PDF → dépend du contexte
    if (ext === 'pdf') {
      // Pour raw-transcription → PDF est un fichier brut
      if (context === 'raw-transcription') {
        return 'raw';
      }
      // Pour book-proofreading1 → PDF peut être book ou proofreading
      if (context === 'book-proofreading1') {
        return 'book';
      }
      // Par défaut → book
      return 'book';
    }

    // Fichiers texte → transcription
    if (['txt', 'doc', 'docx'].includes(ext || '')) {
      return 'transcription';
    }

    return 'transcription';
  };

  // Filtrer les fichiers par type (avec contexte)
  const filterFilesByType = (files: File[], type: string): File[] => {
    return files.filter(file => detectFileType(file, pairingType || undefined) === type);
  };

  // Apparier automatiquement les fichiers (avec mode 1↔1 ou N↔1)
  const autoPairFiles = () => {
    console.log('🔮 [AUTO PAIR] Called!', { pairingType, pairingMode, selectedFiles: selectedFiles.length });
    
    if (!pairingType) {
      alert('⚠️ Veuillez d\'abord choisir un type d\'appariement');
      return;
    }

    const pairs: FilePair[] = [];

    if (pairingType === 'raw-transcription') {
      const rawFilesFromMachine = filterFilesByType(selectedFiles, 'raw');
      const transcriptionFiles = filterFilesByType(selectedFiles, 'transcription');

      console.log('📊 [AUTO PAIR] Detection:', { raw: rawFilesFromMachine.length, trans: transcriptionFiles.length });

      if (rawFilesFromMachine.length === 0 || transcriptionFiles.length === 0) {
        alert(`⚠️ Fichiers insuffisants :\n\n• Bruts détectés : ${rawFilesFromMachine.length}\n• Transcriptions détectées : ${transcriptionFiles.length}`);
        return;
      }

      // ✅ MODE N↔1 : Toutes les sources → 1 cible
      if (pairingMode === 'many-to-one') {
        transcriptionFiles.forEach((transcription) => {
          pairs.push({
            id: `pair_${Date.now()}_${pairs.length}`,
            sources: { files: [...rawFilesFromMachine], entities: [] },
            target: transcription,
            pairingType: 'raw-transcription',
            progress: 0,
            status: 'pending'
          });
        });
      }
      // ✅ MODE 1↔1 : 1 source → 1 cible (appariement par nom OU par index)
      else {
        const pairedTranscriptions = new Set<string>();
        
        // Étape 1 : Apparier par nom exact
        rawFilesFromMachine.forEach((rawFile) => {
          const rawBaseName = rawFile.name.split('.').slice(0, -1).join('.');
          
          const matchingTranscription = transcriptionFiles.find(trans => {
            const transBaseName = trans.name.split('.').slice(0, -1).join('.');
            return transBaseName === rawBaseName && !pairedTranscriptions.has(trans.name);
          });

          if (matchingTranscription) {
            pairs.push({
              id: `pair_${Date.now()}_${pairs.length}`,
              sources: { files: [rawFile], entities: [] },
              target: matchingTranscription,
              pairingType: 'raw-transcription',
              progress: 0,
              status: 'pending'
            });
            pairedTranscriptions.add(matchingTranscription.name);
          }
        });
        
        // Étape 2 : Apparier les restants par index
        const unpairedRaws = rawFilesFromMachine.filter(raw =>
          !pairs.some(p => p.sources.files[0]?.name === raw.name)
        );
        const unpairedTranscriptions = transcriptionFiles.filter(trans =>
          !pairedTranscriptions.has(trans.name)
        );

        const minCount = Math.min(unpairedRaws.length, unpairedTranscriptions.length);
        for (let i = 0; i < minCount; i++) {
          pairs.push({
            id: `pair_${Date.now()}_${pairs.length}`,
            sources: { files: [unpairedRaws[i]], entities: [] },
            target: unpairedTranscriptions[i],
            pairingType: 'raw-transcription',
            progress: 0,
            status: 'pending'
          });
        }
      }
    }

    if (pairingType === 'transcription-book') {
      const transcriptionsFromMachine = filterFilesByType(selectedFiles, 'transcription');
      const projectFiles = filterFilesByType(selectedFiles, 'book');

      if (projectFiles.length > 0) {
        // ✅ MODE N↔1 : Toutes les transcriptions → 1 projet
        if (pairingMode === 'many-to-one') {
          projectFiles.forEach((project) => {
            pairs.push({
              id: `pair_${Date.now()}_${pairs.length}`,
              sources: { files: transcriptionsFromMachine, entities: [] },
              target: project,
              pairingType: 'transcription-book',
              progress: 0,
              status: 'pending'
            });
          });
        }
        // ✅ MODE 1↔1 : 1 transcription → 1 projet
        else {
          const minCount = Math.min(transcriptionsFromMachine.length, projectFiles.length);
          for (let i = 0; i < minCount; i++) {
            pairs.push({
              id: `pair_${Date.now()}_${pairs.length}`,
              sources: { files: [transcriptionsFromMachine[i]], entities: [] },
              target: projectFiles[i],
              pairingType: 'transcription-book',
              progress: 0,
              status: 'pending'
            });
          }
        }
      }
    }

    if (pairingType === 'book-proofreading1') {
      const projectsFromMachine = filterFilesByType(selectedFiles, 'book');
      const r1Files = filterFilesByType(selectedFiles, 'proofreading1');
      const minCount = Math.min(projectsFromMachine.length, r1Files.length);

      for (let i = 0; i < minCount; i++) {
        pairs.push({
          id: `pair_${Date.now()}_${pairs.length}`,
          sources: { files: [projectsFromMachine[i]], entities: [] },
          target: r1Files[i],
          pairingType: 'book-proofreading1',
          progress: 0,
          status: 'pending'
        });
      }
    }

    if (pairingType === 'proofreading1-proofreading2') {
      const r1FromPlatform = entitiesFromPlatform.type === 'proofreading1' ? entitiesFromPlatform.entities : [];
      const r2Files = filterFilesByType(selectedFiles, 'proofreading2');
      const minCount = Math.min(r1FromPlatform.length, r2Files.length);

      for (let i = 0; i < minCount; i++) {
        pairs.push({
          id: `pair_${Date.now()}_${pairs.length}`,
          sources: { files: [], entities: [r1FromPlatform[i]] },
          target: r2Files[i],
          pairingType: 'proofreading1-proofreading2',
          progress: 0,
          status: 'pending'
        });
      }
    }

    setFilePairs(pairs);
  };

  // Supprimer une paire
  const removePair = (pairId: string) => {
    setFilePairs(prev => prev.filter(p => p.id !== pairId));
  };

  // Toggle sélection pour dissociation
  const togglePairSelectionForDissociate = (index: number) => {
    setSelectedPairsForDissociate(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  // ✅ DISSOCIATION INDIVIDUELLE (une paire à la fois)
  const dissociateSinglePair = (pairIndex: number) => {
    const pair = filePairs[pairIndex];
    
    // Ajouter les fichiers à unpairedFiles
    const allFile1s: File[] = [];
    const allFile2s: File[] = [];
    
    // ✅ TOUS les fichiers sources vont dans file1s (peut être N fichiers)
    pair.sources.files.forEach(file => {
      allFile1s.push(file);
    });
    
    // ✅ La cible va dans file2s (1 fichier)
    allFile2s.push(pair.target);
    
    setUnpairedFiles(prev => ({
      file1s: [...prev.file1s, ...allFile1s],
      file2s: [...prev.file2s, ...allFile2s]
    }));
    
    // Supprimer la paire
    const newPairs = filePairs.filter((_, i) => i !== pairIndex);
    setFilePairs(newPairs);
    setEditMode('reassign');
  };

  // Dissocier les paires sélectionnées (multiple)
  const dissociateSelectedPairs = () => {
    if (selectedPairsForDissociate.length === 0) return;

    const sortedIndices = [...selectedPairsForDissociate].sort((a, b) => b - a);
    
    // Récupérer TOUS les fichiers AVANT de mettre à jour
    const allFile1s: File[] = [];
    const allFile2s: File[] = [];
    
    sortedIndices.forEach(pairIndex => {
      const pair = filePairs[pairIndex];
      // ✅ TOUS les fichiers source → file1s
      pair.sources.files.forEach(file => {
        allFile1s.push(file);
      });
      // ✅ La cible → file2s
      allFile2s.push(pair.target);
    });

    // Mettre à jour une seule fois
    setUnpairedFiles(prev => ({
      file1s: [...prev.file1s, ...allFile1s],
      file2s: [...prev.file2s, ...allFile2s]
    }));

    const newPairs = filePairs.filter((_, i) => !selectedPairsForDissociate.includes(i));
    setFilePairs(newPairs);
    setSelectedPairsForDissociate([]);
    setEditMode('reassign');
  };

  // ✅ DRAG AND DROP POUR FICHIERS NON APPARIÉS
  const handleFile1DragStart = (index: number) => {
    setDraggedFile1Index(index);
  };

  const handleFile2DragStart = (index: number) => {
    setDraggedFile2Index(index);
  };

  const handleFile1Drop = (targetIndex: number) => {
    if (draggedFile1Index === null || draggedFile1Index === targetIndex) return;
    
    const newFile1s = [...unpairedFiles.file1s];
    const dragged = newFile1s[draggedFile1Index];
    newFile1s.splice(draggedFile1Index, 1);
    newFile1s.splice(targetIndex, 0, dragged);
    
    setUnpairedFiles(prev => ({ ...prev, file1s: newFile1s }));
    setDraggedFile1Index(null);
  };

  const handleFile2Drop = (targetIndex: number) => {
    if (draggedFile2Index === null || draggedFile2Index === targetIndex) return;
    
    const newFile2s = [...unpairedFiles.file2s];
    const dragged = newFile2s[draggedFile2Index];
    newFile2s.splice(draggedFile2Index, 1);
    newFile2s.splice(targetIndex, 0, dragged);
    
    setUnpairedFiles(prev => ({ ...prev, file2s: newFile2s }));
    setDraggedFile2Index(null);
  };

  // ✅ RÉASSOCIER DES FICHIERS (PLUSIEURS file1s → 1 file2)
  const reassignFiles = () => {
    // Vérifier qu'on a au moins 1 fichier 1 et 1 fichier 2
    if (selectedFile1Indices.length === 0 || selectedFile2Index === null) return;
    
    const file1s = selectedFile1Indices.map(idx => unpairedFiles.file1s[idx]);
    const file2 = unpairedFiles.file2s[selectedFile2Index];

    const newPair: FilePair = {
      id: `pair_${Date.now()}_${filePairs.length}`,
      sources: { files: file1s, entities: [] },
      target: file2,
      pairingType: pairingType || 'raw-transcription',
      progress: 0,
      status: 'pending'
    };

    setFilePairs(prev => [...prev, newPair]);
    
    // Supprimer les fichiers réassociés (en ordre décroissant pour ne pas casser les index)
    const newFile1s = unpairedFiles.file1s.filter((_, i) => !selectedFile1Indices.includes(i));
    const newFile2s = unpairedFiles.file2s.filter((_, i) => i !== selectedFile2Index);
    
    setUnpairedFiles({
      file1s: newFile1s,
      file2s: newFile2s
    });
    
    // Reset sélection
    setSelectedFile1Indices([]);
    setSelectedFile2Index(null);
  };

  // ✅ SÉLECTIONNER UN FICHIER 1 (peut en sélectionner PLUSIEURS)
  const handleFile1Select = (index: number) => {
    setSelectedFile1Indices(prev => {
      if (prev.includes(index)) {
        // Dé-sélectionner
        return prev.filter(i => i !== index);
      } else {
        // Sélectionner
        return [...prev, index];
      }
    });
  };

  // ✅ SÉLECTIONNER UN FICHIER 2 (un seul)
  const handleFile2Select = (index: number) => {
    setSelectedFile2Index(index);
  };

  // ✅ SUPPRIMER UN FICHIER NON APPARIÉ
  const removeUnpairedFile = (type: 'file1' | 'file2', index: number) => {
    setUnpairedFiles(prev => ({
      file1s: type === 'file1' ? prev.file1s.filter((_, i) => i !== index) : prev.file1s,
      file2s: type === 'file2' ? prev.file2s.filter((_, i) => i !== index) : prev.file2s
    }));
    // Reset sélection si on supprime un fichier sélectionné
    if (type === 'file1' && selectedFile1Indices.includes(index)) {
      setSelectedFile1Indices(prev => prev.filter(i => i !== index));
    }
    if (type === 'file2' && selectedFile2Index === index) {
      setSelectedFile2Index(null);
    }
  };

  // ✅ VALIDATION GROUPÉE - PRÉPARER LES FICHIERS À VALIDER
  const prepareFilesForValidation = () => {
    if (!pairingType) return;

    // ✅ VÉRIFIER LES DOUBLONS (fichiers déjà dans la plateforme)
    const duplicates: string[] = [];

    if (pairingType === 'raw-transcription') {
      // Vérifier si les transcriptions existent déjà
      selectedFiles.forEach(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['txt', 'doc', 'docx'].includes(ext || '')) {
          const existingTranscription = transcriptions?.find(t => t.title === file.name);
          if (existingTranscription) {
            duplicates.push(`Transcription: ${file.name}`);
          }
        }
      });
    }

    if (pairingType === 'book-proofreading1') {
      // Vérifier si le projet a déjà une R1
      filePairs.forEach(pair => {
        const projectId = pair.sources.entities[0]?.id || pair.sources.files[0]?.name;
        if (projectId) {
          const existingR1 = proofreadingV1?.find((r1: any) => {
            // Vérifier par ID si c'est une entité plateforme, ou par nom si c'est un fichier
            return r1.book_project_id === projectId || 
                   (pair.sources.entities[0] && r1.book_project_id === pair.sources.entities[0].id);
          });
          if (existingR1 && !existingR1.is_deleted) {
            duplicates.push(`Projet "${projectId}" a déjà une relecture 1`);
          }
        }
      });
    }

    if (pairingType === 'proofreading1-proofreading2') {
      // Vérifier si R1 a déjà une R2
      filePairs.forEach(pair => {
        const r1Id = pair.sources.entities[0]?.id;
        if (r1Id) {
          const existingR2 = proofreadingV1?.some((r1: any) => {
            const r2List = r1.proofreading_v2 || [];
            return r2List.some((r2: any) => r2.proofreading_v1_id === r1Id && !r2.is_deleted);
          });
          if (existingR2) {
            duplicates.push(`Cette relecture 1 a déjà une relecture 2`);
          }
        }
      });
    }

    if (duplicates.length > 0) {
      const confirmOverride = window.confirm(
        `⚠️ Fichiers en doublon détectés :\n\n${duplicates.join('\n')}\n\nVoulez-vous quand même continuer ?`
      );
      if (!confirmOverride) {
        setIsUploading(false);
        return;
      }
    }

    const filesToValidate = filePairs.map((pair, index) => {
      const sourceFile = pair.sources.files.length > 0
        ? pair.sources.files[0]
        : pair.sources.entities.length > 0
          ? pair.sources.entities[0]
          : pair.target;

      const proposedName = autoRenameFile(sourceFile, pair.target, pairingType).name;

      return {
        id: `file_${index}`,
        originalName: pair.target.name,
        proposedName: proposedName,
        isValid: true, // Coché par défaut
        pairIndex: index
      };
    });

    setFilesToValidate(filesToValidate);
    setShowValidationModal(true);
  };

  // ✅ TOGGLER LA VALIDITÉ D'UN FICHIER
  const toggleFileValidation = (fileId: string) => {
    setFilesToValidate(prev => prev.map(file => 
      file.id === fileId ? { ...file, isValid: !file.isValid } : file
    ));
  };

  // ✅ CONFIRMER LA VALIDATION ET CONTINUER L'IMPORT
  const confirmValidationAndUpload = async () => {
    // Filtrer les paires valides
    const validPairIndices = filesToValidate
      .filter(f => f.isValid)
      .map(f => f.pairIndex);
    
    // Filtrer les paires invalides (pour le rapport)
    const invalidPairIndices = filesToValidate
      .filter(f => !f.isValid)
      .map(f => f.pairIndex);
    
    // Supprimer les paires invalides
    const validPairs = filePairs.filter((_, index) => validPairIndices.includes(index));
    setFilePairs(validPairs);
    
    // Fermer la modale
    setShowValidationModal(false);
    
    // Si aucune paire valide, annuler
    if (validPairs.length === 0) {
      alert('⚠️ Aucune paire valide. Import annulé.');
      setIsUploading(false);
      return;
    }
    
    // Continuer l'upload avec les paires valides
    await performBulkUpload(validPairs, invalidPairIndices);
  };

  // ✅ ANNULER LA VALIDATION
  const cancelValidation = () => {
    setShowValidationModal(false);
    setIsUploading(false);
  };

  // Renommage automatique (basé sur le fichier SOURCE, pas la cible)
  const autoRenameFile = (
    sourceFile: File,      // Fichier source (brut, book, R1)
    targetFile: File,      // Fichier cible (transcription, R1, R2)
    pairingType: PairingType
  ): File => {
    const targetExt = targetFile.name.split('.').pop() || '';
    const sourceBaseName = sourceFile.name.split('.').slice(0, -1).join('.');
    let newName = targetFile.name;

    if (pairingType === 'raw-transcription') {
      // interview_001.pdf + transcription.txt → interview_001_tr.txt
      newName = `${sourceBaseName}_tr.${targetExt}`;
    } else if (pairingType === 'transcription-book') {
      // Mon_Livre.txt + projet.pdf → Mon_Livre_projet.pdf (ou garder titre du projet)
      // En réalité, pour book, on garde souvent le nom du projet tel quel
      newName = targetFile.name; // On ne renomme pas le projet, c'est l'utilisateur qui définit le titre
    } else if (pairingType === 'book-proofreading1') {
      // Mon_Livre.pdf + R1.pdf → Mon_Livre_R1.pdf
      newName = `${sourceBaseName}_R1.${targetExt}`;
    } else if (pairingType === 'proofreading1-proofreading2') {
      // Mon_Livre_R1.pdf + R2.pdf → Mon_Livre_R2.pdf
      const sourceNameWithoutR1 = sourceBaseName.endsWith('_R1')
        ? sourceBaseName.replace('_R1', '')
        : sourceBaseName;
      newName = `${sourceNameWithoutR1}_R2.${targetExt}`;
    }

    if (newName !== targetFile.name) {
      return new File([targetFile], newName, { type: targetFile.type });
    }
    return targetFile;
  };

  // Vérifier les contraintes
  const checkConstraints = async (pair: FilePair): Promise<{ valid: boolean; reason?: string }> => {
    switch (pair.pairingType) {
      case 'raw-transcription':
        for (const entity of pair.sources.entities) {
          if (entity.is_linked || entity.status === 'transcrit') {
            return { valid: false, reason: `Le brut "${entity.file_name}" est déjà lié/transcrit` };
          }
        }
        return { valid: true };
      case 'book-proofreading1':
        const projectId = pair.sources.entities[0]?.id;
        if (projectId) {
          const existingR1 = proofreadingV1?.find((r1: any) => r1.book_project_id === projectId && !r1.is_deleted);
          if (existingR1) {
            return { valid: false, reason: 'Ce projet a déjà une relecture 1' };
          }
        }
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  // Afficher le rapport
  const showImportReport = (report: ImportReport) => {
    console.log('📊 RAPPORT D IMPORT:', report);
    setImportReport(report);
    setShowReport(true);
  };

  // ✅ ÉTAPE 1 : DEMANDER VALIDATION
  const handleBulkUpload = async () => {
    if (filePairs.length === 0 || !pairingType) {
      alert('⚠️ Veuillez sélectionner des fichiers et choisir un type d\'appariement');
      return;
    }

    setIsUploading(true);
    
    // ✅ AFFICHER LA MODALE DE VALIDATION
    prepareFilesForValidation();
  };

  // ✅ ÉTAPE 2 : UPLOAD RÉEL (après validation)
  const performBulkUpload = async (pairsToUpload: FilePair[], rejectedIndices: number[]) => {
    if (pairsToUpload.length === 0 || !pairingType) return;

    setUploadProgress(0);

    // ✅ DÉCLARATION DES COMPTEURS
    let successCount = 0;
    let errorCount = 0;

    const report: ImportReport = {
      totalPairs: pairsToUpload.length + rejectedIndices.length,
      successCount: 0,
      errorCount: 0,
      ignoredCount: rejectedIndices.length,
      details: { success: [], errors: [], ignored: [] }
    };

    // Ajouter les fichiers rejetés au rapport
    rejectedIndices.forEach(index => {
      const pair = filePairs[index];
      report.details.ignored.push({
        pairId: `pair_${index}`,
        reason: `Fichier non validé : ${pair.target.name}`
      });
    });

    for (let index = 0; index < pairsToUpload.length; index++) {
      const pair = pairsToUpload[index];

      setFilePairs(prev => prev.map(p =>
        p.id === pair.id ? { ...p, status: 'uploading' as const, progress: 25 } : p
      ));
      setUploadProgress(Math.round(((index + 0.25) / filePairs.length) * 100));

      try {
        const constraints = await checkConstraints(pair);
        if (!constraints.valid) {
          report.ignoredCount++;
          report.details.ignored.push({ pairId: pair.id, reason: constraints.reason || 'Contrainte non respectée' });
          setFilePairs(prev => prev.map(p =>
            p.id === pair.id ? { ...p, status: 'error' as const, progress: 0, error: constraints.reason } : p
          ));
          continue;
        }

        // ✅ TYPE EXPLICITE POUR uploadedSources
        const uploadedSources: any[] = [];

        // 1. Uploader les fichiers sources (si ce sont des fichiers machine)
        if (pair.sources.files.length > 0 && uploadRawFile) {
          for (const file of pair.sources.files) {
            const result = await uploadRawFile(file, {
              import_type: 'bulk_import',
              imported_via: 'bulk_import_modal',
              original_name: file.name
            });
            uploadedSources.push(result);
          }
        }

        // 2. Ajouter les entités plateforme (déjà existantes, pas besoin d'upload)
        for (const entity of pair.sources.entities) {
          uploadedSources.push(entity);
        }

        setFilePairs(prev => prev.map(p =>
          p.id === pair.id ? { ...p, progress: 50 } : p
        ));

        // ✅ ÉTAPE 4 : RENOMMAGE AUTOMATIQUE (basé sur la SOURCE, pas la cible)
        const sourceFile = pair.sources.files.length > 0
          ? pair.sources.files[0]  // 1er fichier brut
          : pair.sources.entities.length > 0
            ? pair.sources.entities[0]  // entité plateforme
            : pair.target;  // fallback

        const renamedFile = autoRenameFile(sourceFile, pair.target, pairingType);
        console.log('🏷️ [BULK IMPORT] Renaming file:', pair.target.name, '→', renamedFile.name);

        let targetResult: any = null;

        // ✅ LOGIQUE SPÉCIFIQUE PAR TYPE D'APPARIEMENT
        if (pairingType === 'raw-transcription') {
          // Extraire les IDs des sources uploadées (bruts)
          const sourceIds = uploadedSources
            .filter(s => s.success && s.entityId)
            .map(s => s.entityId);
          
          if (sourceIds.length === 0) {
            throw new Error('Aucun fichier brut importé pour cette transcription');
          }
          
          // Importer la transcription avec liaison aux bruts
          targetResult = await importTranscription(renamedFile, sourceIds, false);
          
        } else if (pairingType === 'transcription-book') {
          // Pour book project, les sources peuvent être :
          // - Des transcriptions existantes (entités plateforme)
          // - Des transcriptions nouvellement importées (fichiers machine)
          const transcriptionIds = uploadedSources
            .filter(s => s.success && s.entityId)
            .map(s => s.entityId);
          
          // Si aucune transcription uploadée, utiliser les entités plateforme
          const finalTranscriptionIds = transcriptionIds.length > 0 
            ? transcriptionIds 
            : pair.sources.entities.map(e => e.id);
          
          if (finalTranscriptionIds.length === 0) {
            throw new Error('Aucune transcription liée à ce projet');
          }
          
          // Importer le projet de livre avec liaison aux transcriptions
          targetResult = await importBookProject(renamedFile, finalTranscriptionIds, {});
          
        } else if (pairingType === 'book-proofreading1') {
          // Pour R1, la source est un projet de livre
          const projectId = uploadedSources[0]?.entityId || pair.sources.entities[0]?.id;
          
          if (!projectId) {
            throw new Error('Projet de livre non spécifié pour cette relecture 1');
          }
          
          // Importer R1 avec liaison au projet
          targetResult = await importProofreadingV1(renamedFile, projectId, false);
          
        } else if (pairingType === 'proofreading1-proofreading2') {
          // Pour R2, la source est une R1
          const r1Id = uploadedSources[0]?.entityId || pair.sources.entities[0]?.id;
          
          if (!r1Id) {
            throw new Error('Relecture 1 non spécifiée pour cette relecture 2');
          }
          
          // Importer R2 avec liaison à R1
          targetResult = await importProofreadingV2(renamedFile, r1Id, false);
        }

        setFilePairs(prev => prev.map(p =>
          p.id === pair.id ? {
            ...p,
            status: targetResult?.success ? 'success' as const : 'error' as const,
            progress: targetResult?.success ? 100 : 0,
            results: { uploadedFiles: uploadedSources, createdEntities: [targetResult] },
            error: targetResult?.success ? undefined : targetResult?.message
          } : p
        ));

        if (targetResult?.success) {
          successCount++;
          report.details.success.push({ pairId: pair.id, message: `${renamedFile.name} importé avec succès` });
        } else {
          errorCount++;
          report.details.errors.push({ pairId: pair.id, error: targetResult?.message || 'Échec de l\'import' });
        }

        setUploadProgress(Math.round(((index + 1) / filePairs.length) * 100));

      } catch (err: any) {
        errorCount++;
        setFilePairs(prev => prev.map(p =>
          p.id === pair.id ? { ...p, status: 'error' as const, progress: 0, error: err.message } : p
        ));
        report.details.errors.push({ pairId: pair.id, error: err.message });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // ✅ METTRE À JOUR LE RAPPORT AVEC LES COMPTEURS
    report.successCount = successCount;
    report.errorCount = errorCount;

    setIsUploading(false);
    showImportReport(report);
    if (report.successCount > 0 && onImportSuccess) {
      onImportSuccess();
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setPairingType(null);
    setFilePairs([]);
    setIsUploading(false);
    setUploadProgress(0);
    setShowPlatformSelector(false);
    setShowReport(false);
    setImportReport(null);
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from<File>(e.target.files);
      setSelectedFiles(filesArray);
      setFilePairs([]);
    }
  };

  const handleFilesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from<File>(e.dataTransfer.files);
      setSelectedFiles(filesArray);
      setFilePairs([]);
    }
  };

  const handleOpenPlatformSelector = () => {
    setShowPlatformSelector(true);
  };

  const handleClosePlatformSelector = () => {
    setShowPlatformSelector(false);
  };

  const handleSelectPlatformFiles = (selectedEntities: any[]) => {
    setEntitiesFromPlatform(prev => ({
      ...prev,
      ids: selectedEntities.map(e => e.id),
      entities: selectedEntities
    }));
    setShowPlatformSelector(false);
  };

  const handleRemovePlatformFile = (entityId: string) => {
    setEntitiesFromPlatform(prev => ({
      ...prev,
      ids: prev.ids.filter(id => id !== entityId),
      entities: prev.entities.filter(e => e.id !== entityId)
    }));
  };

  const currentOption = pairingOptions.find(opt => opt.id === pairingType);
  const successCount = filePairs.filter(f => f.status === 'success').length;
  const errorCount = filePairs.filter(f => f.status === 'error').length;

  if (!isOpen) return null;

  return (
    <>
      {/* MODALE PRINCIPALE */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in" onClick={handleClose}></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
          {/* En-tête */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white px-6 py-5 rounded-t-3xl flex justify-between items-center shadow-lg z-10">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <i className="fas fa-layer-group text-xl"></i>
              </div>
              <div>
                <div>Import en Masse par Appariement</div>
                <p className="text-indigo-100 text-sm font-normal mt-0.5">Organisez vos fichiers par paires avant import</p>
              </div>
            </h2>
            <button onClick={handleClose} disabled={isUploading} className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-110">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Contenu */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-indigo-300 dark:scrollbar-thumb-indigo-700 scrollbar-track-transparent">
            
            {/* Étape 1 : Choisir le type */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                Choisissez le type d'appariement
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pairingOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setPairingType(option.id as PairingType);
                      setSelectedFiles([]);
                      setFilePairs([]);
                    }}
                    disabled={isUploading}
                    className={`group p-5 rounded-2xl border-2 transition-all duration-300 text-left disabled:opacity-50 hover:shadow-xl hover:-translate-y-1 ${
                      pairingType === option.id
                        ? `border-${option.color.split('-')[1]}-500 bg-gradient-to-br from-${option.color.split('-')[1]}-50 to-white dark:from-${option.color.split('-')[1]}-900/20 dark:to-gray-800 shadow-lg`
                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${option.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <i className={`fas ${option.icon} text-white text-xl`}></i>
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{option.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Étape 2 : Sélectionner les fichiers */}
            {pairingType && currentOption && (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Sélectionnez vos fichiers
                  </h3>

                  {!isUploading && (
                    <div
                      onDrop={handleFilesDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="group border-3 border-dashed border-indigo-300 dark:border-indigo-600 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-500 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-300 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 shadow-inner"
                    >
                      <input ref={fileInputRef} type="file" multiple accept={`${currentOption.file1Accept},${currentOption.file2Accept}`} onChange={handleFileSelect} className="hidden" />
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                        <i className="fas fa-cloud-upload-alt text-4xl text-white"></i>
                      </div>
                      <p className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">Glissez-déposez tous vos fichiers ici</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{currentOption.file1Label} + {currentOption.file2Label}</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        <i className="fas fa-folder-open"></i>
                        Formats : {currentOption.file1Accept} + {currentOption.file2Accept}
                      </div>
                    </div>
                  )}

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 rounded-xl">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">{selectedFiles.length} fichier(s) sélectionné(s)</p>
                        <button onClick={() => { setSelectedFiles([]); setFilePairs([]); }} disabled={isUploading} className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 flex items-center gap-1">
                          <i className="fas fa-trash"></i> Tout retirer
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Étape 3 : Appariement */}
                {selectedFiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                      Appariement des fichiers
                    </h3>

                    {/* ✅ SÉLECTEUR DE MODE D'APPARIEMENT */}
                    <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-300 dark:border-indigo-700 rounded-xl">
                      <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
                        <i className="fas fa-arrows-alt-h mr-2"></i>
                        Mode d'appariement :
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handlePairingModeChange('one-to-one')}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                            pairingMode === 'one-to-one'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <i className="fas fa-1"></i>
                            <i className="fas fa-arrow-right"></i>
                            <i className="fas fa-1"></i>
                          </div>
                          <p className="text-xs font-semibold">1↔1</p>
                          <p className="text-xs opacity-70 mt-1">Un par un</p>
                        </button>
                        <button
                          onClick={() => handlePairingModeChange('many-to-one')}
                          disabled={!isManyToManyAllowed()}
                          className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                            pairingMode === 'many-to-one'
                              ? 'bg-purple-600 border-purple-600 text-white shadow-lg'
                              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                          } ${!isManyToManyAllowed() ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <i className="fas fa-layer-group"></i>
                            <i className="fas fa-arrow-right"></i>
                            <i className="fas fa-1"></i>
                          </div>
                          <p className="text-xs font-semibold">N↔1</p>
                          <p className="text-xs opacity-70 mt-1">Groupe</p>
                        </button>
                      </div>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-3 italic">
                        {pairingMode === 'one-to-one' 
                          ? '💡 Apparie chaque fichier source avec sa transcription correspondante (par nom)'
                          : '💡 Regroupe tous les fichiers sources vers une seule cible'}
                      </p>
                      {!isManyToManyAllowed() && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 flex items-center gap-1">
                          <i className="fas fa-lock"></i>
                          Mode N↔1 non disponible pour ce type
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mb-4">
                      <button onClick={autoPairFiles} disabled={isUploading} className="group px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        <i className="fas fa-magic group-hover:rotate-12 transition-transform duration-300"></i>
                        Apparier automatiquement
                      </button>
                      
                      {filePairs.length > 0 && (
                        <>
                          <button
                            onClick={() => {
                              if (editMode === 'dissociate') {
                                dissociateSelectedPairs();
                              } else {
                                setEditMode('dissociate');
                                setSelectedPairsForDissociate([]);
                              }
                            }}
                            className={`group px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                              editMode === 'dissociate'
                                ? selectedPairsForDissociate.length > 0
                                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            <i className={`fas ${editMode === 'dissociate' ? 'fa-chain-broken' : 'fa-link'} group-hover:rotate-6 transition-transform duration-300`}></i>
                            {editMode === 'dissociate' ? (selectedPairsForDissociate.length > 0 ? `Dissocier ${selectedPairsForDissociate.length} paire${selectedPairsForDissociate.length > 1 ? 's' : ''}` : 'Sélectionner les paires') : 'Dissocier'}
                          </button>
                          <button
                            onClick={() => {
                              setEditMode(editMode === 'reassign' ? 'none' : 'reassign');
                              setSelectedPairsForDissociate([]);
                              setSelectedPairForEdit(null);
                            }}
                            className={`group px-6 py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-md hover:shadow-lg hover:-translate-y-0.5 ${
                              editMode === 'reassign'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            <i className={`fas ${editMode === 'reassign' ? 'fa-exchange-alt' : 'fa-edit'} group-hover:rotate-90 transition-transform duration-300`}></i>
                            {editMode === 'reassign' ? 'Mode Réassociation' : 'Réassocier'}
                          </button>
                        </>
                      )}
                    </div>

                    {/* ✅ ZONE DE RÉASSOCIATION */}
                    {editMode === 'reassign' && unpairedFiles.file1s.length > 0 && unpairedFiles.file2s.length > 0 && (
                      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                          <i className="fas fa-exchange-alt"></i>
                          Réassocier des fichiers
                        </h4>
                        <p className="text-xs text-green-800 dark:text-green-200 mb-3">
                          💡 <strong>Astuce :</strong> Sélectionne PLUSIEURS fichiers dans la colonne 1 (bruts) et UN fichier dans la colonne 2 (transcription), puis clique sur "Réassocier".
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <i className="fas fa-file text-blue-500"></i>
                                Fichiers 1 ({unpairedFiles.file1s.length})
                              </span>
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                {selectedFile1Indices.length} sélectionné(s)
                              </span>
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {unpairedFiles.file1s.map((file, idx) => (
                                <div
                                  key={`f1_${idx}`}
                                  draggable
                                  onDragStart={() => handleFile1DragStart(idx)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleFile1Drop(idx)}
                                  onClick={() => handleFile1Select(idx)}
                                  className={`flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg cursor-pointer transition-all ${
                                    selectedFile1Indices.includes(idx)
                                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                      : draggedFile1Index === idx
                                        ? 'opacity-50 bg-blue-50 dark:bg-blue-900/30'
                                        : 'hover:bg-blue-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      selectedFile1Indices.includes(idx)
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                      {selectedFile1Indices.includes(idx) && <i className="fas fa-check text-xs"></i>}
                                    </div>
                                    <i className="fas fa-file text-blue-500 flex-shrink-0"></i>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">{file?.name || 'Fichier inconnu'}</span>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); removeUnpairedFile('file1', idx); }} className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <i className="fas fa-file-alt text-green-500"></i>
                                Fichiers 2 ({unpairedFiles.file2s.length})
                              </span>
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                {selectedFile2Index !== null ? '1 sélectionné' : '0 sélectionné'}
                              </span>
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {unpairedFiles.file2s.map((file, idx) => (
                                <div
                                  key={`f2_${idx}`}
                                  draggable
                                  onDragStart={() => handleFile2DragStart(idx)}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => handleFile2Drop(idx)}
                                  onClick={() => handleFile2Select(idx)}
                                  className={`flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg cursor-pointer transition-all ${
                                    selectedFile2Index === idx
                                      ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30'
                                      : draggedFile2Index === idx
                                        ? 'opacity-50 bg-green-50 dark:bg-green-900/30'
                                        : 'hover:bg-green-50 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                      selectedFile2Index === idx
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                      {selectedFile2Index === idx && <i className="fas fa-check text-xs"></i>}
                                    </div>
                                    <i className="fas fa-file-alt text-green-500 flex-shrink-0"></i>
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">{file?.name || 'Fichier inconnu'}</span>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); removeUnpairedFile('file2', idx); }} className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {selectedFile1Indices.length > 0 && selectedFile2Index !== null && (
                          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-300 dark:border-green-700">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                                  ✓ Paire prête à réassocier :
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                                    {selectedFile1Indices.length} fichier(s) 1
                                  </span>
                                  <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                    1 fichier 2
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  {selectedFile1Indices.map(idx => unpairedFiles.file1s[idx]?.name).join(', ')} → {unpairedFiles.file2s[selectedFile2Index]?.name}
                                </p>
                              </div>
                              <button
                                onClick={reassignFiles}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <i className="fas fa-link"></i>
                                Réassocier
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {filePairs.length > 0 && (
                      <>
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl">
                          <div className="flex items-start gap-3">
                            <i className="fas fa-info-circle text-blue-600 dark:text-blue-400 text-xl mt-0.5"></i>
                            <div className="text-sm text-blue-900 dark:text-blue-100">
                              <p className="font-semibold mb-1">💡 Comment utiliser :</p>
                              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                                {editMode === 'dissociate' ? (
                                  <>
                                    <li>• <strong>Cliquez sur les paires</strong> pour les sélectionner (plusieurs possibles)</li>
                                    <li>• <strong>Bouton "Dissocier"</strong> : Clique pour dissocier toutes les paires sélectionnées</li>
                                  </>
                                ) : (
                                  <>
                                    <li>• <strong>Glisser-déposer</strong> les lignes pour réorganiser les paires</li>
                                    <li>• <strong>Dissocier</strong> : Mode multi-sélection pour séparer plusieurs paires</li>
                                    <li>• <strong>Réassocier</strong> : Recrée des paires manuellement</li>
                                  </>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {isUploading && (
                          <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100"><i className="fas fa-upload mr-2"></i>Progression</p>
                              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{uploadProgress}%</p>
                            </div>
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          {filePairs.map((pair, index) => (
                            <div
                              key={pair.id}
                              draggable={!isUploading && editMode === 'none'}
                              onDragStart={() => setDraggedPairIndex(index)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                                e.preventDefault();
                                const targetIndex = index;
                                if (draggedPairIndex !== null && draggedPairIndex !== targetIndex) {
                                  const newPairs = [...filePairs];
                                  const dragged = newPairs[draggedPairIndex];
                                  newPairs.splice(draggedPairIndex, 1);
                                  newPairs.splice(targetIndex, 0, dragged);
                                  setFilePairs(newPairs);
                                  setDraggedPairIndex(null);
                                }
                              }}
                              onClick={() => {
                                if (editMode === 'dissociate') {
                                  togglePairSelectionForDissociate(index);
                                }
                              }}
                              className={`group flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-3.5 border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                                draggedPairIndex === index
                                  ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 opacity-50 scale-[0.98]'
                                  : editMode === 'dissociate'
                                    ? selectedPairsForDissociate.includes(index)
                                      ? 'border-red-500 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 ring-2 ring-red-400'
                                      : 'border-amber-400 hover:border-amber-600 hover:shadow-amber-200 dark:hover:shadow-amber-900/20'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                              }`}
                            >
                              {/* Handle drag-and-drop (mode normal) */}
                              {!isUploading && editMode === 'none' && (
                                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0">
                                  <i className="fas fa-grip-vertical"></i>
                                </div>
                              )}

                              {/* Checkbox (mode dissociation multiple) */}
                              {editMode === 'dissociate' && (
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                                  selectedPairsForDissociate.includes(index)
                                    ? 'bg-red-500 border-red-500 text-white'
                                    : 'border-amber-400 hover:border-amber-600'
                                }`}>
                                  {selectedPairsForDissociate.includes(index) && <i className="fas fa-check text-xs"></i>}
                                </div>
                              )}

                              {/* Bouton dissociation individuelle (mode normal) */}
                              {!isUploading && editMode === 'none' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Dissocier cette paire ? Les fichiers iront dans la zone Réassocier.')) {
                                      dissociateSinglePair(index);
                                    }
                                  }}
                                  className="text-gray-400 hover:text-amber-500 transition-colors flex-shrink-0"
                                  title="Dissocier cette paire individuellement"
                                >
                                  <i className="fas fa-chain-broken"></i>
                                </button>
                              )}

                              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-md">
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <i className="fas fa-layer-group text-blue-500 text-xs"></i>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sources ({pair.sources.files.length})</span>
                                  </div>
                                  {pair.sources.files.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {pair.sources.files.slice(0, 3).map((file, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                                          <i className="fas fa-file text-blue-500"></i>
                                          <span className="truncate max-w-[150px]">{file.name}</span>
                                        </span>
                                      ))}
                                      {pair.sources.files.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-400">+{pair.sources.files.length - 3} autres</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-center flex-shrink-0 px-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                  editMode === 'dissociate' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30'
                                }`}>
                                  <i className={`fas text-sm ${editMode === 'dissociate' ? 'fa-chain-broken text-amber-500' : 'fa-arrow-right text-indigo-500'}`}></i>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-file-import text-green-500 text-sm"></i>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block">{pair.target.name}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{(pair.target.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>

                              <div className="w-24 text-right flex-shrink-0">
                                {pair.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>En attente
                                  </span>
                                )}
                                {pair.status === 'uploading' && (
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <i className="fas fa-spinner fa-spin text-indigo-500 text-sm"></i>
                                    <span className="text-xs font-bold text-indigo-500">{pair.progress}%</span>
                                  </div>
                                )}
                                {pair.status === 'success' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full text-xs font-medium text-green-600 dark:text-green-300">
                                    <i className="fas fa-check-circle text-sm"></i>OK
                                  </span>
                                )}
                                {pair.status === 'error' && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full text-xs font-medium text-red-600 dark:text-red-300">
                                    <i className="fas fa-times-circle text-sm"></i>Erreur
                                  </span>
                                )}
                              </div>

                              {!isUploading && (
                                <div className="flex gap-1 flex-shrink-0">
                                  {editMode === 'dissociate' ? (
                                    <button onClick={() => removePair(pair.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-600 dark:text-amber-400 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50 transition-all duration-200 hover:scale-110 hover:shadow-md" title="Supprimer">
                                      <i className="fas fa-times text-sm"></i>
                                    </button>
                                  ) : (
                                    <button onClick={() => removePair(pair.id)} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:scale-110" title="Supprimer">
                                      <i className="fas fa-times text-sm"></i>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button onClick={handleClose} disabled={isUploading} className="px-8 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:from-gray-300 disabled:to-gray-400 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                    {isUploading ? <span className="flex items-center gap-2"><i className="fas fa-spinner fa-spin"></i>En cours...</span> : 'Annuler'}
                  </button>
                  <button onClick={handleBulkUpload} disabled={filePairs.length === 0 || isUploading} className="px-8 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:hover:translate-y-0">
                    {isUploading ? (
                      <><i className="fas fa-spinner fa-spin"></i>Import en cours... ({successCount}/{filePairs.length})</>
                    ) : (
                      <><i className="fas fa-upload"></i>Importer {filePairs.length} paire{filePairs.length > 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODALE DE RAPPORT */}
      {showReport && importReport && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowReport(false)}></div>
          
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white px-6 py-5 rounded-t-3xl flex justify-between items-center shadow-lg">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <i className="fas fa-clipboard-list text-xl"></i>
                </div>
                Rapport d'Import en Masse
              </h2>
              <button onClick={() => setShowReport(false)} className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 rounded-2xl p-4 border-2 border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center"><i className="fas fa-check text-white"></i></div>
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">{importReport.successCount}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Succès</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 rounded-2xl p-4 border-2 border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center"><i className="fas fa-times text-white"></i></div>
                    <span className="text-3xl font-bold text-red-600 dark:text-red-400">{importReport.errorCount}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Erreurs</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-800 rounded-2xl p-4 border-2 border-amber-200 dark:border-amber-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center"><i className="fas fa-exclamation-triangle text-white"></i></div>
                    <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">{importReport.ignoredCount}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ignorés</p>
                </div>
              </div>

              {importReport.details.success.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><i className="fas fa-check-circle text-green-500"></i>Succès ({importReport.details.success.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {importReport.details.success.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-700">
                        <i className="fas fa-check text-green-500 mt-0.5"></i>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importReport.details.errors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><i className="fas fa-times-circle text-red-500"></i>Erreurs ({importReport.details.errors.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {importReport.details.errors.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-700">
                        <i className="fas fa-times text-red-500 mt-0.5"></i>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importReport.details.ignored.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><i className="fas fa-exclamation-triangle text-amber-500"></i>Ignorés ({importReport.details.ignored.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {importReport.details.ignored.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-700">
                        <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => { console.log('Rapport:', importReport); alert('📋 Rapport copié dans la console'); }} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2">
                  <i className="fas fa-download"></i>Exporter logs
                </button>
                <button onClick={() => { setShowReport(false); if (importReport.successCount > 0 && onImportSuccess) onImportSuccess(); handleClose(); }} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl">
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODALE DE VALIDATION GROUPÉE */}
      {showValidationModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={cancelValidation}></div>
          
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto animate-scale-in">
            {/* En-tête */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white px-6 py-5 rounded-t-3xl flex justify-between items-center shadow-lg">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <i className="fas fa-clipboard-check text-xl"></i>
                </div>
                <div>
                  <div>Validation des fichiers</div>
                  <p className="text-amber-100 text-sm font-normal mt-0.5">Coche les fichiers conformes, décoche les autres</p>
                </div>
              </h2>
              <button onClick={cancelValidation} className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6">
              {/* Liste des fichiers */}
              <div className="space-y-3 mb-6">
                {filesToValidate.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                      file.isValid
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <label className="flex items-center justify-center w-8 h-8 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={file.isValid}
                        onChange={() => toggleFileValidation(file.id)}
                        className="w-6 h-6 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                    </label>

                    {/* Noms */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`fas ${file.isValid ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'}`}></i>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">
                          {file.originalName}
                        </span>
                        <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                        <span className={`text-sm font-bold ${file.isValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {file.proposedName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {file.isValid ? '✅ Sera importé avec ce nom' : '❌ Sera retiré de l\'import'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-check-circle text-green-500 text-2xl"></i>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{filesToValidate.filter(f => f.isValid).length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fichiers validés</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border-2 border-red-200 dark:border-red-700">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-times-circle text-red-500 text-2xl"></i>
                    <div>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{filesToValidate.filter(f => !f.isValid).length}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Fichiers rejetés</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Avertissement */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl mb-6">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-xl mt-0.5"></i>
                  <div className="text-sm text-amber-900 dark:text-amber-100">
                    <p className="font-semibold mb-1">Important :</p>
                    <p>Les fichiers décochés seront <strong>retirés de l'import</strong>. Vous devrez corriger leur nom et réimporter.</p>
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={cancelValidation}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl font-semibold transition-all duration-200"
                >
                  Annuler l'import
                </button>
                <button
                  onClick={confirmValidationAndUpload}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <i className="fas fa-check-circle"></i>
                  Importer {filesToValidate.filter(f => f.isValid).length} fichier{filesToValidate.filter(f => f.isValid).length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkImportModal;
