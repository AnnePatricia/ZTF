// src/components/departments/D3/CleaningEditor.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { useCleaning } from '../../../hooks/useCleaning';
import { DEFAULT_CLEANING_CHECKLIST, ANNOTATION_TYPE_CONFIG } from '../../../types/cleaning';
import type { CleaningTask, AnnotationType, CleaningChecklistItem } from '../../../types/cleaning';

interface CleaningEditorProps {
  task: CleaningTask;
  onBack: () => void;
}

export default function CleaningEditor({ task, onBack }: CleaningEditorProps) {
  const { saveCleaning, updateChecklist, addAnnotation, submitForVerification, startCleaning } = useCleaning();

  const [wordCount, setWordCount] = useState(task.word_count_cleaned || 0);
  const [checklist, setChecklist] = useState<CleaningChecklistItem[]>(
    task.checklist?.length > 0 ? task.checklist : DEFAULT_CLEANING_CHECKLIST
  );
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [annotationType, setAnnotationType] = useState<AnnotationType>('typo');
  const [annotationContent, setAnnotationContent] = useState('');
  const [annotationOriginal, setAnnotationOriginal] = useState('');
  const [annotationSuggestion, setAnnotationSuggestion] = useState('');
  const [notes, setNotes] = useState(task.notes || '');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('edit');

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveCleaningRef = useRef(saveCleaning);
  saveCleaningRef.current = saveCleaning;

  // ✅ handleAutoSave définie AVANT useEditor avec useCallback
  const handleAutoSave = useCallback(async (html: string) => {
    setSaving(true);
    try {
      await saveCleaningRef.current(task.id, html, true);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Erreur auto-save:', err);
    }
    setSaving(false);
  }, [task.id]);

  // ✅ Correction : StarterKit avec underline: false pour éviter le conflit
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,  //  Désactiver underline de StarterKit
      }),
      Underline,  // ✅ Utiliser l'extension séparée
      Highlight.configure({ multicolor: true }),
    ],
    content: task.cleaned_content || task.original_content || '<p>Commencez le nettoyage...</p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter((w: string) => w).length;
      setWordCount(words);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleAutoSave(html), 30000);
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  // ✅ Charger le contenu extrait depuis raw_files
  useEffect(() => {
    if (task.status === 'pending') startCleaning(task.id);

    const loadExtractedContent = async () => {
      if (!editor || !editor.isEmpty || task.original_content) return;

      const ztfIdPattern = task.book?.ztf_id?.replace(/-/g, '_') || '';
      if (!ztfIdPattern) return;

      const { data: rawFile } = await supabase
        .from('raw_files')
        .select('extracted_content')
        .ilike('file_name', `%${ztfIdPattern}%`)
        .single();

      if (rawFile?.extracted_content && editor.isEmpty) {
        editor.commands.setContent(rawFile.extracted_content);
      }
    };

    if (editor) {
      loadExtractedContent();
    }

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [editor, task.id, task.status, startCleaning, task.original_content, task.book?.ztf_id]);

  const handleManualSave = async () => {
    if (!editor) return;
    setSaving(true);
    const html = editor.getHTML();
    await saveCleaning(task.id, html, false);
    setLastSaved(new Date());
    alert('✅ Sauvegardé');
    setSaving(false);
  };

  const toggleChecklistItem = async (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    await updateChecklist(task.id, updated);
  };

  const handleAddAnnotation = async () => {
    if (!annotationContent.trim()) {
      alert('❌ Le contenu de l\'annotation est obligatoire');
      return;
    }

    const success = await addAnnotation(
      task.id,
      annotationType,
      annotationContent,
      annotationOriginal,
      annotationSuggestion
    );

    if (success) {
      alert('✅ Annotation ajoutée');
      setAnnotationContent('');
      setAnnotationOriginal('');
      setAnnotationSuggestion('');
      setShowAnnotationForm(false);
    }
  };

  const handleSubmit = async () => {
    const requiredUnchecked = checklist.filter(c => c.required && !c.checked);
    if (requiredUnchecked.length > 0) {
      alert(`❌ ${requiredUnchecked.length} case(s) obligatoire(s) non cochée(s) dans la checklist`);
      return;
    }

    if (!editor) return;
    const html = editor.getHTML();
    await saveCleaning(task.id, html, false);

    setSubmitting(true);
    const success = await submitForVerification(task.id, notes);

    if (success) {
      alert('✅ Nettoyage soumis pour validation');
      onBack();
    }
    setSubmitting(false);
  };

  const checklistByCategory = checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CleaningChecklistItem[]>);

  const categoryLabels: Record<string, string> = {
    orthographe: ' Orthographe & Grammaire',
    ponctuation: '✏️ Ponctuation',
    style: '🎨 Style & Terminologie',
    factuel: '🔍 Vérification factuelle',
    theologique: '📖 Théologie & Doctrine',
    structure: ' Structure',
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
                {task.book?.title}
              </h2>
              <p className="text-sm text-gray-500">
                {task.book?.ztf_id} • Nettoyage éditorial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'edit' ? 'bg-emerald-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <i className="fas fa-edit mr-1"></i>Édition
              </button>
              <button
                onClick={() => setViewMode('diff')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'diff' ? 'bg-emerald-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
              >
                <i className="fas fa-code-compare mr-1"></i>Track Changes
              </button>
            </div>
            {saving && <span className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin"></i> Sauvegarde...</span>}
            {lastSaved && !saving && <span className="text-sm text-green-600"><i className="fas fa-check-circle"></i> {lastSaved.toLocaleTimeString('fr-FR')}</span>}
          </div>
        </div>
      </div>

      {/* Alerte règle métier */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <i className="fas fa-info-circle"></i>
          <strong>Rappel :</strong> Vous travaillez sur une copie. L'original est préservé dans "Track Changes".
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Éditeur principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barre d'outils */}
          {editor && viewMode === 'edit' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-2 flex flex-wrap gap-1">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <i className="fas fa-bold"></i>
              </button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <i className="fas fa-italic"></i>
              </button>
              <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <i className="fas fa-underline"></i>
              </button>
              <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className="px-3 py-1 rounded bg-yellow-200">
                <i className="fas fa-highlighter"></i>
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>H2</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>H3</button>
              <div className="flex-1"></div>
              <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                <i className="fas fa-font mr-1"></i>{wordCount.toLocaleString('fr-FR')} mots
              </span>
            </div>
          )}

          {/* Contenu */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
            {viewMode === 'edit' ? (
              <EditorContent
                editor={editor}
                className="prose dark:prose-invert max-w-none p-6 min-h-[500px]"
              />
            ) : (
              <div className="p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                  <i className="fas fa-code-compare mr-2"></i>
                  Comparaison Original vs Nettoyé
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-red-600 mb-2">📄 ORIGINAL</h4>
                    <div
                      className="prose dark:prose-invert max-w-none p-4 bg-red-50 dark:bg-red-900/10 rounded-lg max-h-[500px] overflow-y-auto border-2 border-red-200 dark:border-red-800"
                      dangerouslySetInnerHTML={{ __html: task.original_content || '<p>Aucun contenu original</p>' }}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-600 mb-2">✨ NETTOYÉ</h4>
                    <div
                      className="prose dark:prose-invert max-w-none p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg max-h-[500px] overflow-y-auto border-2 border-emerald-200 dark:border-emerald-800"
                      dangerouslySetInnerHTML={{ __html: task.cleaned_content || '<p>Pas encore de contenu nettoyé</p>' }}
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p><strong>Original :</strong> {task.word_count_original} mots</p>
                  <p><strong>Nettoyé :</strong> {wordCount} mots</p>
                  <p><strong>Différence :</strong> {wordCount - task.word_count_original} mots</p>
                </div>
              </div>
            )}
          </div>

          {/* Annotations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fas fa-comment-dots text-emerald-600"></i>
                Annotations ({task.annotations_count})
              </h3>
              <button
                onClick={() => setShowAnnotationForm(!showAnnotationForm)}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm flex items-center gap-1"
              >
                <i className="fas fa-plus"></i>
                Ajouter
              </button>
            </div>

            {showAnnotationForm && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(ANNOTATION_TYPE_CONFIG).map(([type, config]) => (
                      <button
                        key={type}
                        onClick={() => setAnnotationType(type as AnnotationType)}
                        className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${annotationType === type ? `${config.color} text-white` : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}
                      >
                        <i className={`fas ${config.icon}`}></i>
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Texte original (optionnel)</label>
                  <input
                    type="text"
                    value={annotationOriginal}
                    onChange={(e) => setAnnotationOriginal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Ex: mot mal orthographié"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correction suggérée (optionnel)</label>
                  <input
                    type="text"
                    value={annotationSuggestion}
                    onChange={(e) => setAnnotationSuggestion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Ex: correction proposée"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commentaire *</label>
                  <textarea
                    value={annotationContent}
                    onChange={(e) => setAnnotationContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder="Votre commentaire..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddAnnotation}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
                  >
                    <i className="fas fa-check mr-1"></i>Ajouter
                  </button>
                  <button
                    onClick={() => setShowAnnotationForm(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar : Checklist */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sticky top-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i className="fas fa-clipboard-check text-emerald-600"></i>
              Checklist
            </h3>

            {Object.entries(checklistByCategory).map(([category, items]) => (
              <div key={category} className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {categoryLabels[category] || category}
                </h4>
                <div className="space-y-2">
                  {items.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${item.checked
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="mt-1 w-4 h-4 text-emerald-600"
                      />
                      <div className="flex-1">
                        <span className={`text-sm ${item.checked ? 'text-emerald-700 dark:text-emerald-300 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                          {item.label}
                        </span>
                        {item.required && (
                          <span className="ml-1 text-xs text-red-500">*</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Progression :</span>
                <span className="font-bold text-emerald-600">
                  {checklist.filter(c => c.checked).length}/{checklist.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${(checklist.filter(c => c.checked).length / checklist.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions finales */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-paper-plane text-emerald-600"></i>
          Soumission
        </h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes pour le vérificateur
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Points d'attention, difficultés rencontrées..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            rows={3}
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
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <i className="fas fa-paper-plane"></i>
            {submitting ? 'Soumission...' : 'Soumettre pour validation'}
          </button>
        </div>
      </div>
    </div>
  );
}