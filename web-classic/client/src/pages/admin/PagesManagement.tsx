import { useState, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Edit2,
  FileText,
  Loader2,
  Eye,
  EyeOff,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Minus,
  Link2,
  Unlink,
  ImagePlus,
  Undo2,
  Redo2,
  Eraser,
  Palette,
  Highlighter,
  Type,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/* ✅ TipTap */
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { useTranslation } from '@/contexts/TranslationContext';

type TextAlignment = 'left' | 'center' | 'right' | 'justify';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: TextAlignment) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
    inlineStyle: {
      setTextColor: (color: string) => ReturnType;
      setHighlightColor: (color: string) => ReturnType;
      setFontSize: (fontSize: string) => ReturnType;
      unsetInlineStyle: () => ReturnType;
    };
    underline: {
      toggleUnderline: () => ReturnType;
    };
  }
}

const TextAlign = Extension.create<{ types: string[] }>({
  name: 'textAlign',

  addOptions() {
    return {
      types: ['heading', 'paragraph', 'listItem', 'blockquote'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => (element as HTMLElement).style.textAlign || null,
            renderHTML: (attributes) => {
              if (!attributes.textAlign) return {};
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const updateTextAlign =
      (textAlign: TextAlignment | null) =>
        ({ state, tr, dispatch }) => {
          const alignableTypes = new Set(
            this.options.types.filter((type) => Boolean(state.schema.nodes[type])),
          );
          let matchedNode = false;

          const applyAlignment = (pos: number, node: ProseMirrorNode) => {
            if (!alignableTypes.has(node.type.name)) return;

            matchedNode = true;

            if (dispatch && node.attrs.textAlign !== textAlign) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                textAlign,
              });
            }
          };

          state.selection.ranges.forEach(({ $from, $to }) => {
            if (state.selection.empty) {
              for (let depth = $from.depth; depth > 0; depth -= 1) {
                const node = $from.node(depth);

                if (alignableTypes.has(node.type.name)) {
                  applyAlignment($from.before(depth), node);
                  break;
                }
              }

              return;
            }

            state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
              applyAlignment(pos, node);
            });
          });

          return matchedNode;
        };

    return {
      setTextAlign:
        (alignment: TextAlignment) =>
          updateTextAlign(alignment),
      unsetTextAlign: () => updateTextAlign(null),
    };
  },
});

const InlineStyle = Mark.create({
  name: 'inlineStyle',
  priority: 101,

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.color || null,
      },
      backgroundColor: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.backgroundColor || null,
      },
      fontSize: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).style.fontSize || null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span' }];
  },

  renderHTML({ mark, HTMLAttributes }) {
    const {
      color: _color,
      backgroundColor: _backgroundColor,
      fontSize: _fontSize,
      style,
      ...attributes
    } = HTMLAttributes;
    const styles = [
      style,
      mark.attrs.color ? `color: ${mark.attrs.color}` : '',
      mark.attrs.backgroundColor ? `background-color: ${mark.attrs.backgroundColor}` : '',
      mark.attrs.fontSize ? `font-size: ${mark.attrs.fontSize}` : '',
    ].filter(Boolean);

    return [
      'span',
      mergeAttributes(attributes, styles.length ? { style: styles.join('; ') } : {}),
      0,
    ];
  },

  addCommands() {
    return {
      setTextColor:
        (color: string) =>
          ({ commands }) =>
            commands.setMark(this.name, { color }),
      setHighlightColor:
        (backgroundColor: string) =>
          ({ commands }) =>
            commands.setMark(this.name, { backgroundColor }),
      setFontSize:
        (fontSize: string) =>
          ({ commands }) =>
            commands.setMark(this.name, { fontSize }),
      unsetInlineStyle:
        () =>
          ({ commands }) =>
            commands.unsetMark(this.name),
    };
  },
});

