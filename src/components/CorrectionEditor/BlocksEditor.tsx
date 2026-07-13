// =====================================================
// COMPOSANT: BlocksEditor
// Description: Zone centrale d'édition des blocs
// =====================================================

import React, { useRef, useEffect } from 'react';
import { DocumentBlock } from '../../hooks/useDocumentBlocks';
import { useCollabSession } from '../../hooks/useCollabSession';
import BlockEditor from './BlockEditor';

interface BlocksEditorProps {
  blocks: DocumentBlock[];
  loading: boolean;
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  documentId: string;
}

const BlocksEditor: React.FC<BlocksEditorProps> = ({
  blocks,
  loading,
  selectedBlockId,
  onSelectBlock,
  documentId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { collaborators } = useCollabSession(documentId);

  // Scroll vers le bloc sélectionné
  useEffect(() => {
    if (selectedBlockId && containerRef.current) {
      const element = document.getElementById(`block-${selectedBlockId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedBlockId]);

  // Trouver les collaborateurs en train d'écrire
  const typingCollaborators = collaborators.filter(c => c.is_typing);

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-5xl text-purple-600 mb-4"></i>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Chargement des blocs...</p>
        </div>
      </main>
    );
  }

  if (blocks.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-file-alt text-4xl text-gray-400"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Aucun bloc
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ce document ne contient pas encore de blocs. Importez un document pour commencer.
          </p>
          <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
            <i className="fas fa-upload mr-2"></i>
            Importer un document
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-8 py-6">
      <div ref={containerRef} className="max-w-3xl mx-auto space-y-4">
        {/* Indicateur de collaborateurs en train d'écrire */}
        {typingCollaborators.length > 0 && (
          <div className="sticky top-0 z-10 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm mb-4">
            <div className="flex -space-x-2">
              {typingCollaborators.map((collab) => (
                <div
                  key={collab.user_id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: collab.cursor_color }}
                  title={`${collab.full_name} écrit...`}
                >
                  {collab.cursor_label}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {typingCollaborators.map(c => c.full_name).join(', ')}
              {typingCollaborators.length === 1 ? ' écrit...' : ' écrivent...'}
            </span>
          </div>
        )}

        {/* Liste des blocs */}
        {blocks.map((block, index) => (
          <BlockEditor
            key={block.id}
            block={block}
            index={index}
            isSelected={selectedBlockId === block.id}
            onSelect={() => onSelectBlock(block.id)}
            collaborators={collaborators}
          />
        ))}

        {/* Espace en bas pour le scroll */}
        <div className="h-32" />
      </div>
    </main>
  );
};

export default BlocksEditor;
