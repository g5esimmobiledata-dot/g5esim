import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, ImageIcon, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  description?: string;
  isActive: boolean;
  position: number;
  packageId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

async function getErrorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const error = await response.json().catch(() => null);
    return error?.message || fallback;
  }

  const text = await response.text().catch(() => '');
  if (text.trim().startsWith('<')) {
    return `${fallback}. The server returned HTML instead of JSON. Check that the API server is running and that /api/banner is registered.`;
  }

  return text || fallback;
}

function PackageSearch({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['/api/admin/unified-packages', debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        search: debouncedSearch,
      });
      const response = await fetch(`/api/admin/unified-packages?${params.toString()}`);
      if (!response.ok) return { data: [], pagination: { page: 1, totalPages: 1 } };
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: open,
  });

  const { data: initialPackageResponse } = useQuery({
    queryKey: ['/api/admin/unified-packages', value],
    queryFn: async () => {
      if (!value) return null;
      const response = await fetch(`/api/admin/unified-packages/${value}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!value && !open,
  });

  const packages = data?.pages.flatMap((page) => page.data) || [];
  const selectedPkg = packages.find((p: any) => p.id === value) || initialPackageResponse?.data;
  const observer = useRef<IntersectionObserver>();

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedPkg ? selectedPkg.title : (value || "Select package...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 gap-0 max-w-[500px]">
        <DialogHeader className="px-4 py-2 border-b">
          <DialogTitle>Select Package</DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false} className="border-none shadow-none">
          <CommandInput
            placeholder="Search package..."
            value={search}
            onValueChange={setSearch}
            className="border-none focus:ring-0"
          />
          <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 dark:text-white">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : packages.length === 0 ? (
              <CommandEmpty>No package found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {packages.map((pkg: any) => (
                  <CommandItem
                    key={pkg.id}
                    value={pkg.id}
                    onSelect={(currentValue) => {
                      onSelect(currentValue);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 aria-selected:text-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 data-[selected='true']:bg-blue-50 dark:data-[selected='true']:bg-blue-900/20 transition-colors rounded-md p-2"
                  >
                    <div className="flex items-center w-full justify-between">
                      <span className="font-medium">{pkg.title}</span>
                      {value === pkg.id && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="text-xs text-muted-foreground w-full flex justify-between">
                      <span>{pkg.providerName} - {pkg.destinationName || pkg.regionName}</span>
                      <span>${pkg.price}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">ID: {pkg.id}</div>
                  </CommandItem>
                ))}

                {/* Sentinel for infinite scroll */}
                <div ref={lastElementRef} className="h-4 w-full" />

                {isFetchingNextPage && (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                    Loading more...
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default function BannerManagement() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    position: '1',
    packageId: '',
    isActive: true,
  });

  const { data: bannersResponse, isLoading } = useQuery({
    queryKey: ['/api/banner'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/banner');
      const res = await response.json();
      return res;
    },
  });

  // console.log(bannersResponse);

  const banners = bannersResponse?.data || [];

  const addBannerMutation = useMutation({
    mutationFn: async (formDataToSend: FormData) => {
      const response = await fetch('/api/banner', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to add banner'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
      resetForm();
      setShowAddDialog(false);
      toast({
        title: 'Success',
        description: 'Banner added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add banner',
        variant: 'destructive',
      });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, formDataToSend }: { id: string; formDataToSend: FormData }) => {
      const response = await fetch(`/api/banner/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formDataToSend,
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Failed to update banner'));
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
      resetForm();
      setEditingBanner(null);
      toast({
        title: 'Success',
        description: 'Banner updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update banner',
        variant: 'destructive',
      });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/banner/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
      toast({
        title: 'Success',
        description: 'Banner deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete banner',
        variant: 'destructive',
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const formData = new FormData();
      formData.append('isActive', isActive.toString());

      const response = await fetch(`/api/banner/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error(await getErrorMessage(response, 'Failed to update banner status'));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/banner'] });
      toast({
        title: 'Success',
        description: 'Banner status updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update banner status',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      position: '1',
      packageId: '',
      isActive: true,
    });
    setImageFile(null);
    setImagePreview('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size should be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = () => {
    if (!formData.title) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!imageFile) {
      toast({
        title: 'Validation Error',
        description: 'Please upload an image',
        variant: 'destructive',
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('position', formData.position);
    formDataToSend.append('isActive', formData.isActive.toString());
    if (formData.packageId) {
      formDataToSend.append('packageId', formData.packageId);
    }
    formDataToSend.append('image', imageFile);

    addBannerMutation.mutate(formDataToSend);
  };

  const handleUpdateBanner = () => {
    if (!editingBanner) return;

    if (!formData.title) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('position', formData.position);
    formDataToSend.append('isActive', formData.isActive.toString());
    if (formData.packageId) {
      formDataToSend.append('packageId', formData.packageId);
    }
    if (imageFile) {
      formDataToSend.append('image', imageFile);
    }

    updateBannerMutation.mutate({
      id: editingBanner.id,
      formDataToSend,
    });
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || '',
      position: banner.position.toString(),
      packageId: banner.packageId || '',
      isActive: banner.isActive,
    });
    setImagePreview(banner.imageUrl);
    setImageFile(null);
  };

  return (
    <div className="admin-light-surface p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Banner Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage promotional banners for your platform
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="h-11 w-full gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200 md:h-10 md:w-auto"
          data-testid="button-add-banner"
        >
          <Plus className="h-2 w-2 md:h-2 md:w-2" />
          Add Banner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Active Banners
          </CardTitle>
          <CardDescription>Manage banner images, titles, and display order</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !banners || banners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No banners found. Add your first banner to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner: Banner) => (
                  <TableRow key={banner.id} data-testid={`banner-row-${banner.id}`}>
                    <TableCell>
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="h-16 w-24 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-semibold">{banner.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{banner.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{banner.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({
                            id: banner.id,
                            isActive: checked,
                          })
                        }
                        data-testid={`switch-active-${banner.id}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(banner)}
                          data-testid={`button-edit-${banner.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteBannerMutation.mutate(banner.id)}
                          disabled={deleteBannerMutation.isPending}
                          data-testid={`button-delete-${banner.id}`}
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

      {/* Add Banner Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Banner</DialogTitle>
            <DialogDescription>Create a new promotional banner for your platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image">Banner Image *</Label>
              <div className="flex flex-col gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  data-testid="input-banner-image"
                />
                {imagePreview && (
                  <div className="relative w-full h-32 border rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an image (max 5MB). Recommended size: 1200x400px
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter banner title"
                maxLength={150}
                data-testid="input-banner-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter banner description"
                rows={3}
                data-testid="input-banner-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="number"
                  min="1"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  data-testid="input-banner-position"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageId">Package ID (Optional)</Label>
                <PackageSearch
                  value={formData.packageId}
                  onSelect={(value) => setFormData({ ...formData, packageId: value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-banner-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBanner}
              disabled={addBannerMutation.isPending}
              className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
              data-testid="button-save-banner"
            >
              {addBannerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Banner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Banner Dialog */}
      <Dialog open={!!editingBanner} onOpenChange={(open) => !open && setEditingBanner(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Banner</DialogTitle>
            <DialogDescription>Update banner details and image</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-image">Banner Image</Label>
              <div className="flex flex-col gap-4">
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  data-testid="input-edit-banner-image"
                />
                {imagePreview && (
                  <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to keep current image</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter banner title"
                  maxLength={150}
                  data-testid="input-edit-banner-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter banner description"
                  rows={3}
                  data-testid="input-edit-banner-description"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  type="number"
                  min="1"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  data-testid="input-edit-banner-position"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-packageId">Package ID (Optional)</Label>
                <PackageSearch
                  value={formData.packageId}
                  onSelect={(value) => setFormData({ ...formData, packageId: value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-edit-banner-active"
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBanner(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBanner}
              disabled={updateBannerMutation.isPending}
              className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
              data-testid="button-update-banner"
            >
              {updateBannerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Banner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
