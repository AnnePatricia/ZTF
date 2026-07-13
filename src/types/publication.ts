// src/types/publication.ts

export type PublicationTaskStatus =
  | 'pending'
  | 'metadata_pending'
  | 'cover_pending'
  | 'formats_generating'
  | 'formats_ready'
  | 'publishing'
  | 'published'
  | 'registered'
  | 'rejected';

export type FormatType = 'pdf' | 'epub' | 'mobi' | 'html' | 'docx';

export type PlatformName = 'amazon' | 'apple_books' | 'google_play' | 'kobo' | 'website' | 'custom';

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface PublicationTask {
  id: string;
  book_id: string;
  proofreading_v2_task_id: string | null;
  archive_id: string | null;
  assigned_to: string | null;
  status: PublicationTaskStatus;
  title: string;
  subtitle: string | null;
  author: string;
  publisher: string;
  language: string;
  isbn: string | null;
  publication_date: string | null;
  edition_number: number;
  cover_image_url: string | null;
  cover_storage_path: string | null;
  metadata: any;
  formats: any;
  platforms: any;
  published_at: string | null;
  published_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  book?: {
    ztf_id: string;
    title: string;
    theme: string;
  };
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  formats_list?: PublicationFormat[];
  platforms_list?: PublicationPlatform[];
}

export interface PublicationFormat {
  id: string;
  task_id: string;
  format_type: FormatType;
  file_url: string;
  file_storage_path: string;
  file_size: number;
  file_name: string;
  mime_type: string | null;
  checksum: string | null;
  generation_status: GenerationStatus;
  generation_error: string | null;
  generated_at: string | null;
  created_at: string;
}

export interface PublicationPlatform {
  id: string;
  task_id: string;
  platform_name: PlatformName;
  platform_url: string | null;
  publication_id: string | null;
  publication_status: string;
  published_at: string | null;
  external_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ZtfRegistryFinal {
  id: string;
  book_id: string;
  publication_task_id: string | null;
  registry_number: string;
  final_title: string;
  final_author: string;
  final_isbn: string | null;
  final_publication_date: string | null;
  final_formats: any[];
  final_platforms: any[];
  final_metadata: any;
  registered_at: string;
  registered_by: string;
  status: string;
  notes: string | null;
  created_at: string;

  book?: {
    ztf_id: string;
    title: string;
  };
  registered_user?: {
    id: string;
    full_name: string;
  };
}

export const PUBLICATION_STATUS_CONFIG: Record<PublicationTaskStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'bg-gray-500', icon: 'fa-clock' },
  metadata_pending: { label: 'Métadonnées', color: 'bg-blue-500', icon: 'fa-tags' },
  cover_pending: { label: 'Couverture', color: 'bg-indigo-500', icon: 'fa-image' },
  formats_generating: { label: 'Formats', color: 'bg-purple-500', icon: 'fa-cogs' },
  formats_ready: { label: 'Formats prêts', color: 'bg-violet-500', icon: 'fa-check' },
  publishing: { label: 'Publication', color: 'bg-pink-500', icon: 'fa-rocket' },
  published: { label: 'Publié', color: 'bg-green-500', icon: 'fa-check-circle' },
  registered: { label: 'Enregistré', color: 'bg-emerald-500', icon: 'fa-registered' },
  rejected: { label: 'Rejeté', color: 'bg-red-500', icon: 'fa-times-circle' },
};

export const FORMAT_TYPE_CONFIG: Record<FormatType, { label: string; color: string; icon: string; mime: string }> = {
  pdf: { label: 'PDF', color: 'text-red-600', icon: 'fa-file-pdf', mime: 'application/pdf' },
  epub: { label: 'EPUB', color: 'text-blue-600', icon: 'fa-book', mime: 'application/epub+zip' },
  mobi: { label: 'MOBI', color: 'text-orange-600', icon: 'fa-tablet-alt', mime: 'application/x-mobipocket-ebook' },
  html: { label: 'HTML', color: 'text-green-600', icon: 'fa-code', mime: 'text/html' },
  docx: { label: 'Word', color: 'text-blue-700', icon: 'fa-file-word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
};

export const PLATFORM_CONFIG: Record<PlatformName, { label: string; color: string; icon: string; url: string }> = {
  amazon: { label: 'Amazon Kindle', color: 'bg-orange-500', icon: 'fa-amazon', url: 'https://kdp.amazon.com' },
  apple_books: { label: 'Apple Books', color: 'bg-gray-800', icon: 'fa-apple', url: 'https://books.apple.com' },
  google_play: { label: 'Google Play', color: 'bg-blue-500', icon: 'fa-google-play', url: 'https://play.google.com/books' },
  kobo: { label: 'Kobo', color: 'bg-blue-600', icon: 'fa-book-open', url: 'https://www.kobo.com' },
  website: { label: 'Site Web', color: 'bg-purple-500', icon: 'fa-globe', url: '' },
  custom: { label: 'Autre', color: 'bg-gray-500', icon: 'fa-link', url: '' },
};