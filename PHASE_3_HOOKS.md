# 🎣 PHASE 3 — HOOKS REACT CRÉÉS

## ✅ RÉCAPITULATIF

| Hook | Fichier | Description |
|------|---------|-------------|
| `useUserRoles` | `useUserRoles.ts` | Gestion des utilisateurs et rôles (PHASE 1) |
| `useDocumentBlocks` | `useDocumentBlocks.ts` | Gestion des blocs atomiques |
| `useBlockProposals` | `useBlockProposals.ts` | Propositions de modification |
| `useBlockComments` | `useBlockComments.ts` | Commentaires ancrés |
| `useCollabSession` | `useCollabSession.ts` | Session collaborative (présence live) |
| `useOfflineSync` | `useOfflineSync.ts` | Synchronisation offline |

---

## 📦 1. useDocumentBlocks

**Usage :** Gérer les blocs atomiques d'un document

```typescript
import { useDocumentBlocks } from '@hooks/useDocumentBlocks';

function MonComposant() {
  const {
    blocks,
    loading,
    fetchBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    getBlockHistory,
  } = useDocumentBlocks(documentId);

  // Exemple : Créer un bloc
  await createBlock({
    type: 'paragraph',
    content: { /* ProseMirror JSON */ },
    position: 0,
  });

  // Exemple : Réordonner
  await reorderBlocks(documentId, ['id1', 'id2', 'id3']);
}
```

**Fonctions :**
- `fetchBlocks(docId)` : Charger les blocs
- `createBlock(block)` : Créer un nouveau bloc
- `updateBlock(id, updates)` : Mettre à jour un bloc
- `deleteBlock(id)` : Supprimer un bloc
- `reorderBlocks(docId, blockIds)` : Réordonner les blocs
- `getBlockHistory(blockId)` : Historique des opérations

**Realtime :** ✅ Abonnement automatique aux changements

---

## 📦 2. useBlockProposals

**Usage :** Proposer/approuver/rejeter des modifications

```typescript
import { useBlockProposals } from '@hooks/useBlockProposals';

function MonComposant() {
  const {
    proposals,
    pendingProposals,
    submitProposal,
    approveProposal,
    rejectProposal,
    getProposalCount,
  } = useBlockProposals(documentId);

  // Exemple : Soumettre une proposition
  await submitProposal({
    block_id: 'uuid',
    content_before: { /* avant */ },
    content_after: { /* après */ },
    diff_summary: 'ressemble → ressemblait',
    justification: 'Imparfait plus cohérent',
  });

  // Exemple : Approuver (redacteur_chef)
  await approveProposal(proposalId, userId, 'Approuvé');
}
```

**Fonctions :**
- `fetchProposals(docId)` : Charger les propositions
- `submitProposal(proposal)` : Soumettre une proposition
- `approveProposal(id, reviewerId, comment)` : Approuver
- `rejectProposal(id, reviewerId, comment)` : Rejeter
- `getProposalCount()` : Nombre de propositions en attente

**Realtime :** ✅ Abonnement automatique

---

## 📦 3. useBlockComments

**Usage :** Commentaires ancrés sur les blocs

```typescript
import { useBlockComments } from '@hooks/useBlockComments';

function MonComposant() {
  const {
    comments,
    openComments,
    addComment,
    replyToComment,
    resolveComment,
    deleteComment,
    getCommentCount,
  } = useBlockComments(documentId);

  // Exemple : Ajouter un commentaire
  await addComment({
    block_id: 'uuid',
    anchor_text: 'des ombres longues',
    anchor_start: 12,
    anchor_end: 30,
    content: 'Cette image est déjà utilisée au chapitre 1',
  });

  // Exemple : Répondre
  await replyToComment(parentId, "D'accord, je propose une alternative");

  // Exemple : Résoudre
  await resolveComment(commentId, userId);
}
```

**Fonctions :**
- `fetchComments(docId)` : Charger les commentaires
- `addComment(comment)` : Ajouter un commentaire
- `replyToComment(parentId, content)` : Répondre
- `resolveComment(id, resolverId)` : Résoudre
- `deleteComment(id)` : Supprimer
- `getCommentCount()` : Nombre de commentaires ouverts

**Realtime :** ✅ Abonnement automatique

---

## 📦 4. useCollabSession

**Usage :** Présence live, curseurs colorés, typing status

```typescript
import { useCollabSession } from '@hooks/useCollabSession';

function MonComposant() {
  const {
    collaborators,
    myColor,
    mySession,
    joinSession,
    leaveSession,
    updateCursorPosition,
    updateTypingStatus,
    getOnlineCount,
  } = useCollabSession(documentId);

  // Exemple : Rejoindre
  await joinSession(documentId);

  // Exemple : Mettre à jour le curseur
  await updateCursorPosition(blockId, 42);

  // Exemple : Indiquer qu'on écrit
  await updateTypingStatus(true);

  // Afficher les collaborateurs
  collaborators.forEach(c => {
    console.log(`${c.full_name} (${c.cursor_color})`);
  });
}
```

