// =====================================================
// EXPORT DE TOUS LES HOOKS MÉTIER
// =====================================================

// ✅ Hook: Validation des noms de fichiers
export { useFileValidation } from './useFileValidation';
export type { ValidationResponse, TranscriptionImportCheck } from './useFileValidation';

// ✅ Hook: Automatismes de workflow
export { useWorkflowAutomation } from './useWorkflowAutomation';
export type { WorkflowTransition, AutoCreateResult } from './useWorkflowAutomation';

// ✅ Hook: Lignée éditoriale
export { 
  useLineage, 
  useProofreadingLineage 
} from './useLineage';
export type {
  LineageData,
  RawFileData,
  TranscriptionData,
  BookProjectData,
  ProofreadingV1Data,
  ProofreadingV2Data,
  LinkedDocumentData,
  UseLineageReturn
} from './useLineage';

// ✅ Hook: Flux d'importation (NOUVEAU)
export { useImportWorkflow } from './useImportWorkflow';
export type { ImportWorkflowState, ImportResult } from './useImportWorkflow';

// ✅ Hook: Gestion des utilisateurs et rôles (NOUVEAU - PHASE 1)
export { useUserRoles } from './useUserRoles';
export type {
  UserRole,
  UserPermissions,
  User,
  UserWithPermissions,
  CollaboratorPermissions,
} from './useUserRoles';

// =====================================================
// PHASE 3 - HOOKS DU CORRECTEUR COLLABORATIF
// =====================================================

// ✅ Hook: Gestion des blocs atomiques
export { useDocumentBlocks } from './useDocumentBlocks';
export type {
  BlockType,
  BlockStatus,
  DocumentBlock,
  UseDocumentBlocksReturn,
} from './useDocumentBlocks';

// ✅ Hook: Gestion des propositions
export { useBlockProposals } from './useBlockProposals';
export type {
  ProposalStatus,
  BlockProposal,
  UseBlockProposalsReturn,
} from './useBlockProposals';

// ✅ Hook: Gestion des commentaires
export { useBlockComments } from './useBlockComments';
export type {
  CommentStatus,
  BlockComment,
  UseBlockCommentsReturn,
} from './useBlockComments';

// ✅ Hook: Session collaborative (présence live)
export { useCollabSession } from './useCollabSession';
export type {
  Collaborator,
  SessionState,
  UseCollabSessionReturn,
} from './useCollabSession';

// ✅ Hook: Synchronisation offline
export { useOfflineSync } from './useOfflineSync';
export type {
  UseOfflineSyncReturn,
} from './useOfflineSync';

// =====================================================
// HOOK DE CONVERSION (NOUVEAU)
// =====================================================

// ✅ Hook: Conversion de documents en blocs
export { useDocumentConverter } from './useDocumentConverter';
export type {
  ConversionResult,
  WordFormattingPolicy,
} from './useDocumentConverter';
