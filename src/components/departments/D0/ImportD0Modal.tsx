// src/components/departments/D0/ImportD0Modal.tsx
import { useState } from 'react';
import { supabase } from '../../../supabaseClient';
import mammoth from 'mammoth';  // ✅ Import de mammoth

interface ImportD0ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUPPORTED_DOCUMENT_TYPES = ['docx', 'doc', 'pdf', 'txt', 'rtf'];
const SUPPORTED_AUDIO_TYPES = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma'];
const ALL_SUPPORTED_TYPES = [...SUPPORTED_DOCUMENT_TYPES, ...SUPPORTED_AUDIO_TYPES];

export default function ImportD0Modal({ isOpen, onClose, onSuccess }: ImportD0ModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [ztfId, setZtfId] = useState('');
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('TRANS');
  const [language, setLanguage] = useState('FR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [fileType, setFileType] = useState<'document' | 'audio' | null>(null);
  const [extractedContent, setExtractedContent] = useState<string>('');

  if (!isOpen) return null;

  // ✅ FONCTION D'EXTRACTION DU CONTENU WORD
  const extractTextFromDocx = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (loadEvent) => {
        try {
          const arrayBuffer = loadEvent.target?.result as ArrayBuffer;
          
          // ✅ Extraction du texte brut avec mammoth
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          
          // ✅ Conversion en HTML simple pour TipTap
          const paragraphs = text.split('\n').filter(p => p.trim());
          const html = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
          
          resolve(html || text);
        } catch (error) {
          console.error('Erreur extraction mammoth:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsArrayBuffer(file);
    });
  };

  // ✅ FONCTION D'EXTRACTION POUR TXT
  const extractTextFromTxt = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const paragraphs = text.split('\n').filter(p => p.trim());
        const html = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
        resolve(html);
      };
      reader.onerror = () => reject(new Error('Erreur de lecture'));
      reader.readAsText(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    
    if (SUPPORTED_AUDIO_TYPES.includes(extension)) {
      setFileType('audio');
      setExtractedContent('');
    } else if (SUPPORTED_DOCUMENT_TYPES.includes(extension)) {
      setFileType('document');
      
      // ✅ Extraire automatiquement le contenu
      try {
        setProgress(5);
        let content = '';
        
        if (extension === 'docx') {
          content = await extractTextFromDocx(selectedFile);
        } else if (extension === 'txt' || extension === 'rtf') {
          content = await extractTextFromTxt(selectedFile);
        } else {
          content = `<p>Format ${extension} détecté. Le contenu sera extrait manuellement.</p>`;
        }
        
        setExtractedContent(content);
        console.log('✅ Contenu extrait:', content.length, 'caractères');
        
        // Aperçu dans la console
        const preview = content.replace(/<[^>]*>/g, '').substring(0, 200);
        console.log('📄 Aperçu:', preview);
      } catch (error) {
        console.error('Erreur extraction:', error);
        setExtractedContent(`<p>Erreur lors de l'extraction du contenu de ${selectedFile.name}</p>`);
      }
    } else {
      setError(`❌ Type de fichier non supporté: .${extension}`);
      return;
    }

    setFile(selectedFile);
    setError('');

    const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
    setTitle(fileName);

    if (!ztfId) {
      const timestamp = Date.now().toString().slice(-6);
      setZtfId(`TRANS-2026-${timestamp}`);
    }
  };

  const handleImport = async () => {
    if (!file || !ztfId || !title) {
      setError(' Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(10);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const storagePath = `raw/${ztfId}/${file.name}`;
      
      setProgress(20);
      
      // 1. Upload du fichier dans Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('raw_files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true  // ✅ Permet d'écraser si existe déjà
        });

      if (uploadError) throw uploadError;
      setProgress(50);

      // 2. Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('raw_files')
        .getPublicUrl(storagePath);

      setProgress(60);

      // 3. Utiliser le contenu extrait (ou un placeholder si audio)
      const finalContent = fileType === 'audio' 
        ? null 
        : (extractedContent || `<p>Contenu en attente d'extraction pour ${file.name}</p>`);

      setProgress(70);

      // 4. Insérer dans raw_files avec le contenu extrait
      const { data: rawFile, error: rawError } = await supabase
        .from('raw_files')
        .insert({
          file_name: file.name,
          file_type: fileExtension,
          file_size: file.size,
          file_url: publicUrl,
          storage_path: storagePath,
          extracted_content: finalContent,  // ✅ Contenu réel extrait
          status: 'libre',
          imported_at: new Date().toISOString(),
          metadata: {
            file_type: fileType,
            original_filename: file.name,
            file_size: file.size,
            imported_at: new Date().toISOString(),
            content_length: finalContent?.length || 0,
            word_count: finalContent ? finalContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w).length : 0
          }
        })
        .select()
        .single();

      if (rawError) throw rawError;

      setProgress(80);

      // 5. Créer le livre dans ztf_books
      const { error: bookError } = await supabase
        .from('ztf_books')
        .insert({
          ztf_id: ztfId,
          title: title,
          subtitle: null,
          theme: theme,
          language: language,
          ztf_status: 'DRAFT',
          current_department: 'D0',
          status: 'DRAFT',
          raw_file_id: rawFile.id,
          metadata: {
            file_type: fileType,
            original_filename: file.name,
            file_size: file.size,
            imported_at: new Date().toISOString(),
            content_length: finalContent?.length || 0,
            word_count: finalContent ? finalContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w).length : 0
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (bookError) throw bookError;

      setProgress(100);

      // 6. Succès
      const typeLabel = fileType === 'audio' ? '🎵 Fichier audio' : '📄 Document';
      const wordCount = finalContent 
        ? finalContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w).length 
        : 0;
      
      alert(`✅ ${typeLabel} importé avec succès !\n\n` +
            `ID: ${ztfId}\n` +
            `Titre: ${title}\n` +
            `Mots extraits: ${wordCount}\n` +
            `Caractères: ${finalContent?.length || 0}\n\n` +
            `Le fichier est prêt pour le pipeline.`);
      
      // Reset
      setFile(null);
      setZtfId('');
      setTitle('');
      setFileType(null);
      setExtractedContent('');
      setProgress(0);
      
      onSuccess();
      onClose();

    } catch (err: any) {
      console.error('Erreur import:', err);
      setError(`❌ Erreur lors de l'import: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <i className="fas fa-upload"></i>
                Importer un fichier dans D0
              </h2>
              <p className="text-purple-100 mt-1 text-sm">
                Documents (Word, PDF) ou fichiers audio (MP3, WAV)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {/* Sélection du fichier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fichier à importer *
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                accept={`.${ALL_SUPPORTED_TYPES.join(',.')}`}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                {file ? (
                  <div className="space-y-2">
                    <i className={`fas ${fileType === 'audio' ? 'fa-music text-blue-500' : 'fa-file-word text-purple-500'} text-4xl`}></i>
                    <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {fileType === 'audio' ? '🎵 Audio' : '📄 Document'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <i className="fas fa-cloud-upload-alt text-4xl text-gray-400"></i>
                    <p className="text-gray-600 dark:text-gray-400">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-xs text-gray-500">
                      Formats: {ALL_SUPPORTED_TYPES.map(t => `.${t}`).join(', ')}
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* ✅ APERÇU DU CONTENU EXTRAIT */}
          {fileType === 'document' && extractedContent && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <i className="fas fa-check-circle"></i>
                Contenu extrait ({extractedContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w).length} mots)
              </h4>
              <div className="bg-white dark:bg-gray-900 rounded p-3 max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-5">
                  {extractedContent.replace(/<[^>]*>/g, '').substring(0, 300)}...
                </p>
              </div>
            </div>
          )}

          {/* Informations du livre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ID ZTF *
              </label>
              <input
                type="text"
                value={ztfId}
                onChange={(e) => setZtfId(e.target.value)}
                placeholder="TRANS-2026-00001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du livre"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thème
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="TRANS"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Langue
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="FR">🇷 Français</option>
                <option value="EN">🇬🇧 English</option>
                <option value="FR-EN">🇫🇷🇬🇧 FR/EN</option>
              </select>
            </div>
          </div>

          {/* Indicateur de type */}
          {fileType && (
            <div className={`p-4 rounded-lg ${
              fileType === 'audio' 
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
            }`}>
              <div className="flex items-center gap-3">
                <i className={`fas ${fileType === 'audio' ? 'fa-music text-blue-600' : 'fa-file-alt text-purple-600'} text-2xl`}></i>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {fileType === 'audio' ? '🎵 Fichier audio détecté' : '📄 Document texte détecté'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fileType === 'audio' 
                      ? 'Le fichier sera analysé dans D1 puis transcrit en D2' 
                      : `Contenu extrait: ${extractedContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w).length} mots`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Barre de progression */}
          {loading && progress > 0 && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Import en cours...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !file || !ztfId || !title}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Import...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Importer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}