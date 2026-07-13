// src/components/departments/D4/ManuscriptEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import PlanBuilder from './PlanBuilder';
import FragmentBrowser from './FragmentBrowser';
import type { EditorializationTask, PlanItem, D4Fragment } from '../../../types/editorialization';

interface ManuscriptEditorProps {
  task: EditorializationTask;
  onBack: () => void;
}

export default function ManuscriptEditor({ task, onBack }: ManuscriptEditorProps) {
  const [structurePlan, setStructurePlan] = useState<PlanItem[]>(task.structure_plan || []);
  const [selectedFragments, setSelectedFragments] = useState<D4Fragment[]>([]);
  const [showFragmentBrowser, setShowFragmentBrowser] = useState(false);
  const [manuscriptTitle, setManuscriptTitle] = useState(task.manuscript_title || '');
  const [manuscriptTheme, setManuscriptTheme] = useState(task.manuscript_theme || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [wordCount, setWordCount] = useState(task.word_count || 0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'plan' | 'fragments'>('editor');
  const [pendingContent, setPendingContent] = useState<string>('');

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: task.manuscript_content || `<h1>${manuscriptTitle}</h1><p>Commencez à assembler votre manuscrit ici...</p>`,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w: string) => w).length;
      setWordCount(words);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleAutoSave(), 30000);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  // Charger les fragments sélectionnés depuis la BDD
  useEffect(() => {
    const loadSelectedFragments = async () => {
      if (task.selected_fragments && task.selected_fragments.length > 0) {
        try {
          const fragmentIds = task.selected_fragments.map(id => id.replace('frag-', ''));
          const { data: cleaningTasks } = await supabase
            .from('cleaning_tasks')
            .select(`
              id,
              book_id,
              cleaned_content,
              word_count_cleaned,
              book:ztf_books(id, ztf_id, title, theme)
            `)
            .in('id', fragmentIds);

          if (cleaningTasks) {
            const fragments: D4Fragment[] = (cleaningTasks as any[]).map((ct: any) => ({
              id: `frag-${ct.id}`,
              cleaning_task_id: ct.id,
              book_id: ct.book_id,
              content: ct.cleaned_content || '',
              theme: ct.book?.theme || 'Non classé',
              word_count: ct.word_count_cleaned || 0,
              evaluation: 'complementaire' as const,
              created_at: new Date().toISOString(),
              book: ct.book ? {
                id: ct.book.id,
                ztf_id: ct.book.ztf_id,
                title: ct.book.title,
                theme: ct.book.theme
              } : undefined,
            }));
            setSelectedFragments(fragments);
          }
        } catch (err) {
          console.error('Erreur chargement fragments:', err);
        }
      }
    };

    loadSelectedFragments();
  }, [task.selected_fragments]);

  // Sauvegarder les fragments dans la BDD
  useEffect(() => {
    if (selectedFragments.length > 0) {
      const saveFragments = async () => {
        try {
          await supabase
            .from('editorialization_tasks')
            .update({
              selected_fragments: selectedFragments.map(f => f.id),
              updated_at: new Date().toISOString()
            })
            .eq('id', task.id);
        } catch (err) {
          console.error('Erreur sauvegarde fragments:', err);
        }
      };
      const timeoutId = setTimeout(() => saveFragments(), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedFragments, task.id]);

  const handleAutoSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    try {
      await supabase
        .from('editorialization_tasks')
        .update({
          manuscript_content: editor.getHTML(),
          manuscript_title: manuscriptTitle,
          manuscript_theme: manuscriptTheme,
          structure_plan: structurePlan,
          selected_fragments: selectedFragments.map(f => f.id),
          word_count: wordCount,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
    setSaving(false);
  }, [editor, task.id, manuscriptTitle, manuscriptTheme, structurePlan, selectedFragments, wordCount, notes]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // Insérer le contenu en attente
  useEffect(() => {
    if (pendingContent && editor && activeTab === 'editor') {
      editor.commands.insertContent(pendingContent);
      setPendingContent('');
    }
  }, [editor, activeTab, pendingContent]);

  const handleManualSave = async () => {
    await handleAutoSave();
    alert('✅ Manuscrit sauvegardé');
  };

  const handleSelectFragment = (fragment: D4Fragment) => {
    const isSelected = selectedFragments.some(f => f.id === fragment.id);
    if (isSelected) {
      setSelectedFragments(prev => prev.filter(f => f.id !== fragment.id));
    } else {
      setSelectedFragments(prev => [...prev, fragment]);
    }
  };

  const insertFragmentInEditor = (fragment: D4Fragment) => {
    const fragmentHtml = `
      <div class="fragment-inserted" data-fragment-id="${fragment.id}" data-source="${fragment.book?.ztf_id}">
        <hr>
        <p class="text-sm text-gray-500"><strong>📎 Fragment inséré depuis :</strong> ${fragment.book?.title} (${fragment.book?.ztf_id})</p>
        <div class="fragment-content">
          ${fragment.content}
        </div>
        <hr>
      </div>
    `;
    setActiveTab('editor');
    setPendingContent(fragmentHtml);
  };

  const handleSubmit = async () => {
    if (!editor) return;

    if (wordCount < 1000) {
      alert('❌ Le manuscrit doit contenir au moins 1000 mots');
      return;
    }

    if (selectedFragments.length === 0) {
      if (!confirm('⚠️ Aucun fragment sélectionné. Soumettre quand même ?')) return;
    }

    if (!confirm('Soumettre ce manuscrit pour validation par le Directeur éditorial ?')) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('editorialization_tasks')
        .update({
          status: 'submitted',
          manuscript_content: editor.getHTML(),
          manuscript_title: manuscriptTitle,
          manuscript_theme: manuscriptTheme,
          structure_plan: structurePlan,
          selected_fragments: selectedFragments.map(f => f.id),
          word_count: wordCount,
          notes: notes,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      alert('✅ Manuscrit soumis pour validation !');
      onBack();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
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
                {manuscriptTitle || 'Manuscrit sans titre'}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id || 'Nouveau manuscrit'} • Éditorialisation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin"></i> Sauvegarde...</span>}
            {lastSaved && !saving && <span className="text-sm text-green-600"><i className="fas fa-check-circle"></i> {lastSaved.toLocaleTimeString('fr-FR')}</span>}
          </div>
        </div>
      </div>

      {/* Informations du manuscrit */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre du manuscrit
            </label>
            <input
              type="text"
              value={manuscriptTitle}
              onChange={(e) => setManuscriptTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Titre du manuscrit final"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Thème principal
            </label>
            <input
              type="text"
              value={manuscriptTheme}
              onChange={(e) => setManuscriptTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="Ex: Prière, Foi, Sainteté..."
            />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'editor'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-edit"></i>
            Éditeur de Manuscrit
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'plan'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-sitemap"></i>
            Plan ({structurePlan.length})
          </button>
          <button
            onClick={() => setActiveTab('fragments')}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'fragments'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className="fas fa-puzzle-piece"></i>
            Fragments ({selectedFragments.length})
          </button>
        </div>

        {/* Contenu de l'onglet */}
        <div className="p-6">
          {/* Onglet Éditeur */}
          {activeTab === 'editor' && editor && (
            <div className="space-y-4">
              {/* Barre d'outils - ✅ CORRECTION : onMouseDown au lieu de onClick */}
              <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Gras"
                >
                  <i className="fas fa-bold"></i>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Italique"
                >
                  <i className="fas fa-italic"></i>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Souligné"
                >
                  <i className="fas fa-underline"></i>
                </button>
                <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Titre 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Titre 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Titre 3"
                >
                  H3
                </button>
                <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Liste à puces"
                >
                  <i className="fas fa-list-ul"></i>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                  className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                  title="Liste numérotée"
                >
                  <i className="fas fa-list-ol"></i>
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => setShowFragmentBrowser(true)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1"
                >
                  <i className="fas fa-puzzle-piece"></i>
                  Insérer un fragment
                </button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <i className="fas fa-font"></i>
                  {wordCount.toLocaleString('fr-FR')} mots
                </span>
              </div>

              {/* Zone d'édition */}
              <EditorContent
                editor={editor}
                className="prose dark:prose-invert max-w-none min-h-[500px] p-6 border border-gray-200 dark:border-gray-600 rounded-lg"
              />
            </div>
          )}

          {/* Onglet Plan */}
          {activeTab === 'plan' && (
            <PlanBuilder plan={structurePlan} onPlanChange={setStructurePlan} />
          )}

          {/* Onglet Fragments */}
          {activeTab === 'fragments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Fragments sélectionnés ({selectedFragments.length})
                </h3>
                <button
                  onClick={() => setShowFragmentBrowser(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
                >
                  <i className="fas fa-plus"></i>
                  Parcourir les fragments D3
                </button>
              </div>

              {selectedFragments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <i className="fas fa-puzzle-piece text-4xl mb-3 block opacity-50"></i>
                  <p>Aucun fragment sélectionné</p>
                  <p className="text-sm mt-2">Cliquez sur "Parcourir les fragments D3" pour commencer</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedFragments.map(fragment => (
                    <div key={fragment.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded">
                              {fragment.book?.ztf_id}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded">
                              {fragment.theme}
                            </span>
                            <span className="text-xs text-gray-500">
                              {fragment.word_count.toLocaleString('fr-FR')} mots
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {fragment.book?.title}
                          </h4>
                          <div
                            className="text-sm text-gray-600 dark:text-gray-400 max-h-20 overflow-hidden"
                            dangerouslySetInnerHTML={{
                              __html: fragment.content.substring(0, 200) + '...'
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => insertFragmentInEditor(fragment)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-plus"></i>
                            Insérer
                          </button>
                          <button
                            onClick={() => handleSelectFragment(fragment)}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-700 dark:text-red-300 rounded text-sm flex items-center gap-1"
                          >
                            <i className="fas fa-times"></i>
                            Retirer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes et soumission */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-paper-plane text-indigo-600"></i>
          Soumission pour validation
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes pour le Directeur éditorial
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            rows={3}
            placeholder="Points d'attention, choix éditoriaux, difficultés rencontrées..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <i className="fas fa-save"></i>
            Sauvegarder
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Soumission...' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>

      {/* Modal Fragment Browser */}
      {showFragmentBrowser && (
        <FragmentBrowser
          onClose={() => setShowFragmentBrowser(false)}
          onSelectFragment={handleSelectFragment}
          selectedFragmentIds={selectedFragments.map(f => f.id)}
        />
      )}
    </div>
  );
}