const Underline = Mark.create({
  name: 'underline',
  priority: 100,

  parseHTML() {
    return [
      { tag: 'u' },
      {
        style: 'text-decoration',
        getAttrs: (value) => (String(value).includes('underline') ? {} : false),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['u', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      toggleUnderline:
        () =>
          ({ commands }) =>
            commands.toggleMark(this.name),
    };
  },
});

const FONT_SIZE_OPTIONS = [
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '24', value: '24px' },
  { label: '32', value: '32px' },
  { label: '40', value: '40px' },
];

async function readResponseError(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const error = await response.json().catch(() => null);
    const zodMessage = Array.isArray(error?.errors)
      ? error.errors.map((item: any) => item.message).filter(Boolean).join(', ')
      : '';

    return zodMessage || error?.message || error?.error || fallback;
  }

  const text = await response.text().catch(() => '');
  if (text.trim().startsWith('<')) {
    return `${fallback}. The server returned HTML instead of JSON. Check that /api/pages is registered on the API server.`;
  }

  return text || fallback;
}

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PageManagement() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [textColor, setTextColor] = useState('#111827');
  const [highlightColor, setHighlightColor] = useState('#fef3c7');

  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    metaTitle: '',
    metaDescription: '',
    isPublished: false,
  });

  /* ================= TipTap Editor ================= */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      InlineStyle,
      TextAlign,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setFormData((prev) => ({
        ...prev,
        content: editor.getHTML(),
      }));
    },
  });

  useEffect(() => {
    if (!showAddDialog && !editingPage) {
      editor?.commands.clearContent();
    }
  }, [showAddDialog, editingPage]);

  /* ---------------- FETCH PAGES ---------------- */
  const { data, isLoading } = useQuery({
    queryKey: ['/api/pages'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/pages');
      return res.json();
    },
  });

  const pages = data?.data || [];

  /* ---------------- MUTATIONS ---------------- */
  const addPageMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch('/api/pages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readResponseError(res, 'Failed to create page'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      resetForm();
      setShowAddDialog(false);
      toast({ title: 'Success', description: 'Page created successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: mutationErrorMessage(error, 'Failed to create page'),
        variant: 'destructive',
      });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof formData }) => {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readResponseError(res, 'Failed to update page'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      resetForm();
      setEditingPage(null);
      toast({ title: 'Success', description: 'Page updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: mutationErrorMessage(error, 'Failed to update page'),
        variant: 'destructive',
      });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      toast({ title: 'Deleted', description: 'Page deleted successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: mutationErrorMessage(error, 'Failed to delete page'),
        variant: 'destructive',
      });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) throw new Error(await readResponseError(res, 'Failed to update status'));
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/pages'] }),
    onError: (error) => {
      toast({
        title: 'Error',
        description: mutationErrorMessage(error, 'Failed to update status'),
        variant: 'destructive',
      });
    },
  });

  const isSavingPage = addPageMutation.isPending || updatePageMutation.isPending;

  /* ---------------- HELPERS ---------------- */
  const resetForm = () => {
    setFormData({
      slug: '',
      title: '',
      content: '',
      metaTitle: '',
      metaDescription: '',
      isPublished: false,
    });
    editor?.commands.clearContent();
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const openEditDialog = (page: Page) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      isPublished: page.isPublished,
    });

    setTimeout(() => {
      editor?.commands.setContent(page.content || '');
    }, 0);
  };

  const setLink = () => {
    if (!editor) return;

    const currentUrl = editor.getAttributes('link').href || '';
    const url = window.prompt(t('adminPanel.admin.pages.enterLinkUrl', 'Enter link URL'), currentUrl);

    if (url === null) return;

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const addImage = () => {
    if (!editor) return;

    const url = window.prompt(t('adminPanel.admin.pages.enterImageUrl', 'Enter image URL'));
    if (!url?.trim()) return;

    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const handleSavePage = () => {
    const content = editor?.getHTML() || formData.content;
    const payload = {
      ...formData,
      title: formData.title.trim(),
      slug: generateSlug(formData.slug || formData.title),
      content,
      metaTitle: formData.metaTitle.trim(),
      metaDescription: formData.metaDescription.trim(),
    };

    if (!payload.title) {
      toast({
        title: 'Missing title',
        description: 'Enter a page title before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (!payload.slug) {
      toast({
        title: 'Missing URL slug',
        description: 'Enter a valid URL slug before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (editor?.isEmpty || !payload.content.trim()) {
      toast({
        title: 'Missing content',
        description: 'Enter page content before saving.',
        variant: 'destructive',
      });
      return;
    }

    setFormData(payload);

    if (editingPage) {
      updatePageMutation.mutate({ id: editingPage.id, payload });
      return;
    }

    addPageMutation.mutate(payload);
  };

  const ToolbarButton = ({
    label,
    active,
    disabled,
    onClick,
    children,
  }: {
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={active ? 'outline' : 'ghost'}
          disabled={disabled || !editor}
          onClick={onClick}
          className={cn(
            'h-8 w-8 border-border/60',
            active && 'border-primary/50 bg-primary/15 text-primary',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const ToolbarDivider = () => <div className="mx-1 h-6 w-px bg-border" />;

  const ColorTool = ({
    label,
    color,
    onChange,
    children,
  }: {
    label: string;
    color: string;
    onChange: (color: string) => void;
    children: ReactNode;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <label
          className={cn(
            'relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-transparent hover:bg-accent',
            !editor && 'pointer-events-none opacity-50',
          )}
        >
          {children}
          <span
            className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full border border-white/40"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            className="sr-only"
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  /* ================= UI ================= */
  return (
    <div className="admin-light-surface p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Page Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage static CMS pages</p>
        </div>
        <Button
          type="button"
          className="h-11 w-full gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200 sm:h-10 sm:w-auto"
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Page
        </Button>
      </div>


      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <FileText className="h-5 w-5" /> Pages
          </CardTitle>
          <CardDescription>All static pages</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page: Page) => (
                  <TableRow key={page.id}>
                    <TableCell>{page.title}</TableCell>
                    <TableCell>/{page.slug}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={page.isPublished}
                          onCheckedChange={(checked) =>
                            togglePublishMutation.mutate({
                              id: page.id,
                              isPublished: checked,
                            })
                          }
                        />
                        <Badge variant={page.isPublished ? 'default' : 'secondary'}>
                          {page.isPublished ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" /> Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" /> Draft
                            </>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`/pages/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(page)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePageMutation.mutate(page.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ADD / EDIT DIALOG */}
      <Dialog
        open={showAddDialog || !!editingPage}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingPage(null);
            resetForm();
            editor?.commands.clearContent();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? 'Edit Page' : 'Add Page'}</DialogTitle>
            <DialogDescription>Manage page content & SEO</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Page Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                    slug: generateSlug(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <Label>URL Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            {/* TipTap Editor */}
            <div>
              <Label>Page Content *</Label>

              <div className="overflow-hidden rounded-md border">
                {/* Toolbar */}
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap items-center gap-1 border-b bg-muted/70 p-2">
                    <ToolbarButton
                      label="Paragraph"
                      active={editor?.isActive('paragraph')}
                      onClick={() => editor?.chain().focus().setParagraph().run()}
                    >
                      <Pilcrow className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Heading 1"
                      active={editor?.isActive('heading', { level: 1 })}
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    >
                      <Heading1 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Heading 2"
                      active={editor?.isActive('heading', { level: 2 })}
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    >
                      <Heading2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Heading 3"
                      active={editor?.isActive('heading', { level: 3 })}
                      onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    >
                      <Heading3 className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton
                      label="Bold"
                      active={editor?.isActive('bold')}
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                    >
                      <Bold className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Italic"
                      active={editor?.isActive('italic')}
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                    >
                      <Italic className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Underline"
                      active={editor?.isActive('underline')}
                      onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    >
                      <UnderlineIcon className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Strike"
                      active={editor?.isActive('strike')}
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Inline code"
                      active={editor?.isActive('code')}
                      onClick={() => editor?.chain().focus().toggleCode().run()}
                    >
                      <Code className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ColorTool
                      label="Text color"
                      color={textColor}
                      onChange={(color) => {
                        setTextColor(color);
                        editor?.chain().focus().setTextColor(color).run();
                      }}
                    >
                      <Palette className="h-4 w-4" />
                    </ColorTool>
                    <ColorTool
                      label="Highlight color"
                      color={highlightColor}
                      onChange={(color) => {
                        setHighlightColor(color);
                        editor?.chain().focus().setHighlightColor(color).run();
                      }}
                    >
                      <Highlighter className="h-4 w-4" />
                    </ColorTool>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="flex h-8 items-center gap-1 rounded-md px-2 hover:bg-accent">
                          <Type className="h-4 w-4" />
                          <select
                            aria-label="Font size"
                            className="h-7 bg-transparent text-xs outline-none"
                            defaultValue=""
                            disabled={!editor}
                            onChange={(event) => {
                              const fontSize = event.target.value;
                              if (fontSize) {
                                editor?.chain().focus().setFontSize(fontSize).run();
                                event.currentTarget.value = '';
                              }
                            }}
                          >
                            <option value="">Size</option>
                            {FONT_SIZE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </TooltipTrigger>
                      <TooltipContent>Font size</TooltipContent>
                    </Tooltip>

                    <ToolbarDivider />

                    <ToolbarButton
                      label="Bullet list"
                      active={editor?.isActive('bulletList')}
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    >
                      <List className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Numbered list"
                      active={editor?.isActive('orderedList')}
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Quote"
                      active={editor?.isActive('blockquote')}
                      onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    >
                      <Quote className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Code block"
                      active={editor?.isActive('codeBlock')}
                      onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    >
                      <Code2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Horizontal rule"
                      onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    >
                      <Minus className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton
                      label="Align left"
                      active={editor?.isActive({ textAlign: 'left' })}
                      onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    >
                      <AlignLeft className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Align center"
                      active={editor?.isActive({ textAlign: 'center' })}
                      onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    >
                      <AlignCenter className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Align right"
                      active={editor?.isActive({ textAlign: 'right' })}
                      onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                    >
                      <AlignRight className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Justify"
                      active={editor?.isActive({ textAlign: 'justify' })}
                      onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                    >
                      <AlignJustify className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton label="Add link" active={editor?.isActive('link')} onClick={setLink}>
                      <Link2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Remove link"
                      onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()}
                    >
                      <Unlink className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton label="Add image URL" onClick={addImage}>
                      <ImagePlus className="h-4 w-4" />
                    </ToolbarButton>

                    <ToolbarDivider />

                    <ToolbarButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
                      <Undo2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
                      <Redo2 className="h-4 w-4" />
                    </ToolbarButton>
                    <ToolbarButton
                      label="Clear formatting"
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .unsetInlineStyle()
                          .unsetAllMarks()
                          .clearNodes()
                          .unsetTextAlign()
                          .run()
                      }
                    >
                      <Eraser className="h-4 w-4" />
                    </ToolbarButton>
                  </div>
                </TooltipProvider>

                {/* <EditorContent
                  editor={editor}
                  className="min-h-[300px] p-3 prose max-w-none"
                /> */}

                <EditorContent
                  editor={editor}
                  className="prose prose-invert max-w-none [&_.ProseMirror]:min-h-[360px] [&_.ProseMirror]:p-4 [&_.ProseMirror]:outline-none [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_h1]:text-3xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded-md [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:bg-slate-950 [&_.ProseMirror_pre]:p-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6"
                />
              </div>
            </div>

            <div>
              <Label>Meta Title</Label>
              <Input
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              />
            </div>

            <div>
              <Label>Meta Description</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                value={formData.metaDescription}
                onChange={(e) =>
                  setFormData({ ...formData, metaDescription: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
              <Label>Publish immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              disabled={isSavingPage}
              onClick={handleSavePage}
              className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
            >
              {isSavingPage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPage ? 'Update Page' : 'Create Page'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
