// =====================================================
// COMPOSANT: BlockEditor
// Description: Rendu d'un bloc atomique individuel
// =====================================================

import React, { useState } from 'react';
import { DocumentBlock } from '../../hooks/useDocumentBlocks';
import { Collaborator } from '../../hooks/useCollabSession';

interface BlockEditorProps {
  block: DocumentBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  collaborators: Collaborator[];
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  index,
  isSelected,
  onSelect,
  collaborators,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Statut du bloc
  const statusConfig = {
    draft: { label: 'Brouillon', color: 'gray', icon: '⬜' },
    proposed: { label: 'Proposé', color: 'amber', icon: '🟠' },
    merged: { label: 'Validé', color: 'green', icon: '✅' },
    rejected: { label: 'Rejeté', color: 'red', icon: '❌' },
  };

  const status = statusConfig[block.status as keyof typeof statusConfig];

  // Trouver qui édite ce bloc
  const editorsOnBlock = collaborators.filter(
    c => c.block_id === block.id && c.is_typing
  );

  return (
    <article
      id={`block-${block.id}`}
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all duration-200 ${
        isSelected
          ? 'border-purple-500 shadow-purple-200 dark:shadow-purple-900/20'
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      } ${block.status === 'merged' ? 'ring-1 ring-green-500/20' : ''}`}
      onClick={onSelect}
    >
      {/* En-tête du bloc */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Badge de position */}
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-mono rounded">
            §{block.position + 1}
          </span>

          {/* Type de bloc */}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
            {block.type.replace('_', ' ')}
          </span>

          {/* Statut */}
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              block.status === 'merged'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : block.status === 'proposed'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                : block.status === 'rejected'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {status.icon} {status.label}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Métriques */}
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
            <span>
              <i className="fas fa-font mr-1"></i>
              {block.word_count} mots
            </span>
            <span>
              <i className="fas fa-text-height mr-1"></i>
              {block.char_count} caractères
            </span>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="fas fa-ellipsis-v text-gray-400"></i>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <i className="fas fa-edit text-purple-600"></i>
                  Modifier ce bloc
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <i className="fas fa-comment text-blue-600"></i>
                  Ajouter un commentaire
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <i className="fas fa-history text-amber-600"></i>
                  Historique
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <i className="fas fa-arrow-up text-gray-600"></i>
                  Déplacer vers le haut
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                  <i className="fas fa-arrow-down text-gray-600"></i>
                  Déplacer vers le bas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu du bloc */}
      <div className="p-4">
        {block.type.includes('heading') ? (
          <h1 className={`font-bold text-gray-900 dark:text-white ${
            block.type === 'heading1' ? 'text-3xl' :
            block.type === 'heading2' ? 'text-2xl' : 'text-xl'
          }`}>
            {/* Contenu du titre (à rendre avec TipTap) */}
            [Contenu du titre]
          </h1>
        ) : (
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
            {/* Contenu du paragraphe (à rendre avec TipTap) */}
            {block.content?.content ? (
              typeof block.content.content === 'string'
                ? block.content.content
                : '[Contenu riche]'
            ) : (
              <span className="text-gray-400 italic">Contenu du bloc...</span>
            )}
          </p>
        )}
      </div>

      {/* Indicateurs d'édition en cours */}
      {editorsOnBlock.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2">
          <div className="flex -space-x-2">
            {editorsOnBlock.map((collab) => (
              <div
                key={collab.user_id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: collab.cursor_color }}
              >
                {collab.cursor_label}
              </div>
            ))}
          </div>
          <span className="text-xs text-blue-700 dark:text-blue-300">
            {editorsOnBlock.map(c => c.full_name).join(', ')} édite ce bloc...
          </span>
        </div>
      )}

      {/* Pied du bloc */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>
            <i className="fas fa-user mr-1"></i>
            Créé par {block.created_by ? 'Utilisateur' : 'Système'}
          </span>
          {block.merged_by && (
            <span>
              <i className="fas fa-check mr-1"></i>
              Mergé par {block.merged_by}
            </span>
          )}
        </div>
        <span>
          {new Date(block.updated_at).toLocaleString('fr-FR')}
        </span>
      </div>
    </article>
  );
};

export default BlockEditor;