**Fonctions :**
- `joinSession(docId)` : Rejoindre la session
- `leaveSession(docId)` : Quitter
- `updateCursorPosition(blockId, pos)` : Curseur
- `updateTypingStatus(isTyping)` : En train d'écrire
- `getOnlineCount()` : Nombre de connectés

**Données retournées :**
- `collaborators` : Liste des collaborateurs en ligne
- `myColor` : Couleur de mon curseur
- `mySession` : Mon état de session

**Heartbeat :** ✅ Toutes les 30 secondes

---

## 📦 5. useOfflineSync

**Usage :** Synchronisation offline/online

```typescript
import { useOfflineSync } from '@hooks/useOfflineSync';

function MonComposant() {
  const {
    isOffline,
    pendingOps,
    queueOperation,
    syncPendingOperations,
    getPendingOperations,
  } = useOfflineSync(documentId);

  // Exemple : Ajouter une opération (si offline)
  if (isOffline) {
    await queueOperation({
      block_id: 'uuid',
      document_id: 'uuid',
      user_id: userId,
      op_type: 'insert',
      op_data: { from: 12, text: 'bonjour' },
      vector_clock: { [userId]: 3 },
    });
  }

  // Exemple : Synchroniser (quand online)
  if (!isOffline && pendingOps > 0) {
    const synced = await syncPendingOperations();
    console.log(`${synced} opérations synchronisées`);
  }
}
```

**Fonctions :**
- `queueOperation(op)` : Ajouter à la file
- `syncPendingOperations()` : Synchroniser
- `getPendingOperations()` : Voir la file
- `clearSyncedOperations()` : Vider la file

**Stockage :** IndexedDB (`bcm-gest-offline`)

---

## 🎯 EXEMPLE D'UTILISATION COMPLÈTE

```typescript
import {
  useDocumentBlocks,
  useBlockProposals,
  useBlockComments,
  useCollabSession,
  useOfflineSync,
} from '@hooks';

function CorrecteurCollaboratif({ documentId }) {
  // Blocs
  const { blocks, createBlock, updateBlock } = useDocumentBlocks(documentId);
  
  // Propositions
  const { pendingProposals, approveProposal } = useBlockProposals(documentId);
  
  // Commentaires
  const { openComments, addComment } = useBlockComments(documentId);
  
  // Session
  const { collaborators, myColor, updateCursorPosition } = useCollabSession(documentId);
  
  // Offline
  const { isOffline, pendingOps, queueOperation } = useOfflineSync(documentId);

  // Gérer la déconnexion
  if (isOffline) {
    return <OfflineBanner pending={pendingOps} />;
  }

  return (
    <div>
      {/* Affiche les collaborateurs */}
      <CollaboratorsList collaborators={collaborators} />
      
      {/* Affiche les blocs */}
      <BlocksEditor
        blocks={blocks}
        onUpdate={updateBlock}
        onCursorChange={updateCursorPosition}
      />
      
      {/* Affiche les propositions */}
      <ProposalsPanel proposals={pendingProposals} onApprove={approveProposal} />
      
      {/* Affiche les commentaires */}
      <CommentsList comments={openComments} onAdd={addComment} />
    </div>
  );
}
```

---

## 📊 TABLEAU RÉCAPITULATIF

| Hook | Realtime | Offline | Fonctions | Types exportés |
|------|----------|---------|-----------|----------------|
| `useDocumentBlocks` | ✅ | ❌ | 6 | 4 |
| `useBlockProposals` | ✅ | ❌ | 5 | 3 |
| `useBlockComments` | ✅ | ❌ | 6 | 3 |
| `useCollabSession` | ✅ | ❌ | 5 | 3 |
| `useOfflineSync` | ❌ | ✅ | 4 | 1 |

---

## 🚀 PROCHAINE ÉTAPE : PHASE 4 — COMPOSANTS UI

Maintenant que les hooks sont créés, on peut créer les composants React :

1. `CorrectionEditor.tsx` — Wrapper principal
2. `BlocksEditor.tsx` — Zone d'édition des blocs
3. `BlockEditor.tsx` — Rendu d'un bloc individuel
4. `ProposalsPanel.tsx` — Panneau des propositions
5. `CommentsPanel.tsx` — Panneau des commentaires
6. `CollaboratorsList.tsx` — Liste des collaborateurs

---

*Document créé le 8 mars 2025 — bcm-gest-react — PHASE 3 TERMINÉE*
