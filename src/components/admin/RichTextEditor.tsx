"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link as LinkExtension } from "@tiptap/extension-link";
import { Image as ImageExtension } from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { requestAdminImageUpload } from "@/lib/actions/media-actions";

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus while clicking toolbar
      onClick={onClick}
      className={`p-2 rounded hover:bg-primary-100 ${active ? "bg-primary-100 text-primary-800" : "text-slate"}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [html, setHtml] = useState(defaultValue || "<p></p>");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      ImageExtension,
    ],
    content: defaultValue || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose-content focus:outline-none px-4 py-3 min-h-[260px] max-h-[520px] overflow-y-auto",
      },
    },
  });

  if (!editor) {
    return <div className="rounded-md border border-line bg-surface-muted h-[300px] animate-pulse" />;
  }

  async function handleImageFile(file: File) {
    try {
      const ticket = await requestAdminImageUpload({
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        category: "NEWS",
      });
      const res = await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("upload failed");
      editor?.chain().focus().setImage({ src: ticket.publicUrl }).run();
    } catch {
      window.alert("Image upload failed. Check that Cloudflare R2 is configured for this environment.");
    }
  }

  return (
    <div className="rounded-md border border-line overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-muted px-2 py-1.5">
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-line mx-1" />
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Subheading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-line mx-1" />
        <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-line mx-1" />
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="Image" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-line mx-1" />
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
