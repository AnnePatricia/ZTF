// =====================================================
// HOOK: useDocumentConverter
// Description: Convertit un document (DOCX, PDF, TXT) en blocs atomiques
//              pour le correcteur collaboratif
// =====================================================

import { useState } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

export interface ConversionResult {
  success: boolean;
  blocksCreated: number;
  errors: string[];
  warnings: string[];
}

export interface WordFormattingPolicy {
  // Règles de structure
  headingStyles: string[];  // Styles de titres acceptés
  paragraphStyle: string;   // Style de paragraphe recommandé
  listStyles: string[];     // Styles de liste
  // Règles de contenu
  maxParagraphLength: number;  // Longueur max par paragraphe
  allowedImageFormats: string[];  // Formats d'image acceptés
}

// =====================================================
// POLITIQUE DE FORMATAGE WORD PAR DÉFAUT
// =====================================================

export const DEFAULT_WORD_POLICY: WordFormattingPolicy = {
  headingStyles: ['Titre 1', 'Titre 2', 'Titre 3', 'Heading 1', 'Heading 2', 'Heading 3'],
  paragraphStyle: 'Normal',
  listStyles: ['Liste à puces', 'Liste numérotée', 'List Bullet', 'List Number'],
  maxParagraphLength: 2000,  // Caractères
  allowedImageFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
};

// =====================================================
// HOOK
// =====================================================

