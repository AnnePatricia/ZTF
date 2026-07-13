// src/components/departments/D7/TranslationEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TRANSLATION_PASSES, ZTF_BILINGUAL_GLOSSARY, BIBLE_VERSIONS_MAPPING, type TranslationTask } from '../../../types/translation';
import StyleGuide from './StyleGuide';

interface TranslationEditorProps {
  task: TranslationTask;
  onBack: () => void;
}

export default function TranslationEditor({ task, onBack }: TranslationEditorProps) {
  const [translatedContent, setTranslatedContent] = useState(task.translated_content || '');
  const [originalContent, setOriginalContent] = useState(task.original_content || '');
  const [currentPass, setCurrentPass] = useState(task.current_pass || 1);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  // const [showOriginal, setShowOriginal] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showBibleVersions, setShowBibleVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(task.word_count || 0);
  const [doctrinalIssues, setDoctrinalIssues] = useState(task.doctrinal_issues || '');
  const [linguisticNotes, setLinguisticNotes] = useState(task.linguistic_notes || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'french-only' | 'english-only'>('side-by-side');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: translatedContent || `<h1>${task.manuscript_title || 'Manuscrit'}</h1><p>Commencez la traduction ici...</p>`,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w: string) => w).length;
      setWordCount(words);
      setTranslatedContent(editor.getHTML());
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleAutoSave(), 30000);
    },
  });

  useEffect(() => {
    const loadOriginalContent = async () => {
      if (!task.source_task_id) return;
      try {
        const { data } = await supabase
          .from('correction_tasks')
          .select('corrected_content')
          .eq('id', task.source_task_id)
          .single();
        if (data?.corrected_content) setOriginalContent(data.corrected_content);
      } catch (err) {
        console.error('Erreur chargement contenu original:', err);
      }
    };
    loadOriginalContent();
  }, [task.source_task_id]);

  const handleAutoSave = useCallback(async () => {
    if (!editor) return;
    setSaving(true);
    try {
      await supabase
        .from('translation_tasks')
        .update({
          translated_content: editor.getHTML(),
          current_pass: currentPass,
          word_count: wordCount,
          doctrinal_issues: doctrinalIssues,
          linguistic_notes: linguisticNotes,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
    setSaving(false);
  }, [editor, task.id, currentPass, wordCount, doctrinalIssues, linguisticNotes, notes]);

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  const handleNextPass = async () => {
    if (currentPass < 7) {
      if (!confirm(`Passer à la Passe ${currentPass + 1} : ${TRANSLATION_PASSES[currentPass].name} ?`)) return;
      setCurrentPass(currentPass + 1);
      await supabase
        .from('translation_tasks')
        .update({ current_pass: currentPass + 1, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      alert(`✅ Passe ${currentPass} terminée !\n\nCommencez la Passe ${currentPass + 1} : ${TRANSLATION_PASSES[currentPass].name}`);
    }
  };

  const handleSubmit = async () => {
    if (!editor) return;
    if (wordCount < 1000) { alert('❌ Le manuscrit doit contenir au moins 1000 mots'); return; }
    if (currentPass < 7) { alert(`❌ Vous devez compléter les 7 passes.\nPasse actuelle : ${currentPass}/7`); return; }
    if (!confirm('Soumettre ce manuscrit pour double validation ?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('translation_tasks')
        .update({
          status: 'submitted',
          translated_content: editor.getHTML(),
          current_pass: 7,
          word_count: wordCount,
          doctrinal_issues: doctrinalIssues,
          linguistic_notes: linguisticNotes,
          notes: notes,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      if (error) throw error;
      alert('✅ Manuscrit soumis pour double validation !');
      onBack();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentPassConfig = TRANSLATION_PASSES.find(p => p.id === currentPass);

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2">
              <i className="fas fa-arrow-left"></i> Retour
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {task.manuscript_title || 'Manuscrit sans titre'}
              </h2>
              <p className="text-sm text-gray-500">{task.book?.ztf_id || '—'} • Traduction EN → FR</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin"></i> Sauvegarde...</span>}
            {lastSaved && !saving && <span className="text-sm text-green-600"><i className="fas fa-check-circle"></i> {lastSaved.toLocaleTimeString('fr-FR')}</span>}
          </div>
        </div>
      </div>

      {/* Indicateur de passes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Progression des passes (7 étapes)</h3>
          <div className="flex gap-2">
            <button onClick={() => setShowGlossary(true)} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-200">
              <i className="fas fa-language"></i> Glossaire ZTF
            </button>
            <button onClick={() => setShowBibleVersions(true)} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm flex items-center gap-2 hover:bg-amber-200">
              <i className="fas fa-book-bible"></i> Versions bibliques
            </button>
            <button onClick={() => setShowStyleGuide(true)} className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-sm flex items-center gap-2 hover:bg-pink-200">
              <i className="fas fa-book"></i> Guide
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {TRANSLATION_PASSES.map(pass => (
            <div key={pass.id} className={`p-2 rounded-lg border-2 transition-all text-center ${pass.id === currentPass ? `${pass.color} text-white border-current` : pass.id < currentPass ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'}`}>
              <i className={`fas ${pass.icon} text-lg mb-1`}></i>
              <p className="text-xs font-semibold">Passe {pass.id}</p>
              <p className="text-xs opacity-75">{pass.name}</p>
              {pass.id < currentPass && <p className="text-xs mt-1">✅</p>}
            </div>
          ))}
        </div>
        {currentPassConfig && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>Passe actuelle :</strong> {currentPassConfig.name} — {currentPassConfig.description}
            </p>
          </div>
        )}
      </div>

      {/* Mode d'affichage */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex gap-3">
          <button onClick={() => setViewMode('side-by-side')} className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'side-by-side' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            <i className="fas fa-columns mr-2"></i> Côte à côte
          </button>
          <button onClick={() => setViewMode('french-only')} className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'french-only' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            <i className="fas fa-language mr-2"></i> Français uniquement
          </button>
          <button onClick={() => setViewMode('english-only')} className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'english-only' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            <i className="fas fa-flag-usa mr-2"></i> Anglais uniquement
          </button>
        </div>
      </div>

      {/* Éditeur bilingue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contenu original (anglais) */}
        {(viewMode === 'side-by-side' || viewMode === 'english-only') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-flag-usa text-blue-600"></i>
                Texte original (Anglais) — D6
              </h3>
            </div>
            <div className="p-6">
              <div className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-h-[600px] overflow-y-auto" dangerouslySetInnerHTML={{ __html: originalContent || '<p>Aucun contenu original disponible</p>' }} />
            </div>
          </div>
        )}

        {/* Éditeur de traduction (français) */}
        {(viewMode === 'side-by-side' || viewMode === 'french-only') && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-language text-purple-600"></i>
                Traduction (Français)
              </h3>
            </div>
            {editor && (
              <div className="p-6">
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`} title="Gras"><i className="fas fa-bold"></i></button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`} title="Italique"><i className="fas fa-italic"></i></button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`} title="Souligné"><i className="fas fa-underline"></i></button>
                  <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`}>H1</button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`}>H2</button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`}>H3</button>
                  <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`}><i className="fas fa-list-ul"></i></button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600'}`}><i className="fas fa-list-ol"></i></button>
                  <div className="flex-1"></div>
                  <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <i className="fas fa-font"></i> {wordCount.toLocaleString('fr-FR')} mots
                  </span>
                </div>
                <EditorContent editor={editor} className="prose dark:prose-invert max-w-none min-h-[500px] p-6 border border-gray-200 dark:border-gray-600 rounded-lg" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Statistiques et notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-chart-bar text-purple-600"></i>
          Statistiques et notes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">
              <i className="fas fa-cross mr-1"></i> Problèmes doctrinaux
            </label>
            <textarea value={doctrinalIssues} onChange={(e) => setDoctrinalIssues(e.target.value)} className="w-full px-3 py-2 border border-amber-300 dark:border-amber-600 rounded-lg dark:bg-amber-900/20 dark:text-white" rows={2} placeholder="Problèmes doctrinaux détectés..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
              <i className="fas fa-spell-check mr-1"></i> Notes linguistiques
            </label>
            <textarea value={linguisticNotes} onChange={(e) => setLinguisticNotes(e.target.value)} className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg dark:bg-purple-900/20 dark:text-white" rows={2} placeholder="Notes sur la qualité linguistique..." />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes de traduction</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" rows={3} placeholder="Choix de traduction, difficultés rencontrées..." />
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex justify-between items-center">
        <button onClick={handleAutoSave} disabled={saving} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50">
          <i className="fas fa-save"></i> Sauvegarder
        </button>
        <div className="flex gap-3">
          {currentPass < 7 && (
            <button onClick={handleNextPass} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">
              <i className="fas fa-arrow-right"></i> Passe suivante
            </button>
          )}
          <button onClick={handleSubmit} disabled={submitting || currentPass < 7} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2">
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Soumission...' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showStyleGuide && <StyleGuide onClose={() => setShowStyleGuide(false)} />}
      {showGlossary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-language text-purple-600"></i> Glossaire ZTF Bilingue
              </h3>
              <button onClick={() => setShowGlossary(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {ZTF_BILINGUAL_GLOSSARY.map((term, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-2">
                    <span className="text-blue-600 font-semibold text-sm flex-1">{term.english}</span>
                    <i className="fas fa-arrow-right text-gray-400"></i>
                    <span className="text-purple-600 font-semibold text-sm flex-1">{term.french}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowGlossary(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
      {showBibleVersions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-book-bible text-amber-600"></i> Correspondance des versions bibliques
              </h3>
              <button onClick={() => setShowBibleVersions(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Les versions bibliques doivent correspondre entre l'anglais et le français.</p>
              <div className="space-y-2">
                {BIBLE_VERSIONS_MAPPING.map((mapping, i) => (
                  <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2">
                    <span className="text-blue-600 font-semibold text-sm flex-1">{mapping.english}</span>
                    <i className="fas fa-arrow-right text-gray-400"></i>
                    <span className="text-amber-600 font-semibold text-sm flex-1">{mapping.french}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowBibleVersions(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}