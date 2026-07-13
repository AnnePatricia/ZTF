// =====================================================
// COMPOSANT: DynamicSummary
// Description: Sommaire dynamique avec pastilles de statut
// =====================================================

import React from 'react';
import { DocumentBlock } from '../../hooks/useDocumentBlocks';

interface DynamicSummaryProps {
  blocks: DocumentBlock[];
  loading: boolean;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  progressPercent: number;
  mergedCount: number;
  totalCount: number;
  proposalCount: number;
  commentCount: number;
}

const DynamicSummary: React.FC<DynamicSummaryProps> = ({
  blocks,
  loading,
  selectedBlockId,
  onSelectBlock,
  progressPercent,
  mergedCount,
  totalCount,
  proposalCount,
  commentCount,
}) => {
  // Statistiques par statut
  const stats = {
    merged: blocks.filter(b => b.status === 'merged').length,
    proposed: blocks.filter(b => b.status === 'proposed').length,
    draft: blocks.filter(b => b.status === 'draft').length,
    rejected: blocks.filter(b => b.status === 'rejected').length,
  };

  // Icône par type de bloc
  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
        return 'fa-heading';
      case 'paragraph':
        return 'fa-paragraph';
      case 'image':
        return 'fa-image';
      case 'list':
      case 'list_item':
        return 'fa-list';
      case 'blockquote':
        return 'fa-quote-right';
      case 'divider':
        return 'fa-minus';
      default:
        return 'fa-file';
    }
  };

  // Badge par statut
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'merged':
        return { color: 'text-green-600 dark:text-green-400', icon: 'fa-check-circle' };
      case 'proposed':
        return { color: 'text-amber-600 dark:text-amber-400', icon: 'fa-clock' };
      case 'rejected':
        return { color: 'text-red-600 dark:text-red-400', icon: 'fa-times-circle' };
      default:
        return { color: 'text-gray-400 dark:text-gray-500', icon: 'fa-circle' };
    }
  };

  return (
    <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* En-tête */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fas fa-bookmark text-purple-600"></i>
          Sommaire
        </h2>
      </div>

      {/* Progression globale */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Progression</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {mergedCount} / {totalCount} blocs validés
        </p>

        {/* Stats par statut */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats.merged}</div>
            <div className="text-xs text-green-700 dark:text-green-300">✅</div>
          </div>
          <div className="flex-1 text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.proposed}</div>
            <div className="text-xs text-amber-700 dark:text-amber-300">🟠</div>
          </div>
          <div className="flex-1 text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{stats.draft}</div>
            <div className="text-xs text-gray-700 dark:text-gray-300">⬜</div>
          </div>
        </div>
      </div>

      {/* Liste des blocs */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-3xl text-purple-600 mb-3"></i>
            <p className="text-sm text-gray-600 dark:text-gray-400">Chargement...</p>
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <i className="fas fa-inbox text-4xl mb-3"></i>
            <p className="text-sm">Aucun bloc</p>
          </div>
        ) : (
          <div className="space-y-1">
            {blocks.map((block) => {
              const statusBadge = getStatusBadge(block.status);
              const isSelected = selectedBlockId === block.id;

              return (
                <button
                  key={block.id}
                  onClick={() => onSelectBlock(isSelected ? null : block.id)}
                  className={`w-full text-left p-2.5 rounded-lg transition-all duration-200 flex items-center gap-3 group ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
                  }`}
                >
                  {/* Icône type */}
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${
                    isSelected
                      ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    <i className={`fas ${getBlockIcon(block.type)} text-sm`}></i>
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                        §{block.position + 1}
                      </span>
                      <i className={`fas ${statusBadge.icon} text-xs ${statusBadge.color}`}></i>
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate capitalize">
                      {block.type.replace('_', ' ')}
                    </div>
                  </div>

                  {/* Indicateur de sélection */}
                  {isSelected && (
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pied */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex justify-between">
          <span>🟠 {proposalCount} propositions</span>
          <span>💬 {commentCount} commentaires</span>
        </div>
      </div>
    </aside>
  );
};

export default DynamicSummary;
