// src/components/superCorrection/SCDashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { SuperCorrectionService } from '../../services/superCorrectionService';
import { SC_STATUS_LABELS } from '../../types/superCorrection';
import type { SuperCorrectionPublication, SCStatus } from '../../types/superCorrection';
import { useRoles } from '../../hooks/useRoles';
import SCViewer from './SCViewer';

export default function SCDashboard() {
    const { isAdmin, currentUser } = useRoles();
    const [publications, setPublications] = useState<SuperCorrectionPublication[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [viewingPublicationId, setViewingPublicationId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pubs, statsData] = await Promise.all([
                SuperCorrectionService.getPublications(),
                SuperCorrectionService.getStats(),
            ]);
            setPublications(pubs);
            setStats(statsData);
        } catch (err) {
            console.error('Erreur chargement SC:', err);
        } finally {
            setLoading(false);
        }
    };

    // ✅ CORRECTION: Conversion ztf_id → UUID avant publication

    // ✅ CORRECTION: handlePublish avec conversion ztf_id → UUID
    const handlePublish = async (bookId: string, threshold: number, language: 'EN' | 'FR' | 'BOTH', fileUrl?: string) => {
        try {
            // 1. Trouver l'UUID du livre
            const { data: book, error: bookError } = await supabase
                .from('ztf_books')
                .select('id')
                .eq('ztf_id', bookId)
                .single();

            if (bookError || !book) {
                alert(' Livre non trouvé: ' + bookId);
                return;
            }

            // 2. Publier avec fileUrl optionnel
            await SuperCorrectionService.publishBook(
                book.id,
                threshold,
                language,
                fileUrl || '',  // ✅ Passer chaîne vide si undefined
                currentUser?.id || ''
            );

            alert('✅ Livre publié');
            setShowPublishModal(false);
            loadData();
        } catch (err: any) {
            alert('❌ Erreur: ' + err.message);
        }
    };

    const handleStatusChange = async (pubId: string, newStatus: SCStatus) => {
        let unlockReason: string | undefined;
        if (newStatus === 'OPEN') {
            unlockReason = prompt('Motif de déverrouillage (obligatoire, min. 20 caractères) :') ?? undefined;
            if (!unlockReason || unlockReason.length < 20) {
                alert('❌ Motif obligatoire (min. 20 caractères)');
                return;
            }
        }
        if (!confirm(`Changer le statut à ${SC_STATUS_LABELS[newStatus].label} ?`)) return;
        try {
            await SuperCorrectionService.updateStatus(pubId, newStatus, currentUser?.id || '', unlockReason);
            alert('✅ Statut mis à jour');
            loadData();
        } catch (err: any) {
            alert('❌ Erreur: ' + err.message);
        }
    };

    if (viewingPublicationId) {
        return <SCViewer publicationId={viewingPublicationId} onBack={() => setViewingPublicationId(null)} />;
    }

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Chargement Super Correction...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <i className="fas fa-users-cog"></i>
                            Super Correction
                        </h1>
                        <p className="text-purple-100 mt-2">
                            Plateforme de validation communautaire mondiale
                        </p>
                    </div>
                    {isAdmin() && (
                        <button
                            onClick={() => setShowPublishModal(true)}
                            className="bg-white text-purple-600 hover:bg-purple-50 rounded-lg px-4 py-3 font-semibold flex items-center gap-2"
                        >
                            <i className="fas fa-plus"></i>
                            Publier un livre
                        </button>
                    )}
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold">{stats.open}</p>
                            <p className="text-xs text-purple-100">Ouverts</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-red-300">{stats.locked}</p>
                            <p className="text-xs text-purple-100">Verrouillés</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-gray-300">{stats.closed}</p>
                            <p className="text-xs text-purple-100">Fermés</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold">{stats.totalCommentaires}</p>
                            <p className="text-xs text-purple-100">Commentaires</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-amber-300">{stats.unresolvedCommentaires}</p>
                            <p className="text-xs text-purple-100">Non résolus</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Liste des publications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        <i className="fas fa-book-open text-purple-600 mr-2"></i>
                        Livres en Super Correction
                    </h2>
                </div>
                {publications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <i className="fas fa-inbox text-5xl mb-4 block opacity-50"></i>
                        Aucun livre publié en Super Correction
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {publications.map(pub => {
                            const statusConfig = SC_STATUS_LABELS[pub.sc_status];
                            const progress = pub.validation_threshold > 0
                                ? (pub.validation_count / pub.validation_threshold) * 100
                                : 0;

                            return (
                                <div key={pub.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {pub.book?.title || 'Livre inconnu'}
                                                </h3>
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                                                    <i className={`fas ${statusConfig.icon} mr-1`}></i>
                                                    {statusConfig.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {pub.book?.ztf_id} • {pub.book?.theme} • {pub.language_scope}
                                                • Publié le {new Date(pub.published_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {pub.validation_count} / {pub.validation_threshold}
                                            </div>
                                            <div className="text-xs text-gray-500">validations</div>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${pub.sc_status === 'LOCKED' ? 'bg-red-500' : 'bg-purple-500'}`}
                                                style={{ width: `${Math.min(100, progress)}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>{pub.correcteurs?.length || 0} correcteurs assignés</span>
                                            <span>{Math.round(progress)}% du seuil</span>
                                        </div>
                                    </div>

                                    {isAdmin() && (
                                        <div className="flex gap-2 mt-4 flex-wrap">
                                            <button
                                                onClick={() => setViewingPublicationId(pub.id)}
                                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm flex items-center gap-1"
                                            >
                                                <i className="fas fa-eye"></i>
                                                Détails
                                            </button>
                                            {pub.sc_status === 'OPEN' && (
                                                <button
                                                    onClick={() => handleStatusChange(pub.id, 'CLOSED')}
                                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm flex items-center gap-1"
                                                >
                                                    <i className="fas fa-times"></i>
                                                    Fermer
                                                </button>
                                            )}
                                            {pub.sc_status === 'LOCKED' && (
                                                <button
                                                    onClick={() => handleStatusChange(pub.id, 'OPEN')}
                                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm flex items-center gap-1"
                                                >
                                                    <i className="fas fa-unlock"></i>
                                                    Déverrouiller
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showPublishModal && (
                <PublishModal
                    onClose={() => setShowPublishModal(false)}
                    onPublish={handlePublish}
                />
            )}
        </div>
    );
}

// =====================================================
// Modal de publication (VERSION FINALE - URL optionnelle)
// =====================================================
function PublishModal({ onClose, onPublish }: {
    onClose: () => void;
    onPublish: (bookId: string, threshold: number, language: 'EN' | 'FR' | 'BOTH', fileUrl?: string) => void
}) {
    const [bookId, setBookId] = useState('');
    const [threshold, setThreshold] = useState(3);
    const [language, setLanguage] = useState<'EN' | 'FR' | 'BOTH'>('BOTH');
    const [fileUrl, setFileUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // ✅ Validation: seulement bookId est requis
        if (!bookId) {
            alert('❌ ID du livre requis');
            return;
        }

        // ✅ Passer fileUrl (peut être vide)
        onPublish(bookId, threshold, language, fileUrl || undefined);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        <i className="fas fa-plus-circle text-purple-600 mr-2"></i>
                        Publier un livre en Super Correction
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ID ZTF du livre *
                        </label>
                        <input
                            type="text"
                            value={bookId}
                            onChange={(e) => setBookId(e.target.value)}
                            placeholder="TRANS-2026-00001"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            required  // ✅ Obligatoire
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            URL du fichier (Supabase Storage) - Optionnel
                        </label>
                        <input
                            type="text"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="https://... (laissez vide si contenu dans BDD)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        // ✅ CORRECTION: PAS d'attribut "required" ici !
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Si vide, le contenu sera pris depuis ztf_books.content
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Seuil de validation
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={threshold}
                            onChange={(e) => setThreshold(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Langue de correction
                        </label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                            <option value="EN">Anglais uniquement</option>
                            <option value="FR">Français uniquement</option>
                            <option value="BOTH">Les deux langues</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                        >
                            Publier
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}