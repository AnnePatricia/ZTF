import React, { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

interface FileUploadProps {
  documentId: string;
  currentFileUrl?: string | null;
  onFileUploaded: (url: string) => void;
  onFileDeleted?: () => void;
  allowedTypes?: string[];
  maxFileSize?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  documentId,
  currentFileUrl,
  onFileUploaded,
  onFileDeleted,
  allowedTypes = ['image/*', 'application/pdf', 'audio/*', 'video/*'],
  maxFileSize = 50 * 1024 * 1024
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      if (file.size > maxFileSize) {
        throw new Error(`Fichier trop volumineux (max ${maxFileSize / 1024 / 1024} Mo)`);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `document-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('document-files')
        .upload(filePath, file, {
          upsert: false,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // ✅ CORRECTION : Syntaxe valide
      const { data } = supabase.storage
        .from('document-files')
        .getPublicUrl(filePath);

      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('URL publique non récupérée');

      onFileUploaded(publicUrl);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }

      setProgress(100);
      alert(`✅ Fichier uploadé avec succès !`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur upload:', err);
      setError(message);
      alert(`❌ ${message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, []);

  const handleDelete = async () => {
    if (!currentFileUrl) return;

    const confirm = window.confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?');
    if (!confirm) return;

    try {
      const path = currentFileUrl.split('/').slice(-2).join('/');
      
      const { error } = await supabase.storage
        .from('document-files')
        .remove([path]);

      if (error) throw error;
      
      if (onFileDeleted) onFileDeleted();
      setPreviewUrl(null);
      alert('✅ Fichier supprimé avec succès');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur suppression:', err);
      alert(`❌ ${message}`);
    }
  };

  const getFileIcon = (url: string) => {
    if (!url) return '📄';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.pdf')) return '📕';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return '🖼️';
    if (lowerUrl.match(/\.(mp3|wav|ogg|aac)$/)) return '🎵';
    if (lowerUrl.match(/\.(mp4|avi|mov|wmv)$/)) return '🎬';
    return '📄';
  };

  const getFileType = (url: string) => {
    if (!url) return 'Fichier';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.pdf')) return 'PDF';
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) return 'Image';
    if (lowerUrl.match(/\.(mp3|wav|ogg|aac)$/)) return 'Audio';
    if (lowerUrl.match(/\.(mp4|avi|mov|wmv)$/)) return 'Vidéo';
    return 'Fichier';
  };

  return (
    <div className="space-y-4">
      {currentFileUrl && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getFileIcon(currentFileUrl)}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 truncate">
                    {decodeURIComponent(currentFileUrl.split('/').pop() || 'Fichier')}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {getFileType(currentFileUrl)}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  <i className="fas fa-eye mr-1.5"></i>
                  Voir
                </a>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                >
                  <i className="fas fa-trash-alt mr-1.5"></i>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 animate-pulse' 
            : uploading
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
      >
        <input
          type="file"
          onChange={handleFileChange}
          accept={allowedTypes.join(',')}
          className="hidden"
          id={`file-upload-${documentId}`}
        />
        <label htmlFor={`file-upload-${documentId}`} className="cursor-pointer w-full">
          {uploading ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-blue-500 font-bold">
                    {progress}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Upload en cours...
                </p>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-3 animate-shake">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">
                  {error}
                </p>
                <p className="text-xs text-red-600">
                  Cliquez ou glissez un fichier pour réessayer
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center transition-transform duration-300">
                  <i className="fas fa-cloud-upload-alt text-blue-500 text-2xl"></i>
                </div>
              </div>
              
              <div className="space-y-1">
                {isDragging ? (
                  <p className="text-lg font-semibold text-blue-600 animate-pulse">
                    Déposez le fichier ici...
                  </p>
                ) : (
                  <p className="text-lg font-semibold text-gray-900">
                    Glissez-déposez un fichier ici
                  </p>
                )}
                
                <p className="text-sm text-gray-500">
                  ou cliquez pour parcourir
                </p>
              </div>
              
              <div className="text-xs text-gray-400">
                <p>Formats : PDF, Images, Audio, Vidéo</p>
                <p>Max : {maxFileSize / 1024 / 1024} Mo</p>
              </div>
            </div>
          )}
        </label>
      </div>

      {previewUrl && currentFileUrl?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/) && (
        <div className="mt-4 rounded-lg overflow-hidden shadow-md">
          <img
            src={previewUrl}
            alt="Aperçu"
            className="w-full h-48 object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;