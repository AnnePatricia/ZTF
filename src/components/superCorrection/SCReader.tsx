// src/components/superCorrection/SCReader.tsx
import { useState, useEffect, useRef} from 'react';
// import { supabase } from '../../supabaseClient';
import { SuperCorrectionService } from '../../services/superCorrectionService';
import { SC_COMMENT_TYPE_LABELS } from '../../types/superCorrection';
import type { SuperCorrectionPublication, SCCorrecteur, SCCommentaire, SCCommentType } from '../../types/superCorrection';
import { useRoles } from '../../hooks/useRoles';

interface SCReaderProps {
  publicationId: string;
  onBack: () => void;
}

export default function SCReader({ publicationId, onBack }: SCReaderProps) {
  const { currentUser } = useRoles();
  const [publication, setPublication] = useState<SuperCorrectionPublication | null>(null);
  const [correcteur, setCorrecteur] = useState<SCCorrecteur | null>(null);
  const [commentaires, setCommentaires] = useState<SCCommentaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedAnchor, setSelectedAnchor] = useState({
    paragraph: 0,
    start: 0,
    end: 0
  });
  const [commentType, setCommentType] = useState<SCCommentType>('TYPO');
  const [commentContent, setCommentContent] = useState('');
  const [hasValidated, setHasValidated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Charger les données
  useEffect(() => {
    loadData();
  }, [publicationId]);

  // Setup Intersection Observer pour tracking progression
  useEffect(() => {
    if (!contentRef.current || !correcteur) return;

    const sections = contentRef.current.querySelectorAll('[data-paragraph]');
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const paragraphNum = parseInt(entry.target.getAttribute('data-paragraph') || '0');
            updateProgress(paragraphNum);
          }
        });
      },
      { threshold: 0.5 }
    );

    sections.forEach(section => {
      observerRef.current?.observe(section);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [content, correcteur]);

  // Mettre à jour la progression toutes les 30 secondes
  useEffect(() => {
    if (!correcteur || readingProgress === 0) return;

    const interval = setInterval(async () => {
      try {
        await SuperCorrectionService.updateReadingProgress(correcteur.id, readingProgress);
      } catch (err) {
        console.error('Erreur update progression:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [correcteur, readingProgress]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger la publication
      const pub = await SuperCorrectionService.getPublication(publicationId);
      if (!pub) throw new Error('Publication non trouvée');
      setPublication(pub);

      // Charger le contenu du fichier
      const response = await fetch(pub.file_url);
      const text = await response.text();
      setContent(text);

      // Charger les commentaires
      const comments = await SuperCorrectionService.getCommentaires(publicationId);
      setCommentaires(comments);

      // Trouver le correcteur actuel
      if (currentUser) {
        const corr = pub.correcteurs?.find(c => c.user_id === currentUser.id);
        if (corr) {
          setCorrecteur(corr);
          setReadingProgress(corr.reading_progress);
          setHasValidated(corr.has_validated);
        }
      }
    } catch (err: any) {
      alert('❌ Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = (currentParagraph: number) => {
    const totalParagraphs = contentRef.current?.querySelectorAll('[data-paragraph]').length || 1;
    const progress = Math.min(1.0, currentParagraph / totalParagraphs);
    setReadingProgress(progress);
  };

  // Gestion de la sélection de texte
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      
      if (!text) return;

      // Trouver le paragraphe ancre
      let node: Node | null = range.startContainer;
      let paragraphNum = 0;
      
      while (node && node !== contentRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const paraNum = (node as Element).getAttribute('data-paragraph');
          if (paraNum) {
            paragraphNum = parseInt(paraNum);
            break;
          }
        }
        node = node.parentNode;
      }

      setSelectedText(text);
      setSelectedAnchor({
        paragraph: paragraphNum,
        start: range.startOffset,
        end: range.endOffset
      });
      setShowCommentModal(true);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleAddComment = async () => {
    if (!correcteur || !commentContent.trim()) return;

    try {
      const newComment = await SuperCorrectionService.addCommentaire(
        publicationId,
        correcteur.id,
        selectedAnchor.paragraph,
        selectedAnchor.start,
        selectedAnchor.end,
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
      alert(`❌ Vous devez lire au moins 95% du document avant de valider.\n\nProgression actuelle : ${Math.round(readingProgress * 100)}%`);
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

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du manuscrit...</p>
      </div>
    );
  }

  if (!publication || !correcteur) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
        <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
        <p className="text-gray-500">Publication ou correcteur non trouvé</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">
          Retour
        </button>
      </div>
    );
  }

  const isLocked = publication.sc_status === 'LOCKED';

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
          <div className="text-right">
            <div className="text-sm text-purple-100">Progression lecture</div>
            <div className="text-2xl font-bold">{Math.round(readingProgress * 100)}%</div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white transition-all"
              style={{ width: `${readingProgress * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Statut du livre */}
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
          ref={contentRef}
          className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[600px] relative"
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
                <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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

      {/* Bouton de validation */}
      {!hasValidated && !isLocked && (
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

      {hasValidated && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 flex items-center gap-2">
            <i className="fas fa-check-circle"></i>
            Vous avez validé ce livre le {new Date(correcteur.validated_at || '').toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      {/* Modal ajout commentaire */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                <i className="fas fa-comment-dots text-purple-600 mr-2"></i>
                Ajouter un commentaire
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Texte sélectionné */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Texte sélectionné :</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedText}"</p>
              </div>

              {/* Type de commentaire */}
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

              {/* Contenu du commentaire */}
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

              {/* Actions */}
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