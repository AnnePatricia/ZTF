// src/types/editorialization.ts

// =====================================================
//  ENTITÉS PRINCIPALES
// =====================================================

/**
 * Tâche d'éditorialisation D4
 * Représente un manuscrit en cours d'assemblage à partir de fragments D3
 */
export interface EditorializationTask {
    id: string;
    book_id: string;
    manuscript_title?: string;
    manuscript_theme?: string;
    structure_plan: PlanItem[];
    manuscript_content?: string;
    selected_fragments: string[];
    status: EditorializationStatus;
    word_count: number;
    assigned_to?: string;
    validated_by?: string;
    started_at?: string;
    submitted_at?: string;
    validated_at?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    // Jointures
    book?: {
        id: string;
        ztf_id: string;
        title: string;
        theme?: string;
        language: string;
        content?: string;
    };
    assigned_user?: {
        id: string;
        full_name: string;
        email: string;
    };
    validated_user?: {
        id: string;
        full_name: string;
        email: string;
    };
}

/**
 * Fragment issu d'une tâche D3 validée
 * Un fragment représente un livre nettoyé prêt à être assemblé
 */
// ✅ Corrigez l'interface D4Fragment (autour de la ligne 48)
export interface D4Fragment {
    id: string;
    cleaning_task_id: string;
    book_id: string;
    content: string;
    theme?: string;
    subtheme?: string;
    start_position?: number;
    end_position?: number;
    word_count: number;
    evaluation: 'essentiel' | 'complementaire' | 'hors-sujet';
    notes?: string;
    created_at: string;
    created_by?: string;
    // ✅ Correction : rendre book optionnel et corriger les types
    book?: {
        id: string;
        ztf_id: string;
        title: string;
        theme?: string;
    };
}

/**
 * Élément du plan de structure (Partie / Chapitre / Section)
 */
export interface PlanItem {
    id: string;
    type: 'part' | 'chapter' | 'section';
    number: number;
    title: string;
    parent_id?: string;
    children?: PlanItem[];
    fragment_ids?: string[];
}

/**
 * Position d'un fragment dans le manuscrit final
 */
export interface ManuscriptFragment {
    id: string;
    editorialization_task_id: string;
    fragment_id: string;
    position_order: number;
    part_number?: number;
    chapter_number?: number;
    section_number?: number;
    chapter_title?: string;
    section_title?: string;
    inserted_at: string;
    inserted_by?: string;
    // Jointures
    fragment?: D4Fragment;
    task?: EditorializationTask;
}

/**
 * Fiche de transmission D4 → D5
 */
export interface D4Transmission {
    id: string;
    task_id: string;
    book_id: string;
    from_user: string;
    to_department: 'D5';
    structure_summary?: string;
    sources_used: string[];
    notes?: string;
    signed_at: string;
    created_at: string;
    // Jointures
    task?: {
        id: string;
        manuscript_title?: string;
    };
    book?: {
        id: string;
        ztf_id: string;
        title: string;
    };
    from_user_data?: {
        id: string;
        full_name: string;
        email: string;
    };
}

// =====================================================
// 🏷️ TYPES ENUMÉRÉS
// =====================================================

/**
 * Statuts possibles d'une tâche d'éditorialisation
 */
export type EditorializationStatus =
    | 'pending'
    | 'in_progress'
    | 'submitted'
    | 'validated'
    | 'rejected';

/**
 * Évaluation d'un fragment par l'éditorialiste
 */
export type FragmentEvaluation =
    | 'essentiel'
    | 'complementaire'
    | 'hors-sujet';

/**
 * Type d'élément dans le plan
 */
export type PlanItemType = 'part' | 'chapter' | 'section';

// =====================================================
// ⚙️ CONFIGURATIONS D'AFFICHAGE
// =====================================================

/**
 * Configuration des statuts d'éditorialisation pour l'UI
 */
export const EDITORIALIZATION_STATUS_CONFIG: Record<
    EditorializationStatus,
    {
        label: string;
        color: string;
        icon: string;
        description: string;
    }
