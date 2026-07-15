// src/components/superCorrection/SCReader.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useRoles } from '../../hooks/useRoles';
import CommentThread from './CommentThread';
import ValidationPanel from './ValidationPanel';
import type { SuperCorrectionBook } from '../../types/superCorrection';

interface SCReaderProps {
  book: SuperCorrectionBook;
  onClose: () => void;
}

export default function SCReader({ book, onClose }: SCReaderProps) {
  const { currentUser } = useRoles();
  const [content, setContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
    loadReadingProgress();
  }, [book.id]);

  const loadContent = async () => {
    try {
      // Charger le contenu du livre depuis ztf_books
      const { data, error } = await supabase
        .from('ztf_books')
        .select('content')
        .eq('id', book.book_id)
        .single();

      if (error) throw error;
      setContent(data?.content || '');
    } catch (err) {
      console.error('Erreur chargement contenu:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReadingProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('sc_validations')
        .select('reading_progress')
        .eq('sc_book_id', book.id)
        .eq('corrector_id', user.id)
        .single();

      if (data) {
        setReadingProgress(data.reading_progress || 0);
      }
    } catch (err) {
      console.error('Erreur chargement progression:', err);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setShowCommentModal(true);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    const progress = Math.round((scrollTop / scrollHeight) * 100);
    setReadingProgress(progress);

    // Sauvegarder la progression
    saveReadingProgress(progress);
  };

  const saveReadingProgress = async (progress: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('sc_validations')
        .select('id')
        .eq('sc_book_id', book.id)
        .eq('corrector_id', user.id)
        .single();

      if (existing) {
        await supabase
          .from('sc_validations')
          .update({ reading_progress: progress })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('sc_validations')
          .insert({
            sc_book_id: book.id,
            corrector_id: user.id,
            corrector_name: currentUser?.full_name || user.email,
            corrector_email: user.email,
            reading_progress: progress,
          });
      }
    } catch (err) {
      console.error('Erreur sauvegarde progression:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {book.book_title || 'Livre sans titre'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {book.book_ztf_id || 'N/A'} • Super Correction
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Progression de lecture</p>
              <p className="text-lg font-bold text-purple-600">{readingProgress}%</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2">
          <div
            className="bg-purple-600 h-2 transition-all"
            style={{ width: `${readingProgress}%` }}
          ></div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-8">
          <div
            className="prose dark:prose-invert max-w-none"
            onMouseUp={handleTextSelection}
            onScroll={handleScroll}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {/* Footer avec actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <i className="fas fa-info-circle mr-2"></i>
            Sélectionnez du texte pour ajouter un commentaire
          </div>
          <ValidationPanel
            scBookId={book.id}
            readingProgress={readingProgress}
            onValidated={onClose}
          />
        </div>
      </div>

      {/* Modal commentaire */}
      {showCommentModal && selectedText && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Commentaire
              </h3>
              <button
                onClick={() => setShowCommentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            <div className="p-6">
              <CommentThread
                scBookId={book.id}
                selectedText={selectedText}
                onCommentAdded={() => setShowCommentModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}