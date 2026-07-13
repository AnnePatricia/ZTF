import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { useState } from 'react';

interface TrackChangesEditorProps {
    content?: string;
    onChange?: (content: string) => void;
}

interface Change {
    id: string;
    type: 'insertion' | 'deletion';
    content: string;
    author: string;
    timestamp: Date;
}

export default function TrackChangesEditor({
    content = '',
    onChange,
}: TrackChangesEditorProps) {
    const [changes, setChanges] = useState<Change[]>([]);

    // Et ajouter une fonction pour tracker les changements
    const trackChange = (type: 'insertion' | 'deletion', content: string, author: string) => {
        setChanges(prev => [...prev, {
            id: Date.now().toString(),
            type,
            content,
            author,
            timestamp: new Date()
        }]);
    };
    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
            // Exemple d'utilisation (à adapter selon vos besoins)
            trackChange('insertion', editor.getHTML(), 'Auteur');
        },
    });

    if (!editor) return null;

    return (
        <div className="space-y-4">
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 text-sm text-yellow-800 dark:text-yellow-200">
                    <i className="fas fa-info-circle mr-2"></i>
                    Mode Track Changes activé — Toutes les modifications sont enregistrées
                </div>
                <EditorContent editor={editor} />
            </div>

            {changes.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Modifications ({changes.length})</h3>
                    <div className="space-y-2">
                        {changes.map((change) => (
                            <div
                                key={change.id}
                                className={`p-2 rounded text-sm ${change.type === 'insertion'
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 line-through'
                                    }`}
                            >
                                <strong>{change.author}</strong> — {change.content}
                                <span className="text-xs ml-2 opacity-75">
                                    {change.timestamp.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}