export function useDocumentConverter() {
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // 1. CONVERTIR UN DOCUMENT EN BLOCS
  // =====================================================

  const convertDocumentToBlocks = async (
    documentId: string,
    content: string,
    policy: WordFormattingPolicy = DEFAULT_WORD_POLICY
  ): Promise<ConversionResult> => {
    setConverting(true);
    setError(null);

    const result: ConversionResult = {
      success: false,
      blocksCreated: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Parser le contenu en blocs
      const blocks = parseContentToBlocks(content, policy);

      if (blocks.length === 0) {
        result.warnings.push('Aucun bloc détecté dans le document');
      }

      // Insérer les blocs dans la base
      const blocksToInsert = blocks.map((block, index) => ({
        document_id: documentId,
        type: block.type,
        position: index,
        content: block.content,
        status: 'draft' as const,
        created_by: user.id,
        word_count: block.wordCount,
        char_count: block.charCount,
      }));

      const { error: insertError } = await supabase
        .from('document_blocks')
        .insert(blocksToInsert);

      if (insertError) {
        throw new Error(`Erreur insertion blocs: ${insertError.message}`);
      }

      // Mettre à jour le document avec les métriques
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          total_blocks: blocks.length,
          merged_blocks: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) {
        console.error('Erreur mise à jour métriques:', updateError);
      }

      result.success = true;
      result.blocksCreated = blocks.length;

      if (result.warnings.length > 0) {
        console.warn('Avertissements conversion:', result.warnings);
      }

    } catch (err: any) {
      console.error('Erreur convertDocumentToBlocks:', err);
      result.errors.push(err.message);
      setError(err.message);
    } finally {
      setConverting(false);
    }

    return result;
  };

  // =====================================================
  // 2. PARSER LE CONTENU EN BLOCS
  // =====================================================

  const parseContentToBlocks = (
    content: string,
    policy: WordFormattingPolicy
  ): Array<{
    type: string;
    content: any;
    wordCount: number;
    charCount: number;
  }> => {
    const blocks: Array<{ type: string; content: any; wordCount: number; charCount: number }> = [];

    // Si le contenu est du HTML (export DOCX → HTML)
    if (content.trim().startsWith('<')) {
      return parseHtmlContent(content, policy);
    }

    // Sinon, contenu texte brut
    return parseTextContent(content, policy);
  };

  // =====================================================
  // 3. PARSER HTML (provenant de DOCX)
  // =====================================================

  const parseHtmlContent = (
    html: string,
    policy: WordFormattingPolicy
  ): Array<{ type: string; content: any; wordCount: number; charCount: number }> => {
    const blocks: Array<{ type: string; content: any; wordCount: number; charCount: number }> = [];

    // Créer un parser DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Traiter les titres h1
    const h1Elements = Array.from(doc.querySelectorAll('h1'));
    h1Elements.forEach((el) => {
      const text = el.textContent || '';
      blocks.push({
        type: 'heading1',
        content: { content: text, type: 'heading1' },
        wordCount: text.split(/\s+/).filter(w => w.trim()).length,
        charCount: text.length,
      });
    });

    // Traiter les titres h2
    const h2Elements = Array.from(doc.querySelectorAll('h2'));
    h2Elements.forEach((el) => {
      const text = el.textContent || '';
      blocks.push({
        type: 'heading2',
        content: { content: text, type: 'heading2' },
        wordCount: text.split(/\s+/).filter(w => w.trim()).length,
        charCount: text.length,
      });
    });

    // Traiter les titres h3
    const h3Elements = Array.from(doc.querySelectorAll('h3'));
    h3Elements.forEach((el) => {
      const text = el.textContent || '';
      blocks.push({
        type: 'heading3',
        content: { content: text, type: 'heading3' },
        wordCount: text.split(/\s+/).filter(w => w.trim()).length,
        charCount: text.length,
      });
    });

    // Traiter les paragraphes
    const paragraphs = Array.from(doc.querySelectorAll('p'));
    paragraphs.forEach((el) => {
      const text = el.textContent || '';
      
      // Vérifier la longueur
      if (text.length > policy.maxParagraphLength) {
        // Découper en plusieurs blocs
        const chunks = splitLongParagraph(text, policy.maxParagraphLength);
        chunks.forEach((chunk) => {
          blocks.push({
            type: 'paragraph',
            content: { content: chunk, type: 'paragraph' },
            wordCount: chunk.split(/\s+/).filter(w => w.trim()).length,
            charCount: chunk.length,
          });
        });
      } else if (text.trim()) {
        blocks.push({
          type: 'paragraph',
          content: { content: text, type: 'paragraph' },
          wordCount: text.split(/\s+/).filter(w => w.trim()).length,
          charCount: text.length,
        });
      }
    });

    // Traiter les images
    const images = Array.from(doc.querySelectorAll('img'));
    images.forEach((el, index) => {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || `Image ${index + 1}`;
      
      blocks.push({
        type: 'image',
        content: { 
          type: 'image',
          src,
          alt,
          caption: el.getAttribute('title') || '',
        },
        wordCount: 0,
        charCount: 0,
      });
    });

    // Traiter les listes
    const lists = Array.from(doc.querySelectorAll('ul, ol'));
    lists.forEach((list) => {
      const items = Array.from(list.querySelectorAll('li'));
      items.forEach((item) => {
        const text = item.textContent || '';
        blocks.push({
          type: 'list_item',
          content: { 
            content: text, 
            type: 'list_item',
            listType: list.tagName === 'UL' ? 'bullet' : 'number',
          },
          wordCount: text.split(/\s+/).filter(w => w.trim()).length,
          charCount: text.length,
        });
      });
    });

    return blocks;
  };

  // =====================================================
  // 4. PARSER TEXTE BRUT
  // =====================================================

  const parseTextContent = (
    text: string,
    policy: WordFormattingPolicy
  ): Array<{ type: string; content: any; wordCount: number; charCount: number }> => {
    const blocks: Array<{ type: string; content: any; wordCount: number; charCount: number }> = [];

    // Découper par lignes
    const lines = text.split('\n');

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) return;

      // Détecter le type de bloc
      let type = 'paragraph';
      let content = trimmedLine;

      // Titres (markdown-style)
      if (trimmedLine.startsWith('# ')) {
        type = 'heading1';
        content = trimmedLine.slice(2);
      } else if (trimmedLine.startsWith('## ')) {
        type = 'heading2';
        content = trimmedLine.slice(3);
      } else if (trimmedLine.startsWith('### ')) {
        type = 'heading3';
        content = trimmedLine.slice(4);
      }
      // Listes
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        type = 'list_item';
        content = trimmedLine.slice(2);
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        type = 'list_item';
        content = trimmedLine.replace(/^\d+\.\s/, '');
      }

      // Ajouter le bloc
      if (content.trim()) {
        blocks.push({
          type,
          content: { content, type },
          wordCount: content.split(/\s+/).filter(w => w.trim()).length,
          charCount: content.length,
        });
      }
    });

    return blocks;
  };

  // =====================================================
  // 5. DÉCOUPER UN PARAGRAPHE TROP LONG
  // =====================================================

  const splitLongParagraph = (text: string, maxLength: number): string[] => {
    const chunks: string[] = [];
    
    if (text.length <= maxLength) {
      return [text];
    }

    // Découper aux phrases
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    sentences.forEach((sentence) => {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  };

  // =====================================================
  // 6. CONVERTIR DEPUIS UN FICHIER (DOCX, PDF, TXT)
  // =====================================================

  const convertFileToBlocks = async (
    documentId: string,
    fileUrl: string,
    fileName: string
  ): Promise<ConversionResult> => {
    setConverting(true);
    setError(null);

    const result: ConversionResult = {
      success: false,
      blocksCreated: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Déterminer le type de fichier
      const extension = fileName.split('.').pop()?.toLowerCase();

      let content = '';

      if (extension === 'txt') {
        // Fichier texte simple
        const response = await fetch(fileUrl);
        content = await response.text();
      } else if (extension === 'docx' || extension === 'pdf') {
        // Pour DOCX et PDF, utiliser une Edge Function
        const { data, error: convertError } = await supabase.functions.invoke('convert-to-html', {
          body: { file_url: fileUrl, file_type: extension },
        });

        if (convertError) {
          throw new Error(`Erreur conversion: ${convertError.message}`);
        }

        content = data.html || '';
      } else {
        throw new Error(`Format non supporté: .${extension}`);
      }

      // Convertir le contenu en blocs
      return await convertDocumentToBlocks(documentId, content);

    } catch (err: any) {
      console.error('Erreur convertFileToBlocks:', err);
      result.errors.push(err.message);
      setError(err.message);
    } finally {
      setConverting(false);
    }

    return result;
  };

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================

  return {
    converting,
    error,
    convertDocumentToBlocks,
    convertFileToBlocks,
    parseContentToBlocks,
  };
}
