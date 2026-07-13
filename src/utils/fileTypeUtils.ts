// src/utils/fileTypeUtils.ts

export const FILE_CATEGORIES = {
  AUDIO: ['AUDIO', 'MP3', 'WAV', 'M4A', 'OGG', 'FLAC', 'AAC'],
  VIDEO: ['VIDEO', 'MP4', 'AVI', 'MKV', 'WEBM', 'MOV', 'WMV'],
  DOCUMENT: ['DOCUMENT', 'PDF', 'DOCX', 'TXT', 'ODT', 'RTF', 'DOC'],
  IMAGE: ['IMAGE', 'JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'WEBP'],
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

export function getFileCategory(fileType: string, mimeType?: string): FileCategory {
  const type = fileType.toUpperCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.includes('audio/')) return 'AUDIO';
  if (mime.includes('video/')) return 'VIDEO';
  if (mime.includes('image/')) return 'IMAGE';
  if (mime.includes('application/pdf') || mime.includes('application/vnd.openxmlformats')) {
    return 'DOCUMENT';
  }

  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.some(ext => type.includes(ext))) {
      return category as FileCategory;
    }
  }

  return 'DOCUMENT';
}

export function isAudioVideo(fileType: string, mimeType?: string): boolean {
  const category = getFileCategory(fileType, mimeType);
  return category === 'AUDIO' || category === 'VIDEO';
}

export function isDocument(fileType: string, mimeType?: string): boolean {
  return getFileCategory(fileType, mimeType) === 'DOCUMENT';
}