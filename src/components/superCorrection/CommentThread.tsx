// src/components/superCorrection/CommentThread.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { COMMENT_TYPE_CONFIG, type SuperCorrectionComment } from '../../types/superCorrection';

interface CommentThreadProps {
  scBookId: string;
  selectedText: string;
  onCommentAdded: () => void;
  readOnly?: boolean;
}

export default function CommentThread({ scBookId, selectedText, onCommentAdded, readOnly = false }: CommentThreadProps) {
  const [comments, setComments] = useState<SuperCorrectionComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<SuperCorrectionComment['comment_type']>('question');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
    
    // ✅ Écoute temps réel des nouveaux commentaires
    const channel = supabase
      .channel(`comments-${scBookId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sc_comments',
          filter: `sc_book_id=eq.${scBookId}`,
        },
        (payload) => {
          setComments(prev => [...prev, payload.new as SuperCorrectionComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scBookId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('sc_comments')
        .select('*')
        .eq('sc_book_id', scBookId)
        .eq('selected_text', selectedText)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

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
          comment_type: commentType,
          selected_text: selectedText,
          comment_text: newComment,
          is_resolved: false,
        });

      if (error) throw error;
      setNewComment('');
      onCommentAdded();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('sc_comments')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;
      loadComments();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Chargement...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 space-y-4">
      {/* Texte sélectionné */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
          "{selectedText}"
        </p>
      </div>

      {/* Liste des commentaires */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 text-sm">Aucun commentaire</p>
        ) : (
          comments.map(comment => {
            const typeConfig = COMMENT_TYPE_CONFIG[comment.comment_type];
            return (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${comment.is_resolved ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-gray-50 dark:bg-gray-700 border-gray-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeConfig.color}`}>
                        <i className={`fas ${typeConfig.icon} mr-1`}></i>
                        {typeConfig.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {comment.corrector_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {comment.comment_text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comment.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  {!comment.is_resolved && !readOnly && (
                    <button
                      onClick={() => handleResolve(comment.id)}
                      className="text-green-600 hover:text-green-700"
                      title="Marquer comme résolu"
                    >
                      <i className="fas fa-check-circle"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Formulaire d'ajout */}
      {!readOnly && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de commentaire
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COMMENT_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCommentType(type as any)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                    commentType === type
                      ? `${config.color} ring-2 ring-offset-2`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <i className={`fas ${config.icon} mr-1`}></i>
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Votre commentaire..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            rows={3}
            required
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
          >
            <i className="fas fa-paper-plane mr-2"></i>
            Ajouter le commentaire
          </button>
        </form>
      )}
    </div>
  );
}