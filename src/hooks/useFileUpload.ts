import { useState } from 'react';
import { supabase } from '../supabaseClient';

interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error: string | null;
  fileUrl: string | null;
}

export function useFileUpload(bucketName: string = 'document-files') {
  const [progress, setProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
    error: null,
    fileUrl: null
  });

  const uploadFile = async (
    file: File,
    documentId: string,
    onUploadComplete?: (url: string) => void
  ): Promise<string | null> => {
    try {
      setProgress({ progress: 0, isUploading: true, error: null, fileUrl: null });

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${bucketName}/${fileName}`;

      // Upload avec suivi de progression
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: false,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setProgress({ 
        progress: 100, 
        isUploading: false, 
        error: null, 
        fileUrl: publicUrl 
      });

      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }

      return publicUrl;
    } catch (error: any) {
      console.error('Erreur upload:', error);
      setProgress({ 
        progress: 0, 
        isUploading: false, 
        error: error.message || 'Erreur lors de l\'upload', 
        fileUrl: null 
      });
      return null;
    }
  };

  const deleteFile = async (fileUrl: string): Promise<boolean> => {
    try {
      // Extraire le chemin du fichier depuis l'URL
      const path = fileUrl.split('/').slice(-2).join('/');
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) throw error;
      
      setProgress(prev => ({ ...prev, fileUrl: null }));
      return true;
    } catch (error) {
      console.error('Erreur suppression:', error);
      return false;
    }
  };

  return {
    ...progress,
    uploadFile,
    deleteFile,
    reset: () => setProgress({ progress: 0, isUploading: false, error: null, fileUrl: null })
  };
}