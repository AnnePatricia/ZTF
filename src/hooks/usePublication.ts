// src/hooks/usePublication.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PLATFORM_CONFIG } from '../types/publication';
import type {
    PublicationTask,
    PublicationFormat,
    // PublicationPlatform,
    FormatType,
    PlatformName,
    ZtfRegistryFinal
} from '../types/publication';
import { useRoles } from './useRoles';

export function usePublication() {
    const { currentUser } = useRoles();
    const [tasks, setTasks] = useState<PublicationTask[]>([]);
    const [registries, setRegistries] = useState<ZtfRegistryFinal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTasks = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('publication_tasks')
                .select(`
          *,
          book:ztf_books(ztf_id, title, theme),
          assigned_user:ztf_users!assigned_to(id, full_name, email)
        `)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setTasks(data || []);
            setError(null);
        } catch (err: any) {
            console.error('Erreur chargement tâches:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadRegistries = useCallback(async () => {
        try {
            const { data, error: fetchError } = await supabase
                .from('ztf_registry_final')
                .select(`
          *,
          book:ztf_books(ztf_id, title),
          registered_user:ztf_users!registered_by(id, full_name)
        `)
                .order('registered_at', { ascending: false });

            if (fetchError) throw fetchError;
            setRegistries(data || []);
        } catch (err: any) {
            console.error('Erreur chargement registres:', err);
        }
    }, []);

    useEffect(() => {
        loadTasks();
        loadRegistries();
    }, [loadTasks, loadRegistries]);

    const createTask = useCallback(async (
        bookId: string,
        proofreadingV2TaskId?: string,
        archiveId?: string
    ): Promise<PublicationTask | null> => {
        try {
            const { data: book } = await supabase
                .from('ztf_books')
                .select('title, theme')
                .eq('id', bookId)
                .single();

            const { data, error } = await supabase
                .from('publication_tasks')
                .insert({
                    book_id: bookId,
                    proofreading_v2_task_id: proofreadingV2TaskId || null,
                    archive_id: archiveId || null,
                    title: book?.title || '',
                    author: 'Professeur Z.T. Fomum',
                    publisher: 'BCM Éditions',
                    language: 'EN',
                    edition_number: 1,
                    status: 'pending',
                    metadata: {},
                    formats: {},
                    platforms: {}
                })
                .select()
                .single();

            if (error) throw error;
            await loadTasks();
            return data;
        } catch (err: any) {
            console.error('Erreur création tâche:', err);
            setError(err.message);
            return null;
        }
    }, [loadTasks]);

    const updateMetadata = useCallback(async (
        taskId: string,
        metadata: {
            title?: string;
            subtitle?: string;
            author?: string;
            publisher?: string;
            language?: string;
            isbn?: string;
            publication_date?: string;
            edition_number?: number;
            notes?: string;
        }
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('publication_tasks')
                .update({
                    ...metadata,
                    status: 'metadata_pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    const uploadCover = useCallback(async (
        taskId: string,
        file: File
    ): Promise<boolean> => {
        try {
            const filePath = `d8_covers/${taskId}/${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('document-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = await supabase.storage
                .from('document-files')
                .getPublicUrl(filePath);

            const { error } = await supabase
                .from('publication_tasks')
                .update({
                    cover_image_url: urlData.publicUrl,
                    cover_storage_path: filePath,
                    status: 'cover_pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    const generateFormat = useCallback(async (
        taskId: string,
        formatType: FormatType,
        content: string
    ): Promise<PublicationFormat | null> => {
        try {
            let fileContent: Blob;
            let fileName: string;
            let mimeType: string;

            switch (formatType) {
                case 'pdf':
                    // Générer PDF simple avec html2pdf
                    const html2pdf = (await import('html2pdf.js')).default;
                    const element = document.createElement('div');
                    element.innerHTML = content;
                    element.style.width = '210mm';
                    element.style.padding = '20mm';
                    element.style.backgroundColor = 'white';
                    element.style.color = 'black';
                    document.body.appendChild(element);

                    const pdfBlob = await html2pdf()
                        .from(element)
                        .set({
                            margin: 10,
                            filename: 'document.pdf',
                            image: { type: 'jpeg', quality: 0.98 },
                            html2canvas: { scale: 2 },
                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                        })
                        .outputPdf('blob');

                    document.body.removeChild(element);
                    fileContent = pdfBlob;
                    fileName = `document_${taskId}.pdf`;
                    mimeType = 'application/pdf';
                    break;

                case 'docx':  // ✅ AJOUTER ce cas
                    // Générer un document Word simple avec html2docx ou structure ZIP
                    const JSZipDocx = (await import('jszip')).default;
                    const zipDocx = new JSZipDocx();

                    // Structure minimale DOCX (simplifiée)
                    zipDocx.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

                    zipDocx.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${content.replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`);

                    fileContent = await zipDocx.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                    fileName = `document_${taskId}.docx`;
                    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    break;

                case 'epub':
                    // Générer EPUB simple (structure ZIP)
                    const JSZip = (await import('jszip')).default;
                    const zip = new JSZip();

                    // Structure EPUB minimale
                    zip.file('mimetype', 'application/epub+zip');
                    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
                    zip.file('OEBPS/content.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Document</title></head>
<body>${content}</body>
</html>`);
                    zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata>
    <dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">Document</dc:title>
    <dc:language xmlns:dc="http://purl.org/dc/elements/1.1/">en</dc:language>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="content"/>
  </spine>
</package>`);

                    fileContent = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
                    fileName = `document_${taskId}.epub`;
                    mimeType = 'application/epub+zip';
                    break;

                case 'mobi':
                    // MOBI nécessite une conversion complexe, on génère un placeholder
                    fileContent = new Blob([content], { type: 'text/plain' });
                    fileName = `document_${taskId}.mobi`;
                    mimeType = 'application/x-mobipocket-ebook';
                    break;

                case 'html':
                    fileContent = new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Document</title></head><body>${content}</body></html>`], { type: 'text/html' });
                    fileName = `document_${taskId}.html`;
                    mimeType = 'text/html';
                    break;

                default:
                    throw new Error(`Format non supporté: ${formatType}`);
            }

            const filePath = `d8_formats/${taskId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('document-files')
                .upload(filePath, fileContent);

            if (uploadError) throw uploadError;

            const { data: urlData } = await supabase.storage
                .from('document-files')
                .getPublicUrl(filePath);

            const { data, error } = await supabase
                .from('publication_formats')
                .insert({
                    task_id: taskId,
                    format_type: formatType,
                    file_url: urlData.publicUrl,
                    file_storage_path: filePath,
                    file_size: fileContent.size,
                    file_name: fileName,
                    mime_type: mimeType,
                    generation_status: 'completed',
                    generated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            // Mettre à jour le statut de la tâche
            await supabase
                .from('publication_tasks')
                .update({
                    status: 'formats_generating',
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            await loadTasks();
            return data;
        } catch (err: any) {
            console.error('Erreur génération format:', err);
            setError(err.message);
            return null;
        }
    }, [loadTasks]);

    const addPlatform = useCallback(async (
        taskId: string,
        platformName: PlatformName,
        platformUrl?: string
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('publication_platforms')
                .insert({
                    task_id: taskId,
                    platform_name: platformName,
                    platform_url: platformUrl || PLATFORM_CONFIG[platformName].url,
                    publication_status: 'pending'
                });

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    const publishToPlatform = useCallback(async (
        platformId: string,
        publicationId?: string,
        externalUrl?: string
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('publication_platforms')
                .update({
                    publication_id: publicationId || null,
                    external_url: externalUrl || null,
                    publication_status: 'published',
                    published_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', platformId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [loadTasks]);

    const registerPublication = useCallback(async (
        taskId: string,
        notes?: string
    ): Promise<ZtfRegistryFinal | null> => {
        if (!currentUser) return null;

        try {
            const { data: task } = await supabase
                .from('publication_tasks')
                .select('book_id, title, author, isbn, publication_date, formats, platforms')
                .eq('id', taskId)
                .single();

            if (!task) return null;

            const { data, error } = await supabase
                .from('ztf_registry_final')
                .insert({
                    book_id: task.book_id,
                    publication_task_id: taskId,
                    final_title: task.title,
                    final_author: task.author,
                    final_isbn: task.isbn,
                    final_publication_date: task.publication_date,
                    final_formats: task.formats || {},
                    final_platforms: task.platforms || {},
                    registered_by: currentUser.id,
                    status: 'registered',
                    notes: notes || null
                })
                .select(`
          *,
          book:ztf_books(ztf_id, title),
          registered_user:ztf_users!registered_by(id, full_name)
        `)
                .single();

            if (error) throw error;

            // Mettre à jour le statut de la tâche
            await supabase
                .from('publication_tasks')
                .update({
                    status: 'registered',
                    published_at: new Date().toISOString(),
                    published_by: currentUser.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            // Mettre à jour le statut du livre
            await supabase
                .from('ztf_books')
                .update({
                    status: 'PUBLISHED',
                    updated_at: new Date().toISOString()
                })
                .eq('id', task.book_id);

            await Promise.all([loadTasks(), loadRegistries()]);
            return data;
        } catch (err: any) {
            console.error('Erreur enregistrement:', err);
            setError(err.message);
            return null;
        }
    }, [currentUser, loadTasks, loadRegistries]);

    const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('publication_tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;
            await loadTasks();
            return true;
        } catch (err: any) {
            return false;
        }
    }, [loadTasks]);

    return {
        tasks,
        registries,
        loading,
        error,
        refresh: loadTasks,
        createTask,
        updateMetadata,
        uploadCover,
        generateFormat,
        addPlatform,
        publishToPlatform,
        registerPublication,
        deleteTask,
    };
}