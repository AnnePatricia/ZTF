// src/hooks/useBookContent.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { ZtfDepartment } from '../types/ztf';

export interface BookContent {
  id: string;
  book_id: string;
  department: ZtfDepartment;
  content: string;
  version: number;
  word_count: number;
  char_count: number;
  last_edited_by: string;
  last_edited_at: string;
}

export interface BookComment {
  id: string;
  book_id: string;
  content_id: string | null;
  author_id: string;
  department: ZtfDepartment;
  text: string;
  resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  author_name?: string;
}

export function useBookContent(bookId: string, department: ZtfDepartment) {
  const [content, setContent] = useState<BookContent | null>(null);
  const [comments, setComments] = useState<BookComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCreatingRef = useRef(false); // ✅ Verrou pour éviter les doublons

  // ✅ Charger le contenu du livre
  const fetchContent = useCallback(async () => {
    console.log('📥 Fetching content for book:', bookId, 'dept:', department);
    setLoading(true);
    setError(null);

    try {
      // 1. Charger le contenu
      const { data: contentData, error: contentError } = await supabase
        .from('book_content')
        .select('*')
        .eq('book_id', bookId)
        .eq('department', department)
        .limit(1);

      if (contentError) {
        console.error('❌ Erreur fetch content:', contentError);
        throw contentError;
      }

      if (contentData && contentData.length > 0) {
        console.log('📄 Content loaded:', contentData[0]);
        setContent(contentData[0]);
      } else {
        // ✅ Créer une entrée vide AVEC VERROU pour éviter la race condition
        if (!isCreatingRef.current) {
          isCreatingRef.current = true;
          console.log('📝 Aucun contenu trouvé, création d\'une entrée vide');
          
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // ✅ Utiliser upsert au lieu de insert pour gérer la concurrence
            const { data: newContent, error: insertError } = await supabase
              .from('book_content')
              .upsert({
                book_id: bookId,
                department: department,
                content: '',
                word_count: 0,
                char_count: 0,
                version: 1,
                last_edited_by: user.id
              }, {
                onConflict: 'book_id,department',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (insertError) {
              console.warn('⚠️ Erreur création contenu (peut être ignorée si déjà créé):', insertError);
              // Si c'est un conflit, recharger
              if (insertError.code === '23505') {
                const { data: existingContent } = await supabase
                  .from('book_content')
                  .select('*')
                  .eq('book_id', bookId)
                  .eq('department', department)
                  .limit(1);
                
                if (existingContent && existingContent.length > 0) {
                  setContent(existingContent[0]);
                }
              } else {
                setContent(null);
              }
            } else {
              console.log('✅ Contenu vide créé:', newContent);
              setContent(newContent);
            }
          } else {
            setContent(null);
          }
          
          isCreatingRef.current = false;
        }
      }

      // 2. Charger les commentaires
      const { data: commentsData, error: commentsError } = await supabase
        .from('book_comments')
        .select('*')
        .eq('book_id', bookId)
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('❌ Erreur chargement commentaires:', commentsError);
        setComments([]);
      } else if (!commentsData || commentsData.length === 0) {
        setComments([]);
      } else {
        // Charger les noms des auteurs séparément
        const authorIds = [...new Set(commentsData.map(c => c.author_id).filter(Boolean))];
        let authorsMap: Record<string, string> = {};

        if (authorIds.length > 0) {
          try {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, full_name')
              .in('id', authorIds);

            if (usersData) {
              authorsMap = Object.fromEntries(
                usersData.map(u => [u.id, u.full_name || 'Utilisateur'])
              );
            }
          } catch (err) {
            console.warn('⚠️ Impossible de charger les noms des auteurs:', err);
          }
        }

        const mappedComments: BookComment[] = commentsData.map(c => ({
          ...c,
          author_name: authorsMap[c.author_id] || 'Utilisateur inconnu'
        }));

        setComments(mappedComments);
      }

    } catch (err: any) {
      console.error('❌ Erreur fetch content:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [bookId, department]);

  useEffect(() => {
    if (bookId) fetchContent();
  }, [fetchContent]);

  // ✅ Sauvegarder le contenu
  const saveContent = useCallback(async (newContent: string) => {
    if (!bookId) return { success: false, error: 'Aucun livre sélectionné' };
    
    console.log('💾 Saving content:', newContent.length, 'chars');
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const wordCount = newContent.trim() ? newContent.trim().split(/\s+/).length : 0;
      const charCount = newContent.length;

      // ✅ Si pas de contenu, créer d'abord avec upsert
      if (!content?.id) {
        console.log('📝 Pas de contenu existant, création via upsert');
        const { data: newRecord, error: upsertError } = await supabase
          .from('book_content')
          .upsert({
            book_id: bookId,
            department: department,
            content: newContent,
            word_count: wordCount,
            char_count: charCount,
            version: 1,
            last_edited_by: user.id
          }, {
            onConflict: 'book_id,department',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (upsertError) {
          // Si conflit, recharger et réessayer
          if (upsertError.code === '23505') {
            console.log('⚠️ Conflit détecté, rechargement...');
            await fetchContent();
            return { success: true };
          }
          throw upsertError;
        }

        setContent(newRecord);
        return { success: true };
      }

      // Update normal
      const { error: updateError } = await supabase
        .from('book_content')
        .update({
          content: newContent,
          word_count: wordCount,
          char_count: charCount,
          last_edited_by: user.id,
          last_edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', content.id);

      if (updateError) throw updateError;

      // Historique (non bloquant)
      try {
        await supabase.from('book_content_history').insert({
          content_id: content.id,
          book_id: bookId,
          department: department,
          content: newContent,
          version: content.version + 1,
          saved_by: user.id,
          change_summary: 'Modification manuelle'
        });
      } catch (historyError) {
        console.warn('⚠️ Erreur historique (non bloquant):', historyError);
      }

      setContent({
        ...content,
        content: newContent,
        word_count: wordCount,
        char_count: charCount,
        version: content.version + 1
      });

      return { success: true };
    } catch (err: any) {
      console.error('❌ Erreur save:', err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, [bookId, department, content, fetchContent]);

  // ✅ Auto-save avec debounce
  const autoSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 2000);
  }, [saveContent]);

  // ✅ Ajouter un commentaire
  const addComment = async (text: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('book_comments')
        .insert({
          book_id: bookId,
          content_id: content?.id || null,
          author_id: user.id,
          department: department,
          text,
          resolved: false
        });

      if (error) throw error;
      await fetchContent();
      return { success: true };
    } catch (err: any) {
      console.error('❌ Erreur ajout commentaire:', err);
      return { success: false, error: err.message };
    }
  };

  // ✅ Résoudre un commentaire
  const resolveComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('book_comments')
        .update({ 
          resolved: true, 
          resolved_by: user?.id || null, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', commentId);

      if (error) throw error;
      await fetchContent();
      return { success: true };
    } catch (err: any) {
      console.error('❌ Erreur résolution commentaire:', err);
      return { success: false, error: err.message };
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    content,
    comments,
    loading,
    saving,
    error,
    saveContent,
    autoSave,
    addComment,
    resolveComment,
    refresh: fetchContent,
    lastSavedAt: content?.last_edited_at
  };
}