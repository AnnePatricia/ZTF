// =====================================================
// COMPOSANT: RightPanel
// Description: Panneau droit (Propositions / Activité / Offline)
// =====================================================

import React, { useState } from 'react';

interface RightPanelProps {
  documentId: string;
  activePanel: 'proposals' | 'activity' | 'offline';
  onPanelChange: (panel: 'proposals' | 'activity' | 'offline') => void;
  proposalCount: number;
  commentCount: number;
  pendingOps: number;
  isOffline: boolean;
}

const RightPanel: React.FC<RightPanelProps> = ({
  documentId,
  activePanel,
  onPanelChange,
  proposalCount,
  commentCount,
  pendingOps,
  isOffline,
}) => {
  return (
    <aside className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Onglets */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => onPanelChange('proposals')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activePanel === 'proposals'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fas fa-clipboard-check mr-2"></i>
            Propositions
            {proposalCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded-full">
                {proposalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onPanelChange('activity')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activePanel === 'activity'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fas fa-bolt mr-2"></i>
            Activité
          </button>

          <button
            onClick={() => onPanelChange('offline')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activePanel === 'offline'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fas fa-wifi mr-2"></i>
            Offline
            {pendingOps > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded-full">
                {pendingOps}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-y-auto">
        {activePanel === 'proposals' && (
          <ProposalsTab documentId={documentId} count={proposalCount} />
        )}

        {activePanel === 'activity' && (
          <ActivityTab documentId={documentId} />
        )}

        {activePanel === 'offline' && (
          <OfflineTab pendingOps={pendingOps} isOffline={isOffline} />
        )}
      </div>
    </aside>
  );
};

// =====================================================
// ONGLET: Propositions
// =====================================================

const ProposalsTab: React.FC<{ documentId: string; count: number }> = ({
  documentId,
  count,
}) => {
  // TODO: Charger les propositions avec useBlockProposals
  return (
    <div className="p-4">
      {count === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-check text-3xl text-green-600 dark:text-green-400"></i>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Aucune proposition en attente
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tout est à jour !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {count} proposition{count > 1 ? 's' : ''} en attente d'approbation
          </p>

          {/* Exemple de proposition (à remplacer par les vraies données) */}
          {[1, 2, 3].slice(0, count).map((i) => (
            <div
              key={i}
              className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white">
                  KF
                </div>
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Kouam F.
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-300 ml-auto">
                  il y a {i * 10} min
                </span>
              </div>

              <div className="text-xs text-amber-800 dark:text-amber-300 mb-2">
                <span className="line-through opacity-50">ressemble</span>
                {' → '}
                <span className="font-medium">ressemblait</span>
              </div>

              <p className="text-xs text-amber-700 dark:text-amber-400 italic mb-3">
                "L'imparfait est plus cohérent avec le ton narratif"
              </p>

              <div className="flex gap-2">
                <button className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors">
                  <i className="fas fa-check mr-1"></i>
                  Approuver
                </button>
                <button className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors">
                  <i className="fas fa-times mr-1"></i>
                  Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================
// ONGLET: Activité
// =====================================================

const ActivityTab: React.FC<{ documentId: string }> = ({ documentId }) => {
  // TODO: Charger l'activité avec un hook dédié
  const activities = [
    { type: 'edit', user: 'Aminata K.', block: '§p03', time: '2s', icon: 'fa-pen' },
    { type: 'propose', user: 'Kouam F.', block: '§p02', time: '8m', icon: 'fa-clipboard-check' },
    { type: 'comment', user: 'Doriane R.', block: '§p05', time: '12m', icon: 'fa-comment' },
    { type: 'merge', user: 'Aminata K.', block: '§p01', time: '1h', icon: 'fa-check-circle' },
  ];

  return (
    <div className="p-4">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <i className="fas fa-bolt text-purple-600"></i>
        Activité en temps réel
      </h3>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <i className={`fas ${activity.icon} text-sm text-gray-600 dark:text-gray-400`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-medium">{activity.user}</span>
                {' a '}
                {activity.type === 'edit' && 'édité'}
                {activity.type === 'propose' && 'proposé sur'}
                {activity.type === 'comment' && 'commenté'}
                {activity.type === 'merge' && 'validé'}
                {' '}
                <span className="font-mono text-purple-600 dark:text-purple-400">{activity.block}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================================
// ONGLET: Offline
// =====================================================

const OfflineTab: React.FC<{ pendingOps: number; isOffline: boolean }> = ({
  pendingOps,
  isOffline,
}) => {
  return (
    <div className="p-4">
      {/* État de connexion */}
      <div className={`p-4 rounded-lg mb-4 ${
        isOffline
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isOffline ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`} />
          <div>
            <p className={`text-sm font-bold ${
              isOffline ? 'text-red-900 dark:text-red-200' : 'text-green-900 dark:text-green-200'
            }`}>
              {isOffline ? '🔴 Hors ligne' : '🟢 En ligne'}
            </p>
            <p className={`text-xs ${
              isOffline ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'
            }`}>
              {isOffline
                ? 'Mode local activé'
                : 'WebSocket actif'}
            </p>
          </div>
        </div>
      </div>

      {/* Opérations en attente */}
      {pendingOps > 0 ? (
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
            Opérations en attente : {pendingOps}
          </h4>

          <div className="space-y-2">
            {[1, 2, 3].slice(0, pendingOps).map((i) => (
              <div
                key={i}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-2">
                  <i className="fas fa-clock text-amber-500"></i>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Modification §p0{i}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    14:3{i}:00
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            <i className="fas fa-info-circle mr-1"></i>
            Synchronisation automatique à la reconnexion
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-cloud-upload-alt text-3xl text-green-600 dark:text-green-400"></i>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Tout est synchronisé
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Aucune opération en attente
          </p>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
