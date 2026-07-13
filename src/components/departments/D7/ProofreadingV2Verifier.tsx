// src/components/departments/D7/ProofreadingV2Verifier.tsx
import { useState, useEffect } from 'react';
import { useProofreadingV2 } from '../../../hooks/useProofreadingV2';
import {
    OBSERVATION_TYPE_CONFIG,
    OBSERVATION_SEVERITY_CONFIG
} from '../../../types/proofreadingV2';
import SignatureModal from './SignatureModal';
import type { ProofreadingV2Task, ProofreadingV2Observation, DigitalSignature } from '../../../types/proofreadingV2';

interface ProofreadingV2VerifierProps {
    task: ProofreadingV2Task;
    onBack: () => void;
}

export default function ProofreadingV2Verifier({ task, onBack }: ProofreadingV2VerifierProps) {
    const {
        validateBat,
        loadObservations,
        loadSignatures,
        archiveTask,
        addSignature
    } = useProofreadingV2();

    const [observations, setObservations] = useState<ProofreadingV2Observation[]>([]);
    const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
    const [validationNotes, setValidationNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archiveNotes, setArchiveNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadObservations(task.id).then(setObservations);
        loadSignatures(task.id).then(setSignatures);
    }, [task.id, loadObservations, loadSignatures]);

    const handleValidateBat = async (decision: 'approve' | 'reject' | 'request_changes') => {
        if (decision === 'reject' && !rejectReason.trim()) {
            alert('❌ Motif de rejet obligatoire');
            return;
        }

        if (!confirm(`Valider le BAT avec la décision "${decision}" ?`)) return;

        setProcessing(true);
        const success = await validateBat(task.id, decision, decision === 'reject' ? rejectReason : validationNotes);

        if (success) {
            alert(`✅ BAT ${decision === 'approve' ? 'validé' : decision === 'reject' ? 'rejeté' : 'renvoyé pour modifications'}`);
            onBack();
        }
        setProcessing(false);
    };

    const handleSignatureComplete = async (signatureData: string, signatureImageUrl?: string) => {
        const signature = await addSignature(task.id, 'bat', signatureData, signatureImageUrl);
        if (signature) {
            alert('✅ Signature BAT enregistrée');
            const updated = await loadSignatures(task.id);
            setSignatures(updated);
        }
    };

    const handleArchive = async () => {
        if (!confirm('Archiver définitivement ce document ?\n\nCette action est irréversible.')) return;

        setProcessing(true);
        const archive = await archiveTask(task.id, task.pdf_url || undefined, task.pdf_storage_path || undefined, archiveNotes || undefined);

        if (archive) {
            alert(`✅ Document archivé !\n\n📦 Numéro d'archive : ${archive.archive_number}\n📅 Date : ${new Date(archive.archive_date).toLocaleDateString('fr-FR')}\n⏱️ Rétention : ${archive.retention_years} ans`);
            onBack();
        }
        setProcessing(false);
    };

    const observationStats = {
        total: observations.length,
        unresolved: observations.filter(o => !o.resolved).length,
        bySeverity: {
            critical: observations.filter(o => o.severity === 'critical').length,
            high: observations.filter(o => o.severity === 'high').length,
            medium: observations.filter(o => o.severity === 'medium').length,
            low: observations.filter(o => o.severity === 'low').length,
        }
    };

    return (
        <div className="space-y-4">
            {/* En-tête */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                <div className="flex items-center justify-between">
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
                                <i className="fas fa-file-signature text-indigo-600"></i>
                                Validation BAT — {task.book?.title}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {task.book?.ztf_id} • {task.word_count.toLocaleString('fr-FR')} mots • {task.page_count} pages
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerte BAT */}
            <div className="bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-amber-900/20 dark:to-indigo-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2">
                    <i className="fas fa-file-signature text-2xl"></i>
                    Bon à Tirer (BAT)
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                    En validant ce BAT, vous certifiez que le document est prêt pour l'impression finale.
                    {task.bat_notes && <span className="block mt-2 font-semibold">Notes du relecteur : {task.bat_notes}</span>}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                    <p className="text-xs text-gray-500">Mots</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{task.word_count.toLocaleString('fr-FR')}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                    <p className="text-xs text-gray-500">Pages</p>
                    <p className="text-2xl font-bold text-indigo-600">{task.page_count}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                    <p className="text-xs text-gray-500">Observations</p>
                    <p className="text-2xl font-bold text-red-600">{observationStats.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                    <p className="text-xs text-gray-500">Non résolues</p>
                    <p className="text-2xl font-bold text-amber-600">{observationStats.unresolved}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                    <p className="text-xs text-gray-500">Signatures</p>
                    <p className="text-2xl font-bold text-purple-600">{signatures.length}</p>
                </div>
            </div>

            {/* PDF Preview */}
            {task.pdf_url && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-file-pdf text-red-600"></i>
                        Maquette PDF
                    </h3>
                    <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                        <iframe src={task.pdf_url} className="w-full h-full" title="Maquette PDF" />
                    </div>
                </div>
            )}

            {/* Observations */}
            {observations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-list-check text-indigo-600"></i>
                        Observations ({observationStats.unresolved} non résolues)
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {observations.map(observation => {
                            const typeConfig = OBSERVATION_TYPE_CONFIG[observation.observation_type];
                            const severityConfig = OBSERVATION_SEVERITY_CONFIG[observation.severity];
                            return (
                                <div key={observation.id} className={`border rounded-lg p-3 ${observation.resolved ? 'bg-gray-50 dark:bg-gray-700/30 opacity-60' : typeConfig.bgColor}`}>
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
                                        {observation.resolved && (
                                            <span className="text-xs text-green-600"><i className="fas fa-check-circle"></i> Résolu</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{observation.description}</p>
                                    <p className="text-xs text-gray-500 mt-2">{observation.user?.full_name} • {new Date(observation.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Signatures existantes */}
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

            {/* Notes de validation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Décision BAT</h3>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes de validation
                    </label>
                    <textarea
                        value={validationNotes}
                        onChange={(e) => setValidationNotes(e.target.value)}
                        placeholder="Commentaires sur la validation..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        rows={3}
                    />
                </div>

                {!showRejectForm ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button
                                onClick={() => handleValidateBat('approve')}
                                disabled={processing}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-check-circle"></i>
                                Approuver le BAT
                            </button>
                            <button
                                onClick={() => handleValidateBat('request_changes')}
                                disabled={processing}
                                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-edit"></i>
                                Demander des modifications
                            </button>
                            <button
                                onClick={() => setShowRejectForm(true)}
                                disabled={processing}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-times-circle"></i>
                                Rejeter
                            </button>
                        </div>

                        {task.status === 'bat_validated' && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                <button
                                    onClick={() => setShowSignatureModal(true)}
                                    className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-signature"></i>
                                    Ajouter une signature
                                </button>
                            </div>
                        )}

                        {task.status === 'bat_validated' && signatures.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                <button
                                    onClick={() => setShowArchiveModal(true)}
                                    className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-archive"></i>
                                    Archiver le document
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Motif du rejet *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                rows={4}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRejectForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Annuler</button>
                            <button
                                onClick={() => handleValidateBat('reject')}
                                disabled={processing || !rejectReason.trim()}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
                            >
                                Confirmer le rejet
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Signature */}
            {showSignatureModal && (
                <SignatureModal
                    task={task}
                    onClose={() => setShowSignatureModal(false)}
                    onSignatureComplete={handleSignatureComplete}
                />
            )}

            {/* Modal Archivage */}
            {showArchiveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <i className="fas fa-archive text-indigo-600"></i>
                                Archivage final
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    L'archivage générera un numéro unique et verrouillera définitivement le document.
                                    Rétention : 10 ans.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Notes d'archivage (optionnel)
                                </label>
                                <textarea
                                    value={archiveNotes}
                                    onChange={(e) => setArchiveNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setShowArchiveModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleArchive}
                                disabled={processing}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center gap-2"
                            >
                                <i className="fas fa-archive"></i>
                                {processing ? 'Archivage...' : 'Confirmer l\'archivage'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}