> = {
    pending: {
        label: 'En attente',
        color: 'bg-amber-500',
        icon: 'fa-clock',
        description: 'Tâche créée, en attente de démarrage',
    },
    in_progress: {
        label: 'En cours',
        color: 'bg-blue-500',
        icon: 'fa-edit',
        description: 'Éditorialiste en train de travailler',
    },
    submitted: {
        label: 'Soumis',
        color: 'bg-orange-500',
        icon: 'fa-paper-plane',
        description: 'Soumis pour validation hiérarchique',
    },
    validated: {
        label: 'Validé',
        color: 'bg-green-500',
        icon: 'fa-check-circle',
        description: 'Validé par le Directeur éditorial',
    },
    rejected: {
        label: 'Rejeté',
        color: 'bg-red-500',
        icon: 'fa-times-circle',
        description: 'Rejeté, retour à l\'éditorialiste',
    },
};

/**
 * Configuration des évaluations de fragments
 */
export const EVALUATION_CONFIG: Record<
    FragmentEvaluation,
    {
        label: string;
        color: string;
        icon: string;
        description: string;
    }
> = {
    essentiel: {
        label: 'Essentiel',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
        icon: 'fa-star',
        description: 'Fragment indispensable au manuscrit',
    },
    complementaire: {
        label: 'Complémentaire',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
        icon: 'fa-plus-circle',
        description: 'Fragment utile mais non indispensable',
    },
    'hors-sujet': {
        label: 'Hors-sujet',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
        icon: 'fa-times-circle',
        description: 'Fragment ne correspondant pas au thème',
    },
};

/**
 * Configuration des types de plan
 */
export const PLAN_ITEM_CONFIG: Record<
    PlanItemType,
    {
        label: string;
        icon: string;
        color: string;
        maxDepth: number;
    }
> = {
    part: {
        label: 'Partie',
        icon: 'fa-layer-group',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
        maxDepth: 0,
    },
    chapter: {
        label: 'Chapitre',
        icon: 'fa-book',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
        maxDepth: 1,
    },
    section: {
        label: 'Section',
        icon: 'fa-file-alt',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        maxDepth: 2,
    },
};

// =====================================================
// 📋 CHECKLIST D4 (selon CDC)
// =====================================================

/**
 * Élément de la checklist D4
 */
export interface EditorializationChecklistItem {
    id: string;
    category: string;
    label: string;
    required: boolean;
    checked: boolean;
}

/**
 * Checklist par défaut pour D4
 */
export const DEFAULT_EDITORIALIZATION_CHECKLIST: EditorializationChecklistItem[] = [
    // Structure
    { id: 'd4-struct-1', category: 'structure', label: 'Plan hiérarchique complet (Parties/Chapitres/Sections)', required: true, checked: false },
    { id: 'd4-struct-2', category: 'structure', label: 'Chaque chapitre a un titre provisoire', required: true, checked: false },
    { id: 'd4-struct-3', category: 'structure', label: 'Progression logique des idées', required: true, checked: false },
    { id: 'd4-struct-4', category: 'structure', label: 'Longueur totale entre 200 et 500 pages', required: true, checked: false },

    // Sources
    { id: 'd4-source-1', category: 'sources', label: 'Chaque fragment référence sa source exacte', required: true, checked: false },
    { id: 'd4-source-2', category: 'sources', label: 'Liste des sources utilisée par chapitre', required: true, checked: false },
    { id: 'd4-source-3', category: 'sources', label: 'Cohérence entre les sources', required: false, checked: false },

    // Contenu
    { id: 'd4-content-1', category: 'contenu', label: 'Aucune contradiction doctrinale', required: true, checked: false },
    { id: 'd4-content-2', category: 'contenu', label: 'Style ZTF respecté', required: true, checked: false },
    { id: 'd4-content-3', category: 'contenu', label: 'Transitions fluides entre fragments', required: true, checked: false },
    { id: 'd4-content-4', category: 'contenu', label: 'Introduction et conclusion rédigées', required: true, checked: false },

    // Qualité
    { id: 'd4-quality-1', category: 'qualite', label: 'Relecture complète effectuée', required: true, checked: false },
    { id: 'd4-quality-2', category: 'qualite', label: 'Cohérence terminologique', required: false, checked: false },
    { id: 'd4-quality-3', category: 'qualite', label: 'Notes pour D5 rédigées', required: true, checked: false },
];

