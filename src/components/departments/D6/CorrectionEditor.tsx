// src/components/departments/D6/CorrectionEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { CORRECTION_PASSES, BRITISH_ENGLISH_RULES, DOCTRINAL_KEYWORDS, type CorrectionTask } from '../../../types/correction';
import StyleGuide from './StyleGuide';

interface CorrectionEditorProps {
  task: CorrectionTask;
  onBack: () => void;
}

export default function CorrectionEditor({ task, onBack }: CorrectionEditorProps) {
  const [correctedContent, setCorrectedContent] = useState(task.corrected_content || '');
  const [originalContent, setOriginalContent] = useState(task.original_content || '');
  const [currentPass, setCurrentPass] = useState(task.current_pass || 1);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showBritishRules, setShowBritishRules] = useState(false);
  const [showDoctrinal, setShowDoctrinal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(task.word_count || 0);
  const [grammarErrors, setGrammarErrors] = useState(task.grammar_errors_fixed || 0);
  const [terminologyIssues, setTerminologyIssues] = useState(task.terminology_issues || '');
  const [notes, setNotes] = useState(task.notes || '');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: correctedContent || `<h1>${task.manuscript_title || 'Manuscrit'}</h1><p>Commencez la correction ici...</p>`,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w: string) => w).length;
      setWordCount(words);
      setCorrectedContent(editor.getHTML());
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleAutoSave(), 30000);
    },
  });

  useEffect(() => {
    const loadOriginalContent = async () => {
      if (!task.source_task_id) return;
      try {
        const { data } = await supabase
          .from('rewriting_tasks')
          .select('rewritten_content')
          .eq('id', task.source_task_id)
          .single();
        if (data?.rewritten_content) setOriginalContent(data.rewritten_content);
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
        .from('correction_tasks')
        .update({
          corrected_content: editor.getHTML(),
          current_pass: currentPass,
          word_count: wordCount,
          grammar_errors_fixed: grammarErrors,
          terminology_issues: terminologyIssues,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
    setSaving(false);
  }, [editor, task.id, currentPass, wordCount, grammarErrors, terminologyIssues, notes]);

  useEffect(() => {
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, []);

  const handleNextPass = async () => {
    if (currentPass < 3) {
      if (!confirm(`Passer à la Passe ${currentPass + 1} : ${CORRECTION_PASSES[currentPass].name} ?`)) return;
      setCurrentPass(currentPass + 1);
      await supabase
        .from('correction_tasks')
        .update({ current_pass: currentPass + 1, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      alert(`✅ Passe ${currentPass} terminée !\n\nCommencez la Passe ${currentPass + 1} : ${CORRECTION_PASSES[currentPass].name}`);
    }
  };

  const handleSubmit = async () => {
    if (!editor) return;
    if (wordCount < 1000) { alert('❌ Le manuscrit doit contenir au moins 1000 mots'); return; }
    if (currentPass < 3) { alert(`❌ Vous devez compléter les 3 passes.\nPasse actuelle : ${currentPass}/3`); return; }
    if (!confirm('Soumettre ce manuscrit pour double validation ?')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('correction_tasks')
        .update({
          status: 'submitted',
          corrected_content: editor.getHTML(),
          current_pass: 3,
          word_count: wordCount,
          grammar_errors_fixed: grammarErrors,
          terminology_issues: terminologyIssues,
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

  const currentPassConfig = CORRECTION_PASSES.find(p => p.id === currentPass);

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
              <p className="text-sm text-gray-500">{task.book?.ztf_id || '—'} • Correction Intelligente</p>
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
          <h3 className="font-bold text-gray-900 dark:text-white">Progression des passes</h3>
          <div className="flex gap-2">
            <button onClick={() => setShowBritishRules(true)} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-200">
              <i className="fas fa-flag"></i> British English
            </button>
            <button onClick={() => setShowDoctrinal(true)} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-200">
              <i className="fas fa-key"></i> Mots-clés
            </button>
            <button onClick={() => setShowStyleGuide(true)} className="px-3 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-sm flex items-center gap-2 hover:bg-teal-200">
              <i className="fas fa-book"></i> Guide
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          {CORRECTION_PASSES.map(pass => (
            <div key={pass.id} className={`flex-1 p-3 rounded-lg border-2 transition-all ${pass.id === currentPass ? `${pass.color} text-white border-current` : pass.id < currentPass ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'}`}>
              <div className="flex items-center gap-2 mb-1">
                <i className={`fas ${pass.icon}`}></i>
                <span className="font-semibold text-sm">Passe {pass.id}</span>
              </div>
              <p className="text-xs">{pass.name}</p>
              {pass.id === currentPass && <p className="text-xs mt-1 opacity-90">{pass.description}</p>}
              {pass.id < currentPass && <p className="text-xs mt-1">✅ Terminée</p>}
            </div>
          ))}
        </div>
        {currentPassConfig && (
          <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
            <p className="text-sm text-teal-800 dark:text-teal-200">
              <strong>Passe actuelle :</strong> {currentPassConfig.name} — {currentPassConfig.description}
            </p>
          </div>
        )}
      </div>

      {/* Bascule Original/Correction */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex gap-3">
          <button onClick={() => setShowOriginal(false)} className={`px-4 py-2 rounded-lg font-medium transition-all ${!showOriginal ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            <i className="fas fa-spell-check mr-2"></i> Correction
          </button>
          <button onClick={() => setShowOriginal(true)} className={`px-4 py-2 rounded-lg font-medium transition-all ${showOriginal ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            <i className="fas fa-file-alt mr-2"></i> Contenu original (D5)
          </button>
        </div>
      </div>

      {/* Éditeur */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        {!showOriginal && editor ? (
          <div className="p-6">
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`} title="Gras"><i className="fas fa-bold"></i></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`} title="Italique"><i className="fas fa-italic"></i></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`} title="Souligné"><i className="fas fa-underline"></i></button>
              <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`}>H1</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`}>H2</button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`}>H3</button>
              <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`}><i className="fas fa-list-ul"></i></button>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-600'}`}><i className="fas fa-list-ol"></i></button>
              <div className="flex-1"></div>
              <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <i className="fas fa-font"></i> {wordCount.toLocaleString('fr-FR')} mots
              </span>
              <span className="px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <i className="fas fa-check-double"></i> {grammarErrors} erreurs corrigées
              </span>
            </div>
            <EditorContent editor={editor} className="prose dark:prose-invert max-w-none min-h-[500px] p-6 border border-gray-200 dark:border-gray-600 rounded-lg" />
          </div>
        ) : showOriginal ? (
          <div className="p-6">
            <div className="prose dark:prose-invert max-w-none p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700" dangerouslySetInnerHTML={{ __html: originalContent || '<p>Aucun contenu original disponible</p>' }} />
          </div>
        ) : null}
      </div>

      {/* Statistiques et notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-chart-bar text-teal-600"></i>
          Statistiques et notes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <i className="fas fa-check-double mr-1"></i> Erreurs corrigées
            </label>
            <input type="number" value={grammarErrors} onChange={(e) => setGrammarErrors(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
              <i className="fas fa-key mr-1"></i> Problèmes terminologiques
            </label>
            <textarea value={terminologyIssues} onChange={(e) => setTerminologyIssues(e.target.value)} className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg dark:bg-purple-900/20 dark:text-white" rows={2} placeholder="Mots-clés doctrinaux modifiés ou manquants..." />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes de correction</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" rows={3} placeholder="Choix de correction, difficultés rencontrées..." />
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex justify-between items-center">
        <button onClick={handleAutoSave} disabled={saving} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50">
          <i className="fas fa-save"></i> Sauvegarder
        </button>
        <div className="flex gap-3">
          {currentPass < 3 && (
            <button onClick={handleNextPass} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2">
              <i className="fas fa-arrow-right"></i> Passe suivante
            </button>
          )}
          <button onClick={handleSubmit} disabled={submitting || currentPass < 3} className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2">
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Soumission...' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showStyleGuide && <StyleGuide onClose={() => setShowStyleGuide(false)} />}
      {showBritishRules && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-flag text-blue-600"></i> Règles British English
              </h3>
              <button onClick={() => setShowBritishRules(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {BRITISH_ENGLISH_RULES.map((rule, i) => (
                  <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-2">
                    <span className="text-red-600 line-through text-sm flex-1">{rule.american}</span>
                    <i className="fas fa-arrow-right text-gray-400"></i>
                    <span className="text-green-600 font-semibold text-sm flex-1">{rule.british}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowBritishRules(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
      {showDoctrinal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-key text-purple-600"></i> Mots-clés doctrinaux intouchables
              </h3>
              <button onClick={() => setShowDoctrinal(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Ces termes ne doivent JAMAIS être modifiés ou remplacés par des synonymes.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {DOCTRINAL_KEYWORDS.map(word => (
                  <span key={word} className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-mono font-semibold">
                    {word}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button onClick={() => setShowDoctrinal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}