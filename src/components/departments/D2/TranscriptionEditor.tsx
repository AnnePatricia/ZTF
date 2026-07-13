// src/components/departments/D2/TranscriptionEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useTranscription } from '../../../hooks/useTranscription';
import type { TranscriptionTask } from '../../../types/transcription';
import { TRANSCRIPTION_LEVEL_LABELS } from '../../../types/transcription';
import '../../../styles/tiptap.css';
import 'prosemirror-view/style/prosemirror.css';

interface TranscriptionEditorProps {
  task: TranscriptionTask;
  onBack: () => void;
}

export default function TranscriptionEditor({ task, onBack }: TranscriptionEditorProps) {
  const { saveTranscription, startTranscription } = useTranscription();
  const [wordCount, setWordCount] = useState(task.word_count || 0);
  const [aiUsed, setAiUsed] = useState(task.ai_used || false);
  const [aiPercentage, setAiPercentage] = useState(task.ai_percentage || 0);
  const [humanRevisionDone, setHumanRevisionDone] = useState(task.human_revision_done || false);
  const [notes, setNotes] = useState(task.notes || '');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTranscriptionRef = useRef(saveTranscription);
  saveTranscriptionRef.current = saveTranscription;

  const handleAutoSave = useCallback(async (html: string) => {
    setSaving(true);
    try {
      const success = await saveTranscriptionRef.current(task.id, html, true);
      if (success) setLastSaved(new Date());
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
    setSaving(false);
  }, [task.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w: string) => w).length;
      setWordCount(words);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        handleAutoSave(html);
      }, 30000);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
        style: 'white-space: pre-wrap;',
      },
    },
  });

  useEffect(() => {
    if (task.status === 'pending') {
      startTranscription(task.id);
    }

    const loadContent = async () => {
      if (!editor) return;
      setLoadingContent(true);

      try {
        // 1. Si la transcription a déjà du contenu, l'utiliser
        if (task.transcription_content && task.transcription_content.trim() !== '') {
          editor.commands.setContent(task.transcription_content);
          const text = editor.getText();
          const words = text.trim().split(/\s+/).filter((w: string) => w).length;
          setWordCount(words);
          setLoadingContent(false);
          return;
        }

        // 2. ✅ CORRECTION: Charger le contenu depuis ztf_books.content
        if (task.book_id) {
          const { data: book, error: bookError } = await supabase
            .from('ztf_books')
            .select('content, ztf_id, raw_file_id')  // ✅ AJOUTER 'content' ici
            .eq('id', task.book_id)
            .single();

          if (bookError || !book) {
            console.error('Erreur chargement livre:', bookError);
            setLoadingContent(false);
            return;
          }

          // ✅ Utiliser le contenu de ztf_books.content
          if (book.content && book.content.trim() !== '') {
            editor.commands.setContent(book.content);
            const text = editor.getText();
            const words = text.trim().split(/\s+/).filter((w: string) => w).length;
            setWordCount(words);
            console.log('✅ Contenu chargé depuis ztf_books.content:', words, 'mots');
          } else {
            console.warn('⚠️ Aucun contenu dans ztf_books.content pour', book.ztf_id);

            // Fallback vers raw_files si content est vide
            if (book.raw_file_id) {
              const { data: rawFile } = await supabase
                .from('raw_files')
                .select('extracted_content, file_name')
                .eq('id', book.raw_file_id)
                .single();

              if (rawFile?.extracted_content) {
                editor.commands.setContent(rawFile.extracted_content);
                const text = editor.getText();
                const words = text.trim().split(/\s+/).filter((w: string) => w).length;
                setWordCount(words);
                console.log('✅ Contenu chargé depuis raw_files:', words, 'mots');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement contenu:', error);
      }

      setLoadingContent(false);
    };

    loadContent();

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [editor, task.id, task.status, task.book_id, task.transcription_content, startTranscription]);

  const handleManualSave = async () => {
    if (!editor) return;
    setSaving(true);
    const html = editor.getHTML();
    const success = await saveTranscription(task.id, html, false);
    if (success) {
      setLastSaved(new Date());
      alert('✅ Transcription sauvegardée');
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!editor) return;

    if (wordCount < 100) {
      alert('❌ La transcription doit contenir au moins 100 mots');
      return;
    }

    if (aiUsed && !humanRevisionDone) {
      alert('❌ Une révision humaine est obligatoire lorsque l\'IA a été utilisée');
      return;
    }

    if (!confirm('Soumettre cette transcription pour validation ?')) return;

    setSubmitting(true);

    try {
      const html = editor.getHTML();

      // 1. Sauvegarder le contenu HTML
      const { error: saveError } = await supabase
        .from('transcription_tasks')
        .update({
          transcription_content: html,
          word_count: wordCount,
          ai_used: aiUsed,
          ai_percentage: aiPercentage,
          human_revision_done: humanRevisionDone,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (saveError) {
        alert(' Erreur sauvegarde: ' + saveError.message);
        setSubmitting(false);
        return;
      }

      // 2. Mettre à jour le statut à 'submitted'
      const { error: statusError } = await supabase
        .from('transcription_tasks')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (statusError) {
        alert('❌ Erreur changement de statut: ' + statusError.message);
        setSubmitting(false);
        return;
      }

      alert('✅ Transcription soumise pour validation');
      onBack();

    } catch (err: any) {
      console.error('Erreur soumission:', err);
      alert('❌ Erreur: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const levelConfig = TRANSCRIPTION_LEVEL_LABELS[task.transcription_level as 1 | 2];

  if (loadingContent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du contenu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex items-center justify-between">
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
                {task.book?.title}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id} • {levelConfig.label} — {levelConfig.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <i className="fas fa-spinner fa-spin"></i>
                Sauvegarde...
              </span>
            )}
            {lastSaved && !saving && (
              <span className="text-sm text-green-600 flex items-center gap-2">
                <i className="fas fa-check-circle"></i>
                Sauvegardé à {lastSaved.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barre d'outils TipTap */}
      {/* Barre d'outils TipTap */}
      {editor && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 flex flex-wrap gap-1">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            <i className="fas fa-bold"></i>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            <i className="fas fa-italic"></i>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            <i className="fas fa-underline"></i>
          </button>
          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            H3
          </button>
          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            <i className="fas fa-list-ul"></i>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            <i className="fas fa-list-ol"></i>
          </button>
          <div className="flex-1"></div>
          <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <i className="fas fa-font"></i>
            {wordCount.toLocaleString('fr-FR')} mots
          </span>
        </div>
      )}

      {/* Éditeur */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none p-6 min-h-[500px] focus:outline-none"
        />
      </div>

      {/* Panneau de soumission */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-paper-plane text-purple-600"></i>
          Soumission pour validation
        </h3>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
            <i className="fas fa-robot"></i>
            Déclaration d'utilisation de l'IA
          </h4>
          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={aiUsed}
              onChange={(e) => setAiUsed(e.target.checked)}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              J'ai utilisé un outil d'IA (Whisper, Otter.ai, etc.) pour cette transcription
            </span>
          </label>
          {aiUsed && (
            <>
              <div className="mb-3">
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Pourcentage du texte transcrit par l'IA : {aiPercentage}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={aiPercentage}
                  onChange={(e) => setAiPercentage(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-300 dark:border-yellow-700">
                <input
                  type="checkbox"
                  checked={humanRevisionDone}
                  onChange={(e) => setHumanRevisionDone(e.target.checked)}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>⚠️ OBLIGATOIRE :</strong> Je certifie avoir effectué une révision humaine complète
                </span>
              </label>
            </>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes pour le vérificateur
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            rows={3}
            placeholder="Ajoutez des notes pour le vérificateur..."
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
            disabled={submitting || (aiUsed && !humanRevisionDone)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Soumission...' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>
    </div>
  );
}