// =====================================================
//  STATISTIQUES
// =====================================================

/**
 * Statistiques du module D4
 */
export interface EditorializationStats {
    total: number;
    pending: number;
    inProgress: number;
    submitted: number;
    validated: number;
    rejected: number;
    availableFragments: number;
    totalWords: number;
}

// =====================================================
// 🔍 FILTRES ET RECHERCHE
// =====================================================

/**
 * Filtres pour la liste des tâches D4
 */
export interface EditorializationFilters {
    status?: EditorializationStatus | 'all';
    theme?: string;
    assignedTo?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * Filtres pour le navigateur de fragments
 */
export interface FragmentFilters {
    theme?: string;
    evaluation?: FragmentEvaluation | 'all';
    search?: string;
    minWordCount?: number;
    maxWordCount?: number;
}

// =====================================================
// 📝 VALIDATION HIÉRARCHIQUE D4
// =====================================================

/**
 * Niveaux de validation hiérarchique (CDC §5.4)
 */
export type ValidationLevel = 'editorialiste' | 'senior' | 'directeur';

/**
 * Étape de validation
 */
export interface ValidationStep {
    level: ValidationLevel;
    validator_id?: string;
    validator_name?: string;
    validated_at?: string;
    status: 'pending' | 'approved' | 'rejected';
    comments?: string;
}

/**
 * Historique de validation d'un manuscrit
 */
export interface ValidationHistory {
    task_id: string;
    steps: ValidationStep[];
    current_level: ValidationLevel;
    completed: boolean;
}

// =====================================================
//  TYPES UTILITAIRES
// =====================================================

/**
 * Résultat d'une opération
 */
export interface OperationResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Options de tri
 */
export type SortOrder = 'asc' | 'desc';
export type SortField = 'created_at' | 'updated_at' | 'word_count' | 'manuscript_title';

/**
 * Pagination
 */
export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: SortField;
    sortOrder?: SortOrder;
}

// =====================================================
// 📤 TRANSMISSION D4 → D5
// =====================================================

/**
 * Données de la fiche de transmission
 */
export interface TransmissionData {
    task_id: string;
    book_id: string;
    from_user: string;
    to_department: 'D5';
    structure_summary: string;
    sources_used: string[];
    notes: string;
    signed_at: string;
}

/**
 * Résumé de structure pour la transmission
 */
export interface StructureSummary {
    total_parts: number;
    total_chapters: number;
    total_sections: number;
    total_words: number;
    total_fragments: number;
    themes_covered: string[];
}

// =====================================================
// 🎨 STYLES ET CLASSES CSS
// =====================================================

/**
 * Classes CSS utilitaires pour les statuts
 */
export const STATUS_CLASSES: Record<EditorializationStatus, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    submitted: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    validated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

/**
 * Classes CSS pour les évaluations
 */
export const EVALUATION_CLASSES: Record<FragmentEvaluation, string> = {
    essentiel: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-300',
    complementaire: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border-blue-300',
    'hors-sujet': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-300',
};

// =====================================================
//  CONSTANTES MÉTIER
// =====================================================

/**
 * Règles métier D4 (CDC §5.4)
 */
export const D4_BUSINESS_RULES = [
    'L\'équipe travaille toujours à l\'échelle du livre complet — jamais à la page isolée',
    'Aucun manuscrit ne quitte D4 sans la signature du Directeur éditorial',
    'Chaque fragment placé doit référencer sa source exacte',
    'Sélection des fragments : essentiel / complémentaire / hors-sujet',
    'Constructeur de plan : parties / chapitres / sections avec titres provisoires',
    'Validation hiérarchique : éditorialiste → senior → Directeur éditorial',
];

