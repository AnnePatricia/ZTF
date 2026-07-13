// src/components/departments/D4/BookViewer.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import type { EditorializationTask } from '../../../types/editorialization';

interface BookViewerProps {
  task: EditorializationTask;
  onBack: () => void;
}

export default function BookViewer({ task, onBack }: BookViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [realWordCount, setRealWordCount] = useState<number>(0);
  const [contentType, setContentType] = useState<'manuscript' | 'original' | 'none'>('none');

  useEffect(() => {
    const loadContent = async () => {
      try {
        // 1. Essayer de charger le contenu du manuscrit
        const { data: taskData, error: taskError } = await supabase
          .from('editorialization_tasks')
          .select('manuscript_content, manuscript_title, manuscript_theme, word_count')
          .eq('id', task.id)
          .single();

        if (taskError) throw taskError;

        // 2. Si le manuscrit a du contenu, l'afficher
        if (taskData?.manuscript_content) {
          setContent(taskData.manuscript_content);
          setContentType('manuscript');
          setRealWordCount(taskData.word_count || 0);
        } 
        // 3. Sinon, essayer de charger le contenu original depuis cleaning_tasks
        else if (task.book_id) {
          const { data: cleaningData } = await supabase
            .from('cleaning_tasks')
            .select('cleaned_content, original_content, word_count_cleaned')
            .eq('book_id', task.book_id)
            .eq('status', 'verified')
            .maybeSingle();

          if (cleaningData) {
            const originalContent = cleaningData.cleaned_content || cleaningData.original_content;
            if (originalContent) {
              setContent(originalContent);
              setContentType('original');
              setRealWordCount(cleaningData.word_count_cleaned || 0);
            }
          }
        }
      } catch (err) {
        console.error('Erreur chargement contenu:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [task.id, task.book_id]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            Retour
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {task.manuscript_title || task.book?.title || 'Manuscrit sans titre'}
            </h2>
            <p className="text-sm text-gray-500">
              {task.book?.ztf_id || '—'} • {task.manuscript_theme || task.book?.theme || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Contenu du livre */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Chargement du contenu...</p>
          </div>
        ) : content ? (
          <>
            {/* Badge indiquant le type de contenu */}
            <div className="mb-4">
              {contentType === 'manuscript' ? (
                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full text-sm font-medium">
                  <i className="fas fa-edit mr-1"></i>
                  Manuscrit assemblé (D4)
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium">
                  <i className="fas fa-file-alt mr-1"></i>
                  Contenu original (D3) — Commencez l'assemblage dans l'onglet "Éditeur"
                </span>
              )}
            </div>
            
            <div
              className="prose dark:prose-invert max-w-none p-6 border border-gray-200 dark:border-gray-700 rounded-lg"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-book-open text-5xl mb-4 block opacity-50"></i>
            <p>Aucun contenu disponible</p>
            <p className="text-sm mt-2">Le livre n'a pas encore de contenu</p>
          </div>
        )}
      </div>

      {/* Informations - ✅ CORRECTION : Suppression de "Fragments" */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Statut :</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-white">{task.status}</span>
          </div>
          <div>
            <span className="text-gray-500">Mots :</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-white">{realWordCount.toLocaleString('fr-FR')}</span>
          </div>
          <div>
            <span className="text-gray-500">Éditorialiste :</span>
            <span className="ml-2 font-semibold text-gray-900 dark:text-white">{task.assigned_user?.full_name || 'Non assigné'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}