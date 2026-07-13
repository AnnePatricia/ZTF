// src/components/departments/D5/RewritingEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { REWRITING_PASSES, type RewritingTask } from '../../../types/rewriting';
import StyleGuide from './StyleGuide';

interface RewritingEditorProps {
  task: RewritingTask;
  onBack: () => void;
}

export default function RewritingEditor({ task, onBack }: RewritingEditorProps) {
  const [rewrittenContent, setRewrittenContent] = useState(task.rewritten_content || '');
  const [originalContent, setOriginalContent] = useState(task.original_content || '');
  const [currentPass, setCurrentPass] = useState(task.current_pass || 1);
  const [showStyleGuide, setShowStyleGuide] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(task.word_count || 0);
  const [notes, setNotes] = useState(task.notes || '');
  const [doctrinalIssues, setDoctrinalIssues] = useState(task.doctrinal_issues || '');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: rewrittenContent || `<h1>${task.manuscript_title || 'Manuscrit sans titre'}</h1><p>Commencez la réécriture ici...</p>`,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w: string) => w).length;
      setWordCount(words);
      setRewrittenContent(editor.getHTML());

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleAutoSave(), 30000);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  useEffect(() => {
    const loadOriginalContent = async () => {
      if (!task.source_task_id) return;
      
      try {
        const { data } = await supabase
          .from('editorialization_tasks')
          .select('manuscript_content')
          .eq('id', task.source_task_id)
          .single();

        if (data?.manuscript_content) {
          setOriginalContent(data.manuscript_content);
        }
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
        .from('rewriting_tasks')
        .update({
          rewritten_content: editor.getHTML(),
          current_pass: currentPass,
          word_count: wordCount,
          notes: notes,
          doctrinal_issues: doctrinalIssues,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
    setSaving(false);
  }, [editor, task.id, currentPass, wordCount, notes, doctrinalIssues]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleNextPass = async () => {
    if (currentPass < 3) {
      if (!confirm(`Passer à la Passe ${currentPass + 1} : ${REWRITING_PASSES[currentPass].name} ?\n\nAssurez-vous d'avoir terminé la passe actuelle.`)) return;
      
      setCurrentPass(currentPass + 1);
      await supabase
        .from('rewriting_tasks')
        .update({
          current_pass: currentPass + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);
      
      alert(`✅ Passe ${currentPass} terminée !\n\nCommencez la Passe ${currentPass + 1} : ${REWRITING_PASSES[currentPass].name}`);
    }
  };

  const handleSubmit = async () => {
    if (!editor) return;
    if (wordCount < 1000) {
      alert('❌ Le manuscrit doit contenir au moins 1000 mots');
      return;
    }
    if (currentPass < 3) {
      alert(`❌ Vous devez compléter les 3 passes avant de soumettre.\nPasse actuelle : ${currentPass}/3`);
      return;
    }
    if (!confirm('Soumettre ce manuscrit pour double validation anglophone ?')) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('rewriting_tasks')
        .update({
          status: 'submitted',
          rewritten_content: editor.getHTML(),
          current_pass: 3,
          word_count: wordCount,
          notes: notes,
          doctrinal_issues: doctrinalIssues,
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

  // ✅ UTILISER currentPassConfig pour afficher des infos
  const currentPassConfig = REWRITING_PASSES.find(p => p.id === currentPass);

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
                {task.manuscript_title || 'Manuscrit sans titre'}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id || '—'} • Réécriture & Style ZTF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin"></i> Sauvegarde...</span>}
            {lastSaved && !saving && <span className="text-sm text-green-600"><i className="fas fa-check-circle"></i> {lastSaved.toLocaleTimeString('fr-FR')}</span>}
          </div>
        </div>
      </div>

      {/* Indicateur de passe */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Progression des passes</h3>
          <button
            onClick={() => setShowStyleGuide(true)}
            className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-200"
          >
            <i className="fas fa-book"></i>
            Guide de Style ZTF
          </button>
        </div>
        <div className="flex gap-2">
          {REWRITING_PASSES.map(pass => (
            <div
              key={pass.id}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                pass.id === currentPass
                  ? `${pass.color} text-white border-current`
                  : pass.id < currentPass
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500'
              }`}
            >
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
        {/* ✅ UTILISER currentPassConfig */}
        {currentPassConfig && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Passe actuelle :</strong> {currentPassConfig.name} — {currentPassConfig.description}
            </p>
          </div>
        )}
      </div>

      {/* Bascule Original/Réécriture */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex gap-3">
          <button
            onClick={() => setShowOriginal(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !showOriginal ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <i className="fas fa-pen-fancy mr-2"></i>
            Réécriture
          </button>
          <button
            onClick={() => setShowOriginal(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              showOriginal ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <i className="fas fa-file-alt mr-2"></i>
            Contenu original (D4)
          </button>
        </div>
      </div>

      {/* Éditeur */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        {!showOriginal && editor ? (
          <div className="p-6">
            {/* Barre d'outils */}
            <div className="flex flex-wrap gap-1 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Gras"
              >
                <i className="fas fa-bold"></i>
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Italique"
              >
                <i className="fas fa-italic"></i>
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Souligné"
              >
                <i className="fas fa-underline"></i>
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Titre 1"
              >
                H1
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Titre 2"
              >
                H2
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Titre 3"
              >
                H3
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-500 mx-1"></div>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Liste à puces"
              >
                <i className="fas fa-list-ul"></i>
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-600'}`}
                title="Liste numérotée"
              >
                <i className="fas fa-list-ol"></i>
              </button>
              <div className="flex-1"></div>
              <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <i className="fas fa-font"></i>
                {wordCount.toLocaleString('fr-FR')} mots
              </span>
            </div>

            <EditorContent
              editor={editor}
              className="prose dark:prose-invert max-w-none min-h-[500px] p-6 border border-gray-200 dark:border-gray-600 rounded-lg"
            />
          </div>
        ) : showOriginal ? (
          <div className="p-6">
            <div className="prose dark:prose-invert max-w-none p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              dangerouslySetInnerHTML={{ __html: originalContent || '<p>Aucun contenu original disponible</p>' }}
            />
          </div>
        ) : null}
      </div>

      {/* Notes et signalement doctrinal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-sticky-note text-blue-600"></i>
          Notes et signalements
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes de réécriture
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Choix stylistiques, difficultés rencontrées..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-2">
              <i className="fas fa-exclamation-triangle mr-1"></i>
              Signalement d'addition doctrinale (renvoi à D4 si nécessaire)
            </label>
            <textarea
              value={doctrinalIssues}
              onChange={(e) => setDoctrinalIssues(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg dark:bg-red-900/20 dark:text-white"
              rows={3}
              placeholder="Si une reformulation nécessite d'ajouter une idée absente du texte original, signalez-la ici..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex justify-between items-center">
        <button
          onClick={handleAutoSave}
          disabled={saving}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <i className="fas fa-save"></i>
          Sauvegarder
        </button>
        <div className="flex gap-3">
          {currentPass < 3 && (
            <button
              onClick={handleNextPass}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <i className="fas fa-arrow-right"></i>
              Passer à la passe suivante
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || currentPass < 3}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Soumission...' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>

      {/* Modal Guide de Style */}
      {showStyleGuide && (
        <StyleGuide onClose={() => setShowStyleGuide(false)} />
      )}
    </div>
  );
}