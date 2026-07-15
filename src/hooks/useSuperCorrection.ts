// src/hooks/useSuperCorrection.ts
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { SuperCorrectionConfig } from '../types/superCorrection';

export interface SuperCorrectionBook {
  id: string;
  book_id: string;
  status: string;
  validation_threshold: number;
  validation_count: number;
  language: string;
  published_by: string;
  published_at: string;
  locked_at: string | null;
  closed_at: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  // Données du livre (chargées séparément)
  book_title?: string;
  book_ztf_id?: string;
  book_theme?: string;
  book_language?: string;
  book_word_count?: number;
}

export function useSuperCorrection() {
  const [books, setBooks] = useState<SuperCorrectionBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = async () => {
    setLoading(true);
    try {
      // Charger les livres Super Correction
      const { data: scBooks, error: scError } = await supabase
        .from('super_correction_books')
        .select('*')
        .order('published_at', { ascending: false });

      if (scError) throw scError;

      if (!scBooks || scBooks.length === 0) {
        setBooks([]);
        setLoading(false);
        return;
      }

      // ✅ Charger UNIQUEMENT les colonnes qui existent
      const { data: ztfBooks, error: ztfError } = await supabase
        .from('ztf_books')
        .select('id, title, ztf_id, theme, language') // ❌ Supprimer word_count si la colonne n'existe pas
        .in('id', scBooks.map(sc => sc.book_id));

      if (ztfError) {
        console.warn('Erreur chargement ztf_books:', ztfError);
      }

      // Fusionner les données
      const booksWithDetails = scBooks.map((scBook: any) => {
        const ztfBook = ztfBooks?.find((b: any) => b.id === scBook.book_id);
        return {
          ...scBook,
          book_title: ztfBook?.title || 'Livre inconnu',
          book_ztf_id: ztfBook?.ztf_id || 'N/A',
          book_theme: ztfBook?.theme || '',
          book_language: ztfBook?.language || 'EN',
          book_word_count: 0, // ✅ Valeur par défaut si la colonne n'existe pas
        };
      });

      setBooks(booksWithDetails);
    } catch (err: any) {
      console.error('Erreur chargement Super Correction:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const publishBook = async (
    bookId: string,
    config: SuperCorrectionConfig
  ): Promise<{ success: boolean; scBookId?: string; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data: scBook, error: scError } = await supabase
        .from('super_correction_books')
        .insert({
          book_id: bookId,
          status: 'SUPER_CORRECTION_OPEN',
          validation_threshold: config.validation_threshold,
          validation_count: 0,
          language: config.language,
          published_by: user.id,
          published_at: new Date().toISOString(),
          expiry_date: config.expiry_days
            ? new Date(Date.now() + config.expiry_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .select()
        .single();

      if (scError) throw scError;

      // Créer les invitations
      if (config.invited_correctors.length > 0) {
        const invitations = config.invited_correctors.map(email => ({
          sc_book_id: scBook.id,
          email,
          invitation_token: crypto.randomUUID(),
          invited_at: new Date().toISOString(),
        }));

        const { error: inviteError } = await supabase
          .from('sc_invited_correctors')
          .insert(invitations);

        if (inviteError) throw inviteError;
      }

      await loadBooks();
      return { success: true, scBookId: scBook.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const addComment = async (
    scBookId: string,
    commentData: {
      comment_type: string;
      selected_text: string;
      comment_text: string;
      paragraph_index?: number;
      character_offset?: number;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { error } = await supabase
        .from('sc_comments')
        .insert({
          sc_book_id: scBookId,
          corrector_id: user.id,
          corrector_name: user.user_metadata?.full_name || user.email,
          corrector_email: user.email,
          comment_type: commentData.comment_type,
          selected_text: commentData.selected_text,
          comment_text: commentData.comment_text,
          paragraph_index: commentData.paragraph_index,
          character_offset: commentData.character_offset,
          is_resolved: false,
        });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const validateBook = async (
    scBookId: string,
    notes?: string
  ): Promise<{ success: boolean; isLocked?: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Vérifier si déjà validé
      const { data: existingValidation } = await supabase
        .from('sc_validations')
        .select('*')
        .eq('sc_book_id', scBookId)
        .eq('corrector_id', user.id)
        .single();

      if (existingValidation) {
        const { error } = await supabase
          .from('sc_validations')
          .update({
            is_validated: true,
            validation_notes: notes,
            validated_at: new Date().toISOString(),
          })
          .eq('id', existingValidation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sc_validations')
          .insert({
            sc_book_id: scBookId,
            corrector_id: user.id,
            corrector_name: user.user_metadata?.full_name || user.email,
            corrector_email: user.email,
            is_validated: true,
            validation_notes: notes,
            validated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Compter les validations
      const { data: validations } = await supabase
        .from('sc_validations')
        .select('id')
        .eq('sc_book_id', scBookId)
        .eq('is_validated', true);

      const count = validations?.length || 0;

      // Récupérer le seuil
      const { data: scBook } = await supabase
        .from('super_correction_books')
        .select('validation_threshold')
        .eq('id', scBookId)
        .single();

      let isLocked = false;
      if (scBook && count >= scBook.validation_threshold) {
        const { error: lockError } = await supabase
          .from('super_correction_books')
          .update({
            status: 'SUPER_CORRECTION_LOCKED',
            validation_count: count,
            locked_at: new Date().toISOString(),
          })
          .eq('id', scBookId);

        if (lockError) throw lockError;
        isLocked = true;
      } else {
        await supabase
          .from('super_correction_books')
          .update({ validation_count: count })
          .eq('id', scBookId);
      }

      await loadBooks();
      return { success: true, isLocked };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resolveComment = async (
    commentId: string,
    resolved: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('sc_comments')
        .update({
          is_resolved: resolved,
          resolved_at: resolved ? new Date().toISOString() : null,
        })
        .eq('id', commentId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const closeBook = async (scBookId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('super_correction_books')
        .update({
          status: 'SUPER_CORRECTION_CLOSED',
          closed_at: new Date().toISOString(),
        })
        .eq('id', scBookId);

      if (error) throw error;
      await loadBooks();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const unlockBook = async (
    scBookId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('super_correction_books')
        .update({
          status: 'SUPER_CORRECTION_OPEN',
          locked_at: null,
        })
        .eq('id', scBookId);

      if (error) throw error;

      // Logger le déverrouillage
      console.log(`📝 Déverrouillage manuel du livre ${scBookId}: ${reason}`);

      await loadBooks();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  return {
    books,
    loading,
    error,
    publishBook,
    addComment,
    validateBook,
    resolveComment,
    closeBook,
    unlockBook,
    refresh: loadBooks,
  };
}