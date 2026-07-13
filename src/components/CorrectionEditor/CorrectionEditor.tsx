// =====================================================
// COMPOSANT: CorrectionEditor
// Description: Wrapper principal du correcteur collaboratif (plein écran)
// =====================================================

import React, { useEffect, useState } from 'react';
import { useDocumentBlocks } from '../../hooks/useDocumentBlocks';
import { useBlockProposals } from '../../hooks/useBlockProposals';
import { useBlockComments } from '../../hooks/useBlockComments';
import { useCollabSession } from '../../hooks/useCollabSession';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import CorrectionTopbar from './CorrectionTopbar';
import DynamicSummary from './DynamicSummary';
import BlocksEditor from './BlocksEditor';
import RightPanel from './RightPanel';
import OfflineBanner from './OfflineBanner';

interface CorrectionEditorProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

const CorrectionEditor: React.FC<CorrectionEditorProps> = ({
  documentId,
  documentTitle,
  onClose,
}) => {
  // Hooks
  const {
    blocks,
    loading: blocksLoading,
    error: blocksError,
  } = useDocumentBlocks(documentId);

  const {
    pendingProposals,
    getProposalCount,
  } = useBlockProposals(documentId);

  const {
    openComments,
    getCommentCount,
  } = useBlockComments(documentId);

  const {
    collaborators,
    myColor,
    joinSession,
    leaveSession,
    getOnlineCount,
  } = useCollabSession(documentId);

  const {
    isOffline,
    pendingOps,
  } = useOfflineSync(documentId);

  // État local
  const [activePanel, setActivePanel] = useState<'proposals' | 'activity' | 'offline'>('proposals');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Rejoindre la session au montage
  useEffect(() => {
    joinSession(documentId);

    return () => {
      leaveSession(documentId);
    };
  }, [documentId, joinSession, leaveSession]);

  // Calculs
  const totalBlocks = blocks.length;
  const mergedBlocks = blocks.filter(b => b.status === 'merged').length;
  const progressPercent = totalBlocks > 0 ? Math.round((mergedBlocks / totalBlocks) * 100) : 0;

  const proposalCount = getProposalCount();
  const commentCount = getCommentCount();
  const onlineCount = getOnlineCount();

  // Gestion des erreurs
  if (blocksError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Erreur de chargement
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{blocksError}</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Bannière offline */}
      {isOffline && (
        <OfflineBanner pendingOps={pendingOps} />
      )}

      {/* Topbar */}
      <CorrectionTopbar
        documentTitle={documentTitle}
        collaborators={collaborators}
        onlineCount={onlineCount}
        myColor={myColor}
        progressPercent={progressPercent}
        onClose={onClose}
      />

      {/* Layout principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panneau gauche — Sommaire */}
        <DynamicSummary
          blocks={blocks}
          loading={blocksLoading}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          progressPercent={progressPercent}
          mergedCount={mergedBlocks}
          totalCount={totalBlocks}
          proposalCount={proposalCount}
          commentCount={commentCount}
        />

        {/* Zone centrale — Éditeur de blocs */}
        <BlocksEditor
          blocks={blocks}
          loading={blocksLoading}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          documentId={documentId}
        />

        {/* Panneau droit — Propositions / Activité / Offline */}
        <RightPanel
          documentId={documentId}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          proposalCount={proposalCount}
          commentCount={commentCount}
          pendingOps={pendingOps}
          isOffline={isOffline}
        />
      </div>
    </div>
  );
};

export default CorrectionEditor;