/**
 * Seuils de validation
 */
export const D4_THRESHOLDS = {
    MIN_WORDS: 50000,      // ~200 pages
    MAX_WORDS: 125000,     // ~500 pages
    MIN_FRAGMENTS: 3,
    MIN_CHAPTERS: 5,
    MIN_SECTIONS_PER_CHAPTER: 2,
};

// =====================================================
// 🔄 TRANSITIONS DE STATUT AUTORISÉES
// =====================================================

/**
 * Matrice des transitions de statut autorisées
 */
export const ALLOWED_TRANSITIONS: Record<EditorializationStatus, EditorializationStatus[]> = {
    pending: ['in_progress'],
    in_progress: ['submitted', 'pending'],
    submitted: ['validated', 'rejected', 'in_progress'],
    validated: [], // État final
    rejected: ['in_progress', 'pending'],
};

/**
 * Vérifie si une transition est autorisée
 */
export function isTransitionAllowed(
    from: EditorializationStatus,
    to: EditorializationStatus
): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// =====================================================
// 🛠️ HELPERS
// =====================================================

/**
 * Génère un ID unique pour les éléments de plan
 */
export function generatePlanItemId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calcule le résumé de structure d'un plan
 */
export function calculateStructureSummary(plan: PlanItem[]): StructureSummary {
    let total_parts = 0;
    let total_chapters = 0;
    let total_sections = 0;

    const countItems = (items: PlanItem[]) => {
        items.forEach(item => {
            if (item.type === 'part') total_parts++;
            else if (item.type === 'chapter') total_chapters++;
            else if (item.type === 'section') total_sections++;
            if (item.children) countItems(item.children);
        });
    };

    countItems(plan);

    return {
        total_parts,
        total_chapters,
        total_sections,
        total_words: 0, // À calculer séparément
        total_fragments: 0, // À calculer séparément
        themes_covered: [],
    };
}

/**
 * Aplatit un plan hiérarchique en liste plate
 */
export function flattenPlan(plan: PlanItem[]): PlanItem[] {
    const result: PlanItem[] = [];
    const flatten = (items: PlanItem[]) => {
        items.forEach(item => {
            result.push(item);
            if (item.children) flatten(item.children);
        });
    };
    flatten(plan);
    return result;
}

/**
 * Trouve un élément de plan par ID
 */
export function findPlanItem(plan: PlanItem[], id: string): PlanItem | undefined {
    for (const item of plan) {
        if (item.id === id) return item;
        if (item.children) {
            const found = findPlanItem(item.children, id);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Supprime un élément de plan par ID
 */
export function removePlanItem(plan: PlanItem[], id: string): PlanItem[] {
    return plan
        .filter(item => item.id !== id)
        .map(item => ({
            ...item,
            children: item.children ? removePlanItem(item.children, id) : undefined,
        }));
}

/**
 * Met à jour un élément de plan
 */
export function updatePlanItem(
    plan: PlanItem[],
    id: string,
    updates: Partial<PlanItem>
): PlanItem[] {
    return plan.map(item => {
        if (item.id === id) {
            return { ...item, ...updates };
        }
        if (item.children) {
            return { ...item, children: updatePlanItem(item.children, id, updates) };
        }
        return item;
    });
}

// =====================================================
//  EXPORTS PAR DÉFAUT
// =====================================================

export default {
    EDITORIALIZATION_STATUS_CONFIG,
    EVALUATION_CONFIG,
    PLAN_ITEM_CONFIG,
    DEFAULT_EDITORIALIZATION_CHECKLIST,
    D4_BUSINESS_RULES,
    D4_THRESHOLDS,
    ALLOWED_TRANSITIONS,
    STATUS_CLASSES,
    EVALUATION_CLASSES,
    isTransitionAllowed,
    generatePlanItemId,
    calculateStructureSummary,
    flattenPlan,
    findPlanItem,
    removePlanItem,
    updatePlanItem,
};