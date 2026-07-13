// src/components/Workflow/WorkflowManager.tsx
import { useState } from 'react';
import { useWorkflow, WORKFLOW_STEPS, WorkflowDocument } from '../../hooks/useWorkflow';

interface WorkflowManagerProps {
    onBack?: () => void;
}

export default function WorkflowManager({ onBack }: WorkflowManagerProps) {
    const {
        loading,
        error,
        moveDocument,
        addDocument,
        deleteDocument,
        getDocumentsByStep,
        // getDocumentCount,
        refresh
    } = useWorkflow();

    const [draggedDoc, setDraggedDoc] = useState<WorkflowDocument | null>(null);
    const [dragOverStep, setDragOverStep] = useState<number | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [newDocSource, setNewDocSource] = useState('');
    const [newDocStep, setNewDocStep] = useState(1);

    const handleDragStart = (doc: WorkflowDocument) => {
        setDraggedDoc(doc);
    };

    const handleDragOver = (e: React.DragEvent, stepId: number) => {
        e.preventDefault();
        setDragOverStep(stepId);
    };

    const handleDragLeave = () => {
        setDragOverStep(null);
    };

    const handleDrop = async (stepId: number) => {
        if (draggedDoc && draggedDoc.workflow_step !== stepId) {
            const result = await moveDocument(draggedDoc.id, stepId);
            if (result.success) {
                console.log(`✅ Document déplacé vers l'étape ${stepId}`);
            } else {
                alert(`❌ Erreur: ${result.error}`);
            }
        }
        setDraggedDoc(null);
        setDragOverStep(null);
    };

    const handleAddDocument = async () => {
        if (!newDocTitle.trim()) {
            alert('⚠️ Veuillez entrer un titre');
            return;
        }

        const result = await addDocument(newDocTitle, newDocSource, newDocStep);
        if (result.success) {
            alert('✅ Document ajouté avec succès');
            setNewDocTitle('');
            setNewDocSource('');
            setNewDocStep(1);
            setShowAddModal(false);
        } else {
            alert(` Erreur: ${result.error}`);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
            const result = await deleteDocument(docId);
            if (result.success) {
                alert('✅ Document supprimé');
            } else {
                alert(`❌ Erreur: ${result.error}`);
            }
        }
    };

    const getColorClasses = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
            yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
            purple: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
            indigo: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
        };
        return colors[color] || colors.blue;
    };

    const getBadgeClasses = (color: string) => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
            yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
            purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
            indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200'
        };
        return colors[color] || colors.blue;
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement du workflow...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                <p className="text-red-700 dark:text-red-300">❌ Erreur: {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {onBack && (
                <button onClick={onBack} className="mb-4...">
                    <i className="fas fa-arrow-left"></i> Retour
                </button>
            )}
            {/* En-tête */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <i className="fas fa-project-diagram"></i>
                            Gestion du Workflow
                        </h1>
                        <p className="text-purple-100 mt-2">
                            Glissez-déposez les documents entre les étapes
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={refresh}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center gap-2 text-white"
                        >
                            <i className="fas fa-sync-alt"></i>
                            Actualiser
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2 font-semibold"
                        >
                            <i className="fas fa-plus"></i>
                            Ajouter un document
                        </button>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <i className="fas fa-info-circle"></i>
                    Comment utiliser le glisser-déposer
                </h3>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-6 list-disc">
                    <li>Cliquez et maintenez pour faire glisser un document</li>
                    <li>Déplacez-le vers une autre étape du workflow</li>
                    <li>Relâchez pour déposer le document dans la nouvelle étape</li>
                    <li>Les compteurs de documents se mettront à jour automatiquement</li>
                </ul>
            </div>

            {/* Colonnes du workflow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {WORKFLOW_STEPS.map(step => {
                    const stepDocuments = getDocumentsByStep(step.id);
                    const isDragOver = dragOverStep === step.id;

                    return (
                        <div
                            key={step.id}
                            className={`rounded-xl border-2 transition-all duration-200 ${isDragOver
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-105'
                                    : getColorClasses(step.color)
                                }`}
                            onDragOver={(e) => handleDragOver(e, step.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(step.id)}
                        >
                            {/* En-tête de colonne */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-gray-400">{step.id}</span>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{step.label}</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getBadgeClasses(step.color)}`}>
                                        {stepDocuments.length} document{stepDocuments.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <i className={`fas ${step.icon}`}></i>
                                    <span>Déposer le document ici</span>
                                </div>
                            </div>

                            {/* Liste des documents */}
                            <div className="p-4 space-y-2 min-h-[200px]">
                                {stepDocuments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400">
                                        <i className="fas fa-inbox text-3xl mb-2"></i>
                                        <p className="text-xs">Aucun document</p>
                                    </div>
                                ) : (
                                    stepDocuments.map(doc => (
                                        <div
                                            key={doc.id}
                                            draggable
                                            onDragStart={() => handleDragStart(doc)}
                                            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 cursor-move hover:shadow-md transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                                                        {doc.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Source: {doc.source || 'N/A'}
                                                    </p>
                                                    {doc.assigned_to && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Assigné: {doc.assigned_to}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                    title="Supprimer"
                                                >
                                                    <i className="fas fa-trash text-red-500 text-xs"></i>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                <i className="fas fa-grip-vertical"></i>
                                                <span>Glisser pour déplacer</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Bouton ajouter */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => {
                                        setNewDocStep(step.id);
                                        setShowAddModal(true);
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-plus"></i>
                                    Ajouter document
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal ajout document */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Ajouter un document
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Titre *
                                </label>
                                <input
                                    type="text"
                                    value={newDocTitle}
                                    onChange={(e) => setNewDocTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    placeholder="Titre du document"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Source
                                </label>
                                <input
                                    type="text"
                                    value={newDocSource}
                                    onChange={(e) => setNewDocSource(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    placeholder="Source (Cassette, Notes, etc.)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Étape
                                </label>
                                <select
                                    value={newDocStep}
                                    onChange={(e) => setNewDocStep(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                >
                                    {WORKFLOW_STEPS.map(step => (
                                        <option key={step.id} value={step.id}>
                                            {step.id} - {step.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddDocument}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                            >
                                Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}