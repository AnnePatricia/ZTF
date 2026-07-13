import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
// import TextStyle from '@tiptap/extension-text-style';
// import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style'; // ✅ Import nommé
import { Color } from '@tiptap/extension-color'; // ✅ Import nommé
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
    content?: string;
    onChange?: (content: string) => void;
    editable?: boolean;
    placeholder?: string;
    onSave?: (content: string) => void;
    showToolbar?: boolean;
}

export default function RichTextEditor({
    content = '',
    onChange,
    editable = true,
    placeholder = 'Commencez à écrire...',
    onSave,
    showToolbar = true,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Highlight,
            TextStyle,
            Color,
            Placeholder.configure({
                placeholder: placeholder,
            }),
        ],
        content,
        editable,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            {showToolbar && (
                <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 p-2 flex flex-wrap gap-1">
                    {/* Gras */}
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-bold"></i>
                    </button>

                    {/* Italique */}
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-italic"></i>
                    </button>

                    {/* Souligné */}
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('underline') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-underline"></i>
                    </button>

                    {/* Surlignage */}
                    <button
                        onClick={() => editor.chain().focus().toggleHighlight().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('highlight') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-highlighter"></i>
                    </button>

                    {/* Titres */}
                    <select
                        onChange={(e) => {
                            const level = parseInt(e.target.value);
                            if (level === 0) {
                                editor.chain().focus().setParagraph().run();
                            } else {
                                editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
                            }
                        }}
                        className="px-3 py-1 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    >
                        <option value="0">Paragraphe</option>
                        <option value="1">Titre 1</option>
                        <option value="2">Titre 2</option>
                        <option value="3">Titre 3</option>
                    </select>

                    {/* Listes */}
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('bulletList') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-list-ul"></i>
                    </button>

                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('orderedList') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-list-ol"></i>
                    </button>

                    {/* Citation */}
                    <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('blockquote') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-quote-left"></i>
                    </button>

                    {/* Code */}
                    <button
                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                        className={`px-3 py-1 rounded ${editor.isActive('codeBlock') ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                    >
                        <i className="fas fa-code"></i>
                    </button>

                    {/* Séparateur */}
                    <button
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        className="px-3 py-1 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    >
                        <i className="fas fa-minus"></i>
                    </button>

                    {/* Annuler / Refaire */}
                    <button
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="px-3 py-1 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                        <i className="fas fa-undo"></i>
                    </button>

                    <button
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="px-3 py-1 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                    >
                        <i className="fas fa-redo"></i>
                    </button>

                    {/* Sauvegarder */}
                    {onSave && (
                        <button
                            onClick={() => onSave(editor.getHTML())}
                            className="px-4 py-1 rounded bg-green-600 text-white ml-auto"
                        >
                            <i className="fas fa-save mr-2"></i>
                            Sauvegarder
                        </button>
                    )}
                </div>
            )}

            <EditorContent editor={editor} />
        </div>
    );
}