import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, Send } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BlogPost } from '@shared/schema';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { log } from 'node:console';
import { useTranslation } from '@/contexts/TranslationContext';

export default function AdminBlog() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featuredImage: '' as string | File,
    published: false,
    metaDescription: '',
    metaKeywords: '',
  });

  const { data, isLoading } = useQuery<{
    posts: (BlogPost & { author: any })[];
    pagination: any;
  }>({
    queryKey: ['/api/admin/blog'],
  });



  /* ================= TipTap Editor ================= */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    onUpdate: ({ editor }) => {
      setFormData((prev) => ({
        ...prev,
        content: editor.getHTML(),
      }));
    },
  });


  // const createMutation = useMutation({
  //   mutationFn: (data: any) => apiRequest('POST','/api/admin/blog',  data),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
  //     toast({ title: "Blog post created" });
  //     handleCloseDialog();
  //   },
  //   onError: (error) => {
  //     console.log(error);
  //     toast({ title: "Failed to create blog post", variant: "destructive" });
  //   },
  // });

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => apiRequest('POST', '/api/admin/blog', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      toast({ title: 'Blog post created' });
      handleCloseDialog();
    },
    onError: (error) => {
      console.log(error);
      toast({
        title: 'Failed to create blog post',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest('PUT', `/api/admin/blog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      toast({ title: 'Blog post updated' });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: 'Failed to update blog post', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/admin/blog/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      toast({ title: 'Blog post deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete blog post', variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/admin/blog/${id}/publish`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog'] });
      toast({ title: 'Blog post published' });
    },

    onError: () => {
      toast({ title: 'Failed to publish blog post', variant: 'destructive' });
    },
  });

  const handleOpenDialog = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.featuredImage || '',
        published: post.published,
        metaDescription: post.metaDescription || '',
        metaKeywords: post.metaKeywords?.join(', ') || '',
      });
    } else {
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featuredImage: '',
        published: false,
        metaDescription: '',
        metaKeywords: '',
      });
    }
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (isDialogOpen && editor) {
      editor.commands.setContent(formData.content || '');
    }
  }, [isDialogOpen, editor]);


  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPost(null);
    editor?.commands.clearContent();
  };


  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();

  //   const data = {
  //     ...formData,
  //     metaKeywords: formData.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean),
  //   };

  //   if (editingPost) {
  //     updateMutation.mutate({ id: editingPost.id, data });
  //   } else {
  //     createMutation.mutate(data);
  //   }
  // };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const form = new FormData();

    form.append('title', formData.title);
    form.append('slug', formData.slug);
    form.append('excerpt', formData.excerpt);
    form.append('content', formData.content);
    form.append('published', String(formData.published));
    form.append('metaDescription', formData.metaDescription);
    form.append(
      'metaKeywords',
      JSON.stringify(
        formData.metaKeywords.split(',').map(k => k.trim()).filter(Boolean)
      )
    );

    if (formData.featuredImage) {
      form.append('featuredImage', formData.featuredImage); // <-- File object
    }

    if (editingPost) {
      // This triggers the PUT request
      updateMutation.mutate({
        id: editingPost.id,
        data: form
      });
    } else {
      // This triggers the POST request
      createMutation.mutate(form);
    }
  };

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData({ ...formData, slug });
  };

  return (
    <>
      <Helmet>
        <title>Blog Management</title>
      </Helmet>

      <div className="admin-light-surface">
        {/* Added mb-6 and adjusted vertical spacing for mobile */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-8">
          <div className="space-y-1">
            {/* Scaled text size: smaller on mobile, 3xl on desktop */}
            <h1
              className="text-2xl md:text-3xl font-bold text-foreground tracking-tight"
              data-testid="text-admin-blog-title"
            >
              Blog Management
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Create and manage blog posts
            </p>
          </div>

          {/* Button: Full width on mobile, auto width on desktop */}
          <Button
            onClick={() => handleOpenDialog()}
            data-testid="button-create-blog-post"
            className="h-11 w-full gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200 md:h-10 md:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>


        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center dark:text-white">Loading...</div>
            ) : data && data.posts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.posts.map((post) => (
                    <TableRow key={post.id} data-testid={`row-blog-post-${post.id}`}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>
                        {post.published ? (
                          <span className="text-green-600">Published</span>
                        ) : (
                          <span className="text-yellow-600">Draft</span>
                        )}
                      </TableCell>
                      <TableCell>{post.author?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {post.featuredImage && (
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!post.published && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => publishMutation.mutate(post.id)}
                              data-testid={`button-publish-${post.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Publish
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                            data-testid={`button-view-${post.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(post)}
                            data-testid={`button-edit-${post.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(t('adminPanel.admin.blog.confirmDelete', 'Are you sure you want to delete this post?'))) {
                                deleteMutation.mutate(post.id);
                              }
                            }}
                            data-testid={`button-delete-${post.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No blog posts yet. Create your first post!
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-blog-title"
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                    data-testid="input-blog-slug"
                  />
                  <Button type="button" variant="outline" onClick={generateSlug}>
                    Generate
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  required
                  data-testid="input-blog-excerpt"
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                {/* <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={10}
                required
                data-testid="input-blog-content"
              /> */}


                <div className="border rounded-md">
                  {/* Toolbar */}
                  <div className="flex gap-2 border-b p-2 bg-muted">
                    <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBold().run()}>
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                      <List className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                  </div>

                  <EditorContent
                    editor={editor}
                    className="min-h-[300px] p-3 prose max-w-none"
                  />
                </div>
              </div>

              {/* <div>
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input
                id="featuredImage"
                value={formData.featuredImage}
                onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                data-testid="input-blog-featured-image"
              />
            </div> */}

              <div>
                <Label htmlFor="featuredImage">Featured Image</Label>
                {/* Logic: If it's a File object, create a preview. If it's a string, use it directly */}
                {formData.featuredImage && (
                  <div className="mb-2">
                    <img
                      src={
                        formData.featuredImage instanceof File
                          ? URL.createObjectURL(formData.featuredImage)
                          : formData.featuredImage
                      }
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded"
                    />
                  </div>
                )}

                <Input
                  id="featuredImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, featuredImage: file });
                    }
                  }}
                />
              </div>


              <div>
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  rows={2}
                  data-testid="input-blog-meta-description"
                />
              </div>

              <div>
                <Label htmlFor="metaKeywords">Meta Keywords (comma-separated)</Label>
                <Input
                  id="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                  data-testid="input-blog-meta-keywords"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                  data-testid="switch-blog-published"
                />
                <Label htmlFor="published">Publish immediately</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
                  data-testid="button-save-blog-post"
                >
                  {
                    editingPost ? (updateMutation.isPending ? 'Saving...' : 'Save Changes')
                      : (createMutation.isPending ? 'Creating...' : 'Create Post')
                  }


                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
