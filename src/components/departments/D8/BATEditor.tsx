// src/components/departments/D8/BATEditor.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../supabaseClient';
import { useBookContent } from '../../../hooks/useBookContent';
import type { ZtfBook } from '../../../types/ztf';

interface BATEditorProps {
  book: ZtfBook;
  onBack: () => void;
}

interface DepartmentStatus {
  department: string;
  label: string;
  icon: string;
  completed: boolean;
  wordCount: number;
  updatedAt: string | null;
}

interface Publication {
  id: string;
  book_id: string;
  published_by: string;
  published_at: string;
  format: string;
  file_url: string | null;
  notes: string | null;
  metadata: any;
  publisherName: string;
}

export default function BATEditor({ book, onBack }: BATEditorProps) {
  const {
    content,
    comments,
    loading,
    saveContent,
    addComment,
    resolveComment
  } = useBookContent(book.id, 'D8');

  const [text, setText] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [publishNotes, setPublishNotes] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [departmentStatuses, setDepartmentStatuses] = useState<DepartmentStatus[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [totalWordCount, setTotalWordCount] = useState(0);
  const [isPublished, setIsPublished] = useState(false);

  // ✅ Charger les statuts des départements (CORRIGÉ - sans boucle infinie)
  const loadDepartmentStatuses = useCallback(async () => {
    const departments = [
      { dept: 'D2', label: 'Transcription', icon: 'fa-keyboard' },
      { dept: 'D3', label: 'Nettoyage', icon: 'fa-broom' },
      { dept: 'D4', label: 'Éditorialisation', icon: 'fa-book' },
      { dept: 'D5', label: 'Correction stylistique', icon: 'fa-pen-fancy' },
      { dept: 'D6', label: 'Super Correction', icon: 'fa-edit' },
      { dept: 'D7', label: 'Traduction', icon: 'fa-language' },
    ];

    const statuses: DepartmentStatus[] = [];
    let totalWords = 0;

    for (const dep of departments) {
      try {
        // ✅ Utiliser .limit(1) au lieu de .single() pour éviter l'erreur 406
        const { data, error } = await supabase
          .from('book_content')
          .select('content, word_count, updated_at')
          .eq('book_id', book.id)
          .eq('department', dep.dept)
          .limit(1);

        if (error) {
          console.warn(`⚠️ Erreur chargement ${dep.dept}:`, error);
          statuses.push({
            department: dep.dept,
            label: dep.label,
            icon: dep.icon,
            completed: false,
            wordCount: 0,
            updatedAt: null
          });
          continue;
        }

        const hasContent = data && data.length > 0 && data[0].content && data[0].content.trim().length > 0;
        const wordCount = data && data.length > 0 ? (data[0].word_count || 0) : 0;
        
        if (hasContent) totalWords += wordCount;

        statuses.push({
          department: dep.dept,
          label: dep.label,
          icon: dep.icon,
          completed: hasContent,
          wordCount,
          updatedAt: data && data.length > 0 ? data[0].updated_at : null
        });
      } catch (err) {
        console.error(`❌ Erreur ${dep.dept}:`, err);
        statuses.push({
          department: dep.dept,
          label: dep.label,
          icon: dep.icon,
          completed: false,
          wordCount: 0,
          updatedAt: null
        });
      }
    }

    setDepartmentStatuses(statuses);
    setTotalWordCount(totalWords);
  }, [book.id]); // ✅ Dépendance uniquement sur book.id

  // ✅ Charger les publications
  const loadPublications = useCallback(async () => {
    const { data: pubsData, error } = await supabase
      .from('book_publications')
      .select('*')
      .eq('book_id', book.id)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Erreur chargement publications:', error);
      return;
    }

    if (pubsData && pubsData.length > 0) {
      setIsPublished(true);
      
      const publisherIds = [...new Set(pubsData.map(p => p.published_by).filter(Boolean))];
      let publishersMap: Record<string, string> = {};

      if (publisherIds.length > 0) {
        try {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', publisherIds);

          if (usersData) {
            publishersMap = Object.fromEntries(
              usersData.map(u => [u.id, u.full_name || 'Éditeur'])
            );
          }
        } catch (err) {
          console.warn('⚠️ Impossible de charger les éditeurs:', err);
        }
      }

      setPublications(pubsData.map(p => ({
        ...p,
        publisherName: publishersMap[p.published_by] || 'Éditeur inconnu'
      })));
    }
  }, [book.id]); // ✅ Dépendance uniquement sur book.id

  // ✅ Charger au montage une seule fois
  useEffect(() => {
    loadDepartmentStatuses();
    loadPublications();
  }, [loadDepartmentStatuses, loadPublications]);

  // ✅ Charger le contenu D8
  useEffect(() => {
    if (content?.content) {
      setText(content.content);
    }
  }, [content]);

  // Exporter en TXT
  const exportTXT = () => {
    setExporting(true);
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.ztf_id}_final.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  // Exporter en DOC
  const exportDOC = () => {
    setExporting(true);
    try {
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${book.title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; padding: 2cm; }
            h1 { font-size: 18pt; text-align: center; margin-bottom: 1cm; }
            .meta { text-align: center; color: #666; margin-bottom: 2cm; font-size: 10pt; }
            p { margin-bottom: 12pt; text-align: justify; }
          </style>
        </head>
        <body>
          <h1>${book.title}</h1>
          <div class="meta">
            <p><strong>ID:</strong> ${book.ztf_id}</p>
            <p><strong>Thème:</strong> ${book.theme}</p>
            <p><strong>Langue:</strong> ${book.language}</p>
            <p><strong>Date de publication:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
            <hr>
          </div>
          <div>${text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.ztf_id}_final.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  // Exporter en PDF
  const exportPDF = () => {
    setExporting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${book.title}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; padding: 2cm; }
              h1 { font-size: 18pt; text-align: center; margin-bottom: 1cm; }
              .meta { text-align: center; color: #666; margin-bottom: 2cm; font-size: 10pt; }
              p { margin-bottom: 12pt; text-align: justify; }
              @media print { body { padding: 1cm; } }
            </style>
          </head>
          <body>
            <h1>${book.title}</h1>
            <div class="meta">
              <p><strong>ID:</strong> ${book.ztf_id}</p>
              <p><strong>Thème:</strong> ${book.theme}</p>
              <p><strong>Langue:</strong> ${book.language}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              <hr>
            </div>
            ${text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  // Publier le livre
  const publishBook = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir publier ce livre ? Cette action est irréversible.')) {
      return;
    }

    setPublishing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // 1. Enregistrer la publication
      const { error: pubError } = await supabase
        .from('book_publications')
        .insert({
          book_id: book.id,
          published_by: user.id,
          format: 'final',
          notes: publishNotes || null,
          metadata: {
            total_word_count: totalWordCount,
            departments_completed: departmentStatuses.filter(d => d.completed).length,
            total_departments: departmentStatuses.length
          }
        });

      if (pubError) throw pubError;

      // 2. Mettre à jour le statut du livre
      const { error: updateError } = await supabase
        .from('ztf_books')
        .update({
          ztf_status: 'PUBLISHED',
          published_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', book.id);

      if (updateError) throw updateError;

      // 3. Sauvegarder le contenu final
      await saveContent(text);

      alert('🎉 Livre publié avec succès !');
      setIsPublished(true);
      setPublishNotes('');
      await loadPublications();
    } catch (err: any) {
      console.error('Erreur publication:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const result = await addComment(newComment);
    if (result?.success) {
      setNewComment('');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const completedDepartments = departmentStatuses.filter(d => d.completed).length;
  const totalDepartments = departmentStatuses.length;
  const completionPercentage = totalDepartments > 0 ? (completedDepartments / totalDepartments) * 100 : 0;
  const allDepartmentsCompleted = completedDepartments === totalDepartments;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto' : 'bg-white dark:bg-gray-800 rounded-xl shadow-lg'}`}>
      {isFullscreen && (
        <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-900 dark:text-white">{book.title}</h3>
            <span className="text-sm text-gray-500">{book.ztf_id}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2"
          >
            <i className="fas fa-compress"></i>
            Quitter le plein écran
          </button>
        </div>
      )}

      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-sm text-violet-600 hover:text-violet-800 mb-2 flex items-center gap-1"
            >
              <i className="fas fa-arrow-left"></i> Retour à la liste
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{book.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {book.ztf_id} • {book.theme} • {book.language}
            </p>
            {isPublished && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs font-semibold">
                <i className="fas fa-check-circle"></i>
                Publié le {publications[0] ? new Date(publications[0].published_at).toLocaleDateString('fr-FR') : ''}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center gap-2 text-gray-900 dark:text-white"
              title="Mode plein écran"
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center gap-2 text-gray-900 dark:text-white"
            >
              <i className="fas fa-history"></i>
              Historique
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center gap-2 text-gray-900 dark:text-white"
            >
              <i className="fas fa-comments"></i>
              Commentaires ({comments.filter(c => !c.resolved).length})
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className={`${isFullscreen ? 'w-full' : 'flex-1'} p-6`}>
          {/* Checklist de validation */}
          <div className="mb-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-100 flex items-center gap-2">
                <i className="fas fa-clipboard-check"></i>
                Checklist de validation ({completedDepartments}/{totalDepartments})
              </h3>
              <span className="text-sm font-bold text-violet-600">{completionPercentage.toFixed(0)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  allDepartmentsCompleted ? 'bg-green-500' : 'bg-violet-500'
                }`}
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {departmentStatuses.map(dep => (
                <div
                  key={dep.department}
                  className={`p-2 rounded-lg border flex items-center gap-2 ${
                    dep.completed
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <i className={`fas ${dep.completed ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'}`}></i>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {dep.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {dep.wordCount} mots
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {!allDepartmentsCompleted && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Certains départements ne sont pas encore complétés. Vous pouvez quand même publier.
                </p>
              </div>
            )}
          </div>

          {/* Boutons d'export */}
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <i className="fas fa-file-export"></i>
              Export du livre final
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportTXT}
                disabled={exporting}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <i className="fas fa-file-alt"></i>
                Export TXT
              </button>
              <button
                onClick={exportDOC}
                disabled={exporting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <i className="fas fa-file-word"></i>
                Export DOC
              </button>
              <button
                onClick={exportPDF}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <i className="fas fa-file-pdf"></i>
                Export PDF
              </button>
            </div>
          </div>

          {/* Zone de texte finale */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                <i className="fas fa-book-open mr-2"></i>
                Contenu final
              </h3>
              <span className="text-sm text-gray-500">{wordCount} mots</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Contenu final du livre..."
              className="w-full h-[500px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm dark:bg-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Section publication */}
          {!isPublished && (
            <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg text-white">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                <i className="fas fa-rocket"></i>
                Publication finale
              </h3>
              <p className="text-sm text-violet-100 mb-3">
                Une fois publié, le livre sera marqué comme "PUBLIÉ" et ne pourra plus être modifié.
              </p>
              <textarea
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Notes de publication (optionnel)..."
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-violet-200 mb-3"
                rows={2}
              />
              <button
                onClick={publishBook}
                disabled={publishing}
                className="px-6 py-3 bg-white text-violet-600 font-bold rounded-lg hover:bg-violet-50 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas ${publishing ? 'fa-spinner fa-spin' : 'fa-check-circle'}`}></i>
                {publishing ? 'Publication...' : 'Publier le livre'}
              </button>
            </div>
          )}
        </div>

        {/* Panneau historique */}
        {showHistory && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900" style={{ maxHeight: '800px' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <i className="fas fa-history"></i>
              Historique du livre
            </h3>

            <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Récapitulatif</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ID</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white">{book.ztf_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Thème</span>
                  <span className="text-gray-900 dark:text-white">{book.theme}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Langue</span>
                  <span className="text-gray-900 dark:text-white">{book.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Responsable</span>
                  <span className="text-gray-900 dark:text-white">{book.responsible_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Mots total</span>
                  <span className="font-bold text-violet-600">{totalWordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Étapes complétées</span>
                  <span className="font-bold text-violet-600">{completedDepartments}/{totalDepartments}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Publications ({publications.length})
              </h4>
              {publications.length === 0 ? (
                <p className="text-xs text-gray-500 text-center">Aucune publication</p>
              ) : (
                <div className="space-y-2">
                  {publications.map(pub => (
                    <div
                      key={pub.id}
                      className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-green-800 dark:text-green-200">
                          ✓ Publié
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(pub.published_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Par: {pub.publisherName}
                      </p>
                      {pub.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
                          "{pub.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Commentaires ({comments.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center">Aucun commentaire</p>
                ) : (
                  comments.map(comment => (
                    <div
                      key={comment.id}
                      className={`p-2 rounded border text-xs ${
                        comment.resolved
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 opacity-60'
                          : 'bg-white dark:bg-gray-800 border-gray-200'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-white">{comment.author_name}</p>
                      <p className="text-gray-700 dark:text-gray-300">{comment.text}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Panneau commentaires */}
        {showComments && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto" style={{ maxHeight: '800px' }}>
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <i className="fas fa-comments"></i>
              Commentaires
            </h3>

            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-900 dark:text-white"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                className="mt-2 w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm"
              >
                Ajouter
              </button>
            </div>

            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Aucun commentaire</p>
              ) : (
                comments.map(comment => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-lg border ${
                      comment.resolved
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-60'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                    {!comment.resolved && (
                      <button
                        onClick={() => resolveComment(comment.id)}
                        className="mt-2 text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                      >
                        ✓ Résoudre
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}