// src/components/departments/D4/FragmentBrowser.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import type { D4Fragment, EditorializationTask } from '../../../types/editorialization';

interface FragmentBrowserProps {
  onClose: () => void;
  onSelectFragment: (fragment: D4Fragment) => void;
  selectedFragmentIds: string[];
  currentTaskId?: string;
}

export default function FragmentBrowser({ onClose, onSelectFragment, selectedFragmentIds, currentTaskId }: FragmentBrowserProps) {
  const [manuscripts, setManuscripts] = useState<EditorializationTask[]>([]);
  const [selectedManuscript, setSelectedManuscript] = useState<EditorializationTask | null>(null);
  const [manuscriptContent, setManuscriptContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedText, setSelectedText] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadManuscripts();
  }, []);

  const loadManuscripts = async () => {
    setLoading(true);
    try {
      console.log('🔍 Chargement des livres D3 (sources)...');
      
      // ✅ Charger les livres provenant de D3 (book_id != null)
      let query = supabase
        .from('editorialization_tasks')
        .select(`
          *,
          book:ztf_books(id, ztf_id, title, theme, language),
          assigned_user:ztf_users!assigned_to(full_name, email)
        `)
        .not('book_id', 'is', null)  // ✅ Livres provenant de D3
        .order('created_at', { ascending: false });

      // Exclure le manuscrit en cours d'édition (si c'est un livre D3)
      if (currentTaskId) {
        query = query.neq('id', currentTaskId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur chargement livres D3:', error);
        setManuscripts([]);
        setLoading(false);
        return;
      }

      console.log('✅ Livres D3 trouvés:', data?.length || 0);
      setManuscripts((data as any) || []);
    } catch (err) {
      console.error('❌ Erreur chargement livres D3:', err);
      setManuscripts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectManuscript = async (manuscript: EditorializationTask) => {
    setSelectedManuscript(manuscript);
    setSelectedText('');
    setContentLoading(true);

    try {
      // ✅ Charger le contenu depuis cleaning_tasks
      const { data: cleaningData } = await supabase
        .from('cleaning_tasks')
        .select('cleaned_content, original_content')
        .eq('book_id', manuscript.book_id)
        .eq('status', 'verified')
        .maybeSingle();

      if (cleaningData) {
        const content = cleaningData.cleaned_content || cleaningData.original_content || '';
        setManuscriptContent(content);
      } else {
        setManuscriptContent('');
      }
    } catch (err) {
      console.error('Erreur chargement contenu:', err);
      setManuscriptContent('');
    } finally {
      setContentLoading(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleSelectText = () => {
    if (!selectedManuscript || !selectedText) {
      alert('⚠️ Veuillez d\'abord sélectionner du texte dans le contenu');
      return;
    }

    const fragment: D4Fragment = {
      id: `frag-${selectedManuscript.book_id}-${Date.now()}`,
      cleaning_task_id: String(selectedManuscript.book_id),
      book_id: String(selectedManuscript.book_id),
      content: selectedText,
      theme: selectedManuscript.manuscript_theme || selectedManuscript.book?.theme || 'Non classé',
      word_count: selectedText.trim().split(/\s+/).filter(w => w).length,
      evaluation: 'complementaire' as const,
      created_at: new Date().toISOString(),
      book: {
        id: selectedManuscript.book?.id || '',
        ztf_id: selectedManuscript.book?.ztf_id || 'D3',
        title: selectedManuscript.manuscript_title || selectedManuscript.book?.title || 'Livre D3',
        theme: selectedManuscript.book?.theme || selectedManuscript.manuscript_theme
      },
    };

    onSelectFragment(fragment);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleSelectFullManuscript = () => {
    if (!selectedManuscript) return;

    const fragment: D4Fragment = {
      id: `frag-${selectedManuscript.book_id}`,
      cleaning_task_id: String(selectedManuscript.book_id),
      book_id: String(selectedManuscript.book_id),
      content: manuscriptContent,
      theme: selectedManuscript.manuscript_theme || selectedManuscript.book?.theme || 'Non classé',
      word_count: manuscriptContent.trim().split(/\s+/).filter(w => w).length,
      evaluation: 'complementaire' as const,
      created_at: new Date().toISOString(),
      book: {
        id: selectedManuscript.book?.id || '',
        ztf_id: selectedManuscript.book?.ztf_id || 'D3',
        title: selectedManuscript.manuscript_title || selectedManuscript.book?.title || 'Livre D3',
        theme: selectedManuscript.book?.theme || selectedManuscript.manuscript_theme
      },
    };

    onSelectFragment(fragment);
  };

  const filteredManuscripts = manuscripts.filter(m => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      m.manuscript_title?.toLowerCase().includes(search) ||
      m.manuscript_theme?.toLowerCase().includes(search) ||
      m.book?.title?.toLowerCase().includes(search) ||
      m.book?.ztf_id?.toLowerCase().includes(search)
    );
  });

  const isSelected = (manuscriptId: string) => {
    return selectedFragmentIds.some(id => id.includes(manuscriptId));
  };

  // Vue liste des livres D3
  if (!selectedManuscript) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* En-tête */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-book text-indigo-600"></i>
                Navigateur de Livres D3
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {manuscripts.length} livre(s) disponible(s) comme source
                {selectedFragmentIds.length > 0 && (
                  <span className="ml-2 text-indigo-600 font-semibold">
                    • {selectedFragmentIds.length} fragment(s) déjà sélectionné(s)
                  </span>
                )}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          {/* Recherche */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un livre par ID, titre ou thème..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Liste des livres */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement des livres D3...</p>
              </div>
            ) : filteredManuscripts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <i className="fas fa-inbox text-5xl mb-4 block opacity-50"></i>
                <p>Aucun livre disponible</p>
                <p className="text-sm mt-2">
                  {manuscripts.length === 0 
                    ? "Aucun livre n'a été transmis de D3 à D4. Utilisez \"Ajouter un livre\" pour commencer."
                    : "Aucun livre ne correspond à votre recherche"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredManuscripts.map(manuscript => {
                  const selected = isSelected(manuscript.id);
                  
                  return (
                    <div
                      key={manuscript.id}
                      onClick={() => handleSelectManuscript(manuscript)}
                      className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                              {manuscript.book?.ztf_id || '—'}
                            </span>
                            {manuscript.manuscript_theme && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                                {manuscript.manuscript_theme}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {manuscript.manuscript_title || manuscript.book?.title || 'Livre sans titre'}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Livre D3 • {manuscript.book?.language || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selected && (
                            <span className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
                              <i className="fas fa-check mr-1"></i>Déjà sélectionné
                            </span>
                          )}
                          <i className="fas fa-chevron-right text-gray-400"></i>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pied de page */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vue contenu du livre D3 sélectionné
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <button
              onClick={() => { setSelectedManuscript(null); setManuscriptContent(''); }}
              className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 flex items-center gap-1"
            >
              <i className="fas fa-arrow-left"></i>
              Retour à la liste
            </button>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedManuscript.manuscript_title || selectedManuscript.book?.title || 'Livre sans titre'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded mr-2">
                {selectedManuscript.book?.ztf_id}
              </span>
              {selectedManuscript.manuscript_theme && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                  {selectedManuscript.manuscript_theme}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Contenu du livre */}
        <div className="flex-1 overflow-y-auto p-6">
          {contentLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Chargement du contenu...</p>
            </div>
          ) : manuscriptContent ? (
            <div
              ref={contentRef}
              className="prose dark:prose-invert max-w-none p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 select-text cursor-text"
              onMouseUp={handleTextSelection}
              dangerouslySetInnerHTML={{ __html: manuscriptContent }}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <i className="fas fa-book-open text-5xl mb-4 block opacity-50"></i>
              <p>Aucun contenu disponible pour ce livre</p>
            </div>
          )}
        </div>

        {/* Pied de page avec actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {selectedText ? (
              <span className="text-green-600">
                <i className="fas fa-check-circle mr-1"></i>
                {selectedText.split(/\s+/).length} mot(s) sélectionné(s)
              </span>
            ) : (
              <span>
                <i className="fas fa-info-circle mr-1"></i>
                Sélectionnez du texte dans le contenu
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setSelectedManuscript(null); setManuscriptContent(''); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
            >
              Retour
            </button>
            <button
              onClick={handleSelectFullManuscript}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <i className="fas fa-file-alt"></i>
              Sélectionner le livre complet
            </button>
            <button
              onClick={handleSelectText}
              disabled={!selectedText}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                selectedText
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-cut"></i>
              Sélectionner le texte ({selectedText ? `${selectedText.split(/\s+/).length} mots` : '0 mot'})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}