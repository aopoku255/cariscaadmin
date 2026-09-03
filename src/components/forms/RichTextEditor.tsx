'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import styles from './rich-text-editor.module.css';

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Events saved before this editor existed have a plain-text `description`
 * — often with blank-line-separated paragraphs, the convention the old
 * plain textarea's hint asked for. Handed straight to TipTap, a raw
 * newline means nothing (HTML doesn't render it), so the paragraph breaks
 * an admin already wrote would silently collapse into one run-on block the
 * moment they reopened the event to edit it. Anything that already looks
 * like HTML (saved through this editor) is left untouched.
 */
function toEditorContent(value: string): string {
  if (!value) return value;
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * A basic WYSIWYG editor for an event's full description — bold, italic,
 * headings, lists, a quote, a link. Nothing beyond that is offered, because
 * nothing beyond that survives the server: `sanitizeRichText`
 * (carisca-api/src/lib/rich-text.js) allow-lists exactly this tag set, so a
 * button for anything wider (strike, underline, inline code, tables) would
 * format something that silently vanishes the moment it's saved.
 *
 * TipTap owns its own DOM once mounted — `EditorContent` isn't a controlled
 * input — so the value a plain `<form>` actually submits is the hidden
 * input below, kept in sync from `onUpdate`.
 */
export function RichTextEditor({
  name, defaultValue = '', label, hint, error,
}: {
  name: string;
  defaultValue?: string;
  label?: string;
  hint?: string;
  error?: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    // Renders empty on the server and fills in on the client instead of
    // matching server-rendered TipTap output byte for byte — the
    // Next.js-recommended way to avoid a hydration mismatch warning here.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: false,
          protocols: ['http', 'https', 'mailto'],
        },
        // Off because sanitizeRichText doesn't allow them through — see the
        // module comment above.
        strike: false,
        underline: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content: toEditorContent(defaultValue),
    editorProps: { attributes: { class: styles.content } },
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
  });

  const errorId = `${name}-error`;

  if (!editor) {
    // Server render / before mount: a plain textarea-shaped placeholder so
    // there's no layout jump once the real editor takes over.
    return (
      <div className={styles.wrap}>
        {label && <span className={styles.label}>{label}</span>}
        {hint && <p className={styles.hint}>{hint}</p>}
        <div className={styles.editor}>
          <div className={`${styles.content} ${styles.loading}`} />
        </div>
        <input type="hidden" name={name} value={html} readOnly />
        {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
      </div>
    );
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined;
    // eslint-disable-next-line no-alert
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const buttons: { label: string; title: string; active: boolean; onClick: () => void }[] = [
    {
      label: 'B', title: 'Bold', active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'I', title: 'Italic', active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'H2', title: 'Heading', active: editor.isActive('heading', { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'H3', title: 'Subheading', active: editor.isActive('heading', { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: '•⁠—', title: 'Bulleted list', active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: '1.', title: 'Numbered list', active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: '❝', title: 'Quote', active: editor.isActive('blockquote'),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '🔗', title: 'Link', active: editor.isActive('link'),
      onClick: setLink,
    },
  ];

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      {hint && <p className={styles.hint}>{hint}</p>}

      <div className={styles.editor}>
        <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
          {buttons.map((b) => (
            <button
              key={b.title}
              type="button"
              title={b.title}
              aria-label={b.title}
              aria-pressed={b.active}
              className={`${styles.toolButton} ${b.active ? styles.toolButtonActive : ''}`}
              onClick={b.onClick}
            >
              {b.label}
            </button>
          ))}
        </div>
        <EditorContent
          editor={editor}
          aria-describedby={error ? errorId : undefined}
        />
      </div>

      <input type="hidden" name={name} value={html} readOnly />
      {error && <p className={styles.error} id={errorId} role="alert">{error}</p>}
    </div>
  );
}
