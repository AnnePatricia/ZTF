// src/components/superCorrection/SCViewer.tsx
import { useState, useEffect } from 'react';
import { SuperCorrectionService } from '../../services/superCorrectionService';
import { SC_COMMENT_TYPE_LABELS } from '../../types/superCorrection';
import type { SuperCorrectionPublication, SCCorrecteur, SCCommentaire, SCCommentType } from '../../types/superCorrection';
import { useRoles } from '../../hooks/useRoles';

interface SCViewerProps {
  publicationId: string;
  onBack: () => void;
}

export default function SCViewer({ publicationId, onBack }: SCViewerProps) {
  const { currentUser, isAdmin } = useRoles();
  const [publication, setPublication] = useState<SuperCorrectionPublication | null>(null);
  const [correcteur, setCorrecteur] = useState<SCCorrecteur | null>(null);
  const [commentaires, setCommentaires] = useState<SCCommentaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [commentType, setCommentType] = useState<SCCommentType>('TYPO');
  const [commentContent, setCommentContent] = useState('');
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    loadData();
  }, [publicationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const pub = await SuperCorrectionService.getPublication(publicationId);
      if (!pub) throw new Error('Publication non trouvée');
      setPublication(pub);

      // ✅ Utiliser le contenu de ztf_books directement (pas de fetch URL externe)
      const contentFromDb = pub.book?.content;
      
      if (contentFromDb) {
        setContent(contentFromDb);
      } else {
        // Contenu de fallback
        setContent(`
          <h2>Livre Test Super Correction</h2>
          <p>Ceci est un contenu de test pour la Super Correction.</p>
          <p>La curiosité est une force qui nous pousse à explorer, apprendre et créer.</p>
        `);
      }

      const comments = await SuperCorrectionService.getCommentaires(publicationId);
      setCommentaires(comments);

      // Trouver le correcteur actuel (seulement si on n'est pas admin)
      if (currentUser && !isAdmin()) {
        const corr = pub.correcteurs?.find(c => c.user_id === currentUser.id);
        if (corr) {
          setCorrecteur(corr);
          setReadingProgress(corr.reading_progress || 0);
          setHasValidated(corr.has_validated || false);
        }
      }
    } catch (err: any) {
      console.error('Erreur chargement:', err);
      alert('❌ Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!correcteur || !commentContent.trim()) return;
    try {
      const newComment = await SuperCorrectionService.addCommentaire(
        publicationId,
        correcteur.id,
        0,  // anchorParagraph
        0,  // anchorTextStart
        0,  // anchorTextEnd
        commentType,
        commentContent
      );
      setCommentaires([...commentaires, newComment]);
      setShowCommentModal(false);
      setCommentContent('');
      setSelectedText('');
      alert('✅ Commentaire ajouté');
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  const handleValidate = async () => {
    if (!correcteur) return;
    if (readingProgress < 0.95) {
      alert(` Vous devez lire au moins 95% du document avant de valider.\n\nProgression actuelle : ${Math.round(readingProgress * 100)}%`);
      return;
    }
    if (!confirm('Valider ce livre ? Cette action est irréversible.')) return;
    try {
      await SuperCorrectionService.validateBook(correcteur.id);
      setHasValidated(true);
      alert('✅ Livre validé avec succès !');
      loadData();
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    }
  };

  // Gestion de la sélection de texte
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const text = selection.toString().trim();
      if (!text) return;
      setSelectedText(text);
      setShowCommentModal(true);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du manuscrit...</p>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
        <p className="text-gray-500">Publication non trouvée</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">
          Retour
        </button>
      </div>
    );
  }

  const isLocked = publication.sc_status === 'LOCKED';
  const canAddComments = !isLocked && (correcteur || isAdmin());

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              Retour
            </button>
            <div>
              <h1 className="text-2xl font-bold">{publication.book?.title}</h1>
              <p className="text-sm text-purple-100">
                {publication.book?.ztf_id} • {publication.language_scope}
              </p>
            </div>
          </div>
          {correcteur && (
            <div className="text-right">
              <div className="text-sm text-purple-100">Progression lecture</div>
              <div className="text-2xl font-bold">{Math.round(readingProgress * 100)}%</div>
            </div>
          )}
        </div>
        {correcteur && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-white transition-all"
                style={{ width: `${readingProgress * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {isLocked && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 flex items-center gap-2">
            <i className="fas fa-lock"></i>
            Ce livre est verrouillé. Vous pouvez lire et consulter les commentaires, mais ne pouvez plus en ajouter.
          </p>
        </div>
      )}

      {/* Contenu du manuscrit */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <i className="fas fa-book-open text-purple-600 mr-2"></i>
            Manuscrit
          </h2>
          <div className="text-sm text-gray-500">
            {commentaires.length} commentaire{commentaires.length > 1 ? 's' : ''}
          </div>
        </div>
        <div
          className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[600px]"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      {/* Liste des commentaires */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-comments text-purple-600 mr-2"></i>
          Commentaires ({commentaires.length})
        </h2>
        {commentaires.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun commentaire pour le moment</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {commentaires.map(c => {
              const typeConfig = SC_COMMENT_TYPE_LABELS[c.type_commentaire];
              return (
                <div key={c.id} className={`p-3 rounded-lg border ${c.resolu ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${typeConfig.color}`}>
                      <i className={`fas ${typeConfig.icon} mr-1`}></i>
                      {typeConfig.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {c.correcteur?.user?.full_name || c.correcteur?.invite_email}
                    </span>
                    {c.resolu && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <i className="fas fa-check-circle"></i>
                        Résolu
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{c.contenu}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bouton de validation (seulement pour les correcteurs) */}
      {correcteur && !hasValidated && !isLocked && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <button
            onClick={handleValidate}
            disabled={readingProgress < 0.95}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            <i className="fas fa-check-circle"></i>
            Valider ce livre
          </button>
          {readingProgress < 0.95 && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Vous devez lire au moins 95% du document avant de valider
            </p>
          )}
        </div>
      )}

      {correcteur?.has_validated && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            Vous avez validé ce livre le {new Date(correcteur.validated_at || '').toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      {/* Modal ajout commentaire */}
      {showCommentModal && canAddComments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <i className="fas fa-comment-dots text-purple-600 mr-2"></i>
                Ajouter un commentaire
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Texte sélectionné :</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedText}"</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de commentaire
                </label>
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as SCCommentType)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {Object.entries(SC_COMMENT_TYPE_LABELS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Votre commentaire
                </label>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Décrivez votre commentaire..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setCommentContent('');
                    setSelectedText('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={!commentContent.trim() || isLocked}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}