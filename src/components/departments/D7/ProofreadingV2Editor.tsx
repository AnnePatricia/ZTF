// src/components/departments/D7/ProofreadingV2Editor.tsx
import { useState, useEffect, useRef } from 'react';
import { useProofreadingV2 } from '../../../hooks/useProofreadingV2';
import { supabase } from '../../../supabaseClient';
import {
    OBSERVATION_TYPE_CONFIG,
    OBSERVATION_SEVERITY_CONFIG
} from '../../../types/proofreadingV2';
import SignatureModal from './SignatureModal';
import type {
    ProofreadingV2Task,
    ProofreadingV2Observation,
    ObservationType,
    ObservationSeverity,
    DigitalSignature
} from '../../../types/proofreadingV2';

interface ProofreadingV2EditorProps {
    task: ProofreadingV2Task;
    onBack: () => void;
}

export default function ProofreadingV2Editor({ task, onBack }: ProofreadingV2EditorProps) {
    const {
        addObservation,
        resolveObservation,
        loadObservations,
        submitForBat,
        addSignature,
        loadSignatures
    } = useProofreadingV2();

    const [observations, setObservations] = useState<ProofreadingV2Observation[]>([]);
    const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
    const [showObservationForm, setShowObservationForm] = useState(false);
    const [observationType, setObservationType] = useState<ObservationType>('typo');
    const [observationSeverity, setObservationSeverity] = useState<ObservationSeverity>('medium');
    const [observationDescription, setObservationDescription] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [notes, setNotes] = useState(task.notes || '');
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [filterType, setFilterType] = useState<ObservationType | 'all'>('all');
    const [filterResolved, setFilterResolved] = useState<'all' | 'resolved' | 'unresolved'>('unresolved');
    const [pdfUrl, setPdfUrl] = useState<string | null>(task.pdf_url);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadObservations(task.id).then(setObservations);
        loadSignatures(task.id).then(setSignatures);
    }, [task.id, loadObservations, loadSignatures]);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert(' Seuls les fichiers PDF sont acceptés');
            return;
        }

        setSaving(true);
        try {
            const filePath = `d7_pdfs/${task.id}/${file.name}`;
            const { error } = await supabase.storage
                .from('document-files')
                .upload(filePath, file);

            if (error) throw error;

            const { data: urlData } = await supabase.storage
                .from('document-files')
                .getPublicUrl(filePath);

            await supabase
                .from('proofreading_v2_tasks')
                .update({
                    pdf_url: urlData.publicUrl,
                    pdf_storage_path: filePath
                })
                .eq('id', task.id);

            setPdfUrl(urlData.publicUrl);
            alert('✅ PDF uploadé avec succès');
        } catch (err: any) {
            alert('❌ Erreur: ' + err.message);
        }
        setSaving(false);
    };

    const handleAddObservation = async () => {
        if (!observationDescription.trim()) {
            alert('❌ La description est obligatoire');
            return;
        }

        const success = await addObservation(
            task.id,
            observationType,
            observationSeverity,
            observationDescription,
            pageNumber
        );

        if (success) {
            alert('✅ Observation ajoutée');
            setObservationDescription('');
            setShowObservationForm(false);
            const updated = await loadObservations(task.id);
            setObservations(updated);
        }
    };

    const handleResolveObservation = async (observationId: string) => {
        const notes = prompt('Notes de résolution (optionnel) :');
        const success = await resolveObservation(observationId, notes || undefined);
        if (success) {
            const updated = await loadObservations(task.id);
            setObservations(updated);
        }
    };

    const handleSubmitForBat = async () => {
        if (!confirm('Soumettre le document pour validation du BAT ?\n\nLe document sera verrouillé après validation.')) return;

        setSubmitting(true);
        const success = await submitForBat(task.id, notes);

        if (success) {
            alert('✅ Document soumis pour validation du BAT');
            onBack();
        }
        setSubmitting(false);
    };

    const handleSignatureComplete = async (signatureData: string, signatureImageUrl?: string) => {
        const signature = await addSignature(task.id, 'final', signatureData, signatureImageUrl);
        if (signature) {
            alert('✅ Signature enregistrée');
            const updated = await loadSignatures(task.id);
            setSignatures(updated);
        }
    };

    const filteredObservations = observations.filter(o => {
        if (filterType !== 'all' && o.observation_type !== filterType) return false;
        if (filterResolved === 'resolved' && !o.resolved) return false;
        if (filterResolved === 'unresolved' && o.resolved) return false;
        return true;
    });

    const observationStats = {
        total: observations.length,
        unresolved: observations.filter(o => !o.resolved).length,
        byType: {
            typo: observations.filter(o => o.observation_type === 'typo').length,
            grammar: observations.filter(o => o.observation_type === 'grammar').length,
            layout: observations.filter(o => o.observation_type === 'layout').length,
            image: observations.filter(o => o.observation_type === 'image').length,
            formatting: observations.filter(o => o.observation_type === 'formatting').length,
            content: observations.filter(o => o.observation_type === 'content').length,
            metadata: observations.filter(o => o.observation_type === 'metadata').length,
        },
        bySeverity: {
            low: observations.filter(o => o.severity === 'low').length,
            medium: observations.filter(o => o.severity === 'medium').length,
            high: observations.filter(o => o.severity === 'high').length,
            critical: observations.filter(o => o.severity === 'critical').length,
        }
    };

    return (
        <div className="space-y-4">
            {/* En-tête */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2"
                        >
                            <i className="fas fa-arrow-left"></i>
                            Retour
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {task.book?.title}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {task.book?.ztf_id} • Relecture 2 • {task.word_count.toLocaleString('fr-FR')} mots • {task.page_count} pages
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            onChange={handlePdfUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-2"
                        >
                            <i className="fas fa-file-pdf"></i>
                            {pdfUrl ? 'Remplacer PDF' : 'Uploader PDF'}
                        </button>
                        {saving && <span className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin"></i></span>}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{observationStats.total}</p>
                    <p className="text-xs text-gray-500">Total observations</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{observationStats.unresolved}</p>
                    <p className="text-xs text-gray-500">Non résolues</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{observationStats.bySeverity.critical + observationStats.bySeverity.high}</p>
                    <p className="text-xs text-gray-500">Hautes/Critiques</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{signatures.length}</p>
                    <p className="text-xs text-gray-500">Signatures</p>
                </div>
            </div>

            {/* Visualisation PDF */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-file-pdf text-red-600"></i>
                    Maquette PDF
                </h3>

                {pdfUrl ? (
                    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full"
                            title="Maquette PDF"
                        />
                    </div>
                ) : (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-12 text-center">
                        <i className="fas fa-file-pdf text-6xl text-gray-400 mb-4"></i>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Aucun PDF uploadé</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            <i className="fas fa-upload mr-2"></i>
                            Uploader la maquette PDF
                        </button>
                    </div>
                )}
            </div>

            {/* Formulaire d'observation */}
            {showObservationForm && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-comment-dots text-indigo-600"></i>
                        Nouvelle observation
                    </h3>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                                <select
                                    value={observationType}
                                    onChange={(e) => setObservationType(e.target.value as ObservationType)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                >
                                    {Object.entries(OBSERVATION_TYPE_CONFIG).map(([type, config]) => (
                                        <option key={type} value={type}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sévérité</label>
                                <select
                                    value={observationSeverity}
                                    onChange={(e) => setObservationSeverity(e.target.value as ObservationSeverity)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                >
                                    {Object.entries(OBSERVATION_SEVERITY_CONFIG).map(([sev, config]) => (
                                        <option key={sev} value={sev}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Page</label>
                                <input
                                    type="number"
                                    value={pageNumber}
                                    onChange={(e) => setPageNumber(parseInt(e.target.value))}
                                    min="1"
                                    max={task.page_count}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                            <textarea
                                value={observationDescription}
                                onChange={(e) => setObservationDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                rows={3}
                                placeholder="Description détaillée de l'observation..."
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleAddObservation}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
                            >
                                <i className="fas fa-check"></i>
                                Ajouter
                            </button>
                            <button
                                onClick={() => {
                                    setShowObservationForm(false);
                                    setObservationDescription('');
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Liste des observations */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fas fa-list-check text-indigo-600"></i>
                        Observations ({observationStats.unresolved} non résolues)
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowObservationForm(true)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm flex items-center gap-1"
                        >
                            <i className="fas fa-plus"></i>
                            Ajouter
                        </button>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        >
                            <option value="all">Tous les types</option>
                            {Object.entries(OBSERVATION_TYPE_CONFIG).map(([type, config]) => (
                                <option key={type} value={type}>{config.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterResolved}
                            onChange={(e) => setFilterResolved(e.target.value as any)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        >
                            <option value="unresolved">Non résolues</option>
                            <option value="resolved">Résolues</option>
                            <option value="all">Toutes</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredObservations.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Aucune observation</p>
                    ) : (
                        filteredObservations.map(observation => {
                            const typeConfig = OBSERVATION_TYPE_CONFIG[observation.observation_type];
                            const severityConfig = OBSERVATION_SEVERITY_CONFIG[observation.severity];
                            return (
                                <div
                                    key={observation.id}
                                    className={`border rounded-lg p-3 ${observation.resolved ? 'opacity-60 bg-gray-50 dark:bg-gray-700/30' : `${typeConfig.bgColor} border-current`}`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-semibold ${typeConfig.color} flex items-center gap-1`}>
                                                <i className={`fas ${typeConfig.icon}`}></i>
                                                {typeConfig.label}
                                            </span>
                                            <span className={`text-xs ${severityConfig.color} flex items-center gap-1`}>
                                                <i className={`fas ${severityConfig.icon}`}></i>
                                                {severityConfig.label}
                                            </span>
                                            {observation.page_number && (
                                                <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                                    Page {observation.page_number}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(observation.created_at).toLocaleDateString('fr-FR')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{observation.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">{observation.user?.full_name}</span>
                                        {!observation.resolved && (
                                            <button
                                                onClick={() => handleResolveObservation(observation.id)}
                                                className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                                            >
                                                <i className="fas fa-check mr-1"></i>Résoudre
                                            </button>
                                        )}
                                        {observation.resolved && (
                                            <span className="text-xs text-green-600 flex items-center gap-1">
                                                <i className="fas fa-check-circle"></i>
                                                Résolu
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Signatures */}
            {signatures.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-signature text-purple-600"></i>
                        Signatures ({signatures.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {signatures.map(sig => (
                            <div key={sig.id} className="border border-purple-200 dark:border-purple-800 rounded-lg p-3 bg-purple-50 dark:bg-purple-900/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                                        {sig.user?.full_name}
                                    </span>
                                    <span className="text-xs text-purple-600 dark:text-purple-400">
                                        {new Date(sig.signed_at).toLocaleString('fr-FR')}
                                    </span>
                                </div>
                                {sig.signature_image_url && (
                                    <img
                                        src={sig.signature_image_url}
                                        alt="Signature"
                                        className="max-h-20 border border-gray-200 dark:border-gray-700 rounded bg-white"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions finales */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fas fa-paper-plane text-indigo-600"></i>
                    Soumission pour BAT
                </h3>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes pour le validateur BAT
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Points d'attention, résumé des corrections..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        rows={3}
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowSignatureModal(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                    >
                        <i className="fas fa-signature"></i>
                        Signer
                    </button>
                    <button
                        onClick={handleSubmitForBat}
                        disabled={submitting || observationStats.unresolved > 0}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
                    >
                        <i className="fas fa-file-signature"></i>
                        {submitting ? 'Soumission...' : 'Soumettre pour BAT'}
                    </button>
                </div>
            </div>

            {/* Modal Signature */}
            {showSignatureModal && (
                <SignatureModal
                    task={task}
                    onClose={() => setShowSignatureModal(false)}
                    onSignatureComplete={handleSignatureComplete}
                />
            )}
        </div>
    );
}