// components/FaqManagement.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Plus,
    Trash2,
    Edit2,
    HelpCircle,
    Loader2,
    FolderPlus,
    Eye,
    EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    position: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Faq {
    id: string;
    categoryId?: string | null;
    question: string;
    answer: string;
    position: number;
    isActive: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
    category?: Category | null;
}

export default function FaqManagement() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("faqs");

    // FAQ State
    const [showAddFaqDialog, setShowAddFaqDialog] = useState(false);
    const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
    const [faqFormData, setFaqFormData] = useState({
        question: "",
        answer: "",
        categoryId: "",
        position: "0",
        isActive: true,
    });

    // Category State
    const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryFormData, setCategoryFormData] = useState({
        name: "",
        slug: "",
        description: "",
        position: "0",
        isActive: true,
    });

    // Fetch Categories
    const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery({
        queryKey: ["/api/faqs/categories"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/faqs/categories");
            const res = await response.json();
            return res;
        },
    });

    const categories = categoriesResponse?.data || [];

    // Fetch FAQs
    const { data: faqsResponse, isLoading: faqsLoading } = useQuery({
        queryKey: ["/api/faqs"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/faqs");
            const res = await response.json();
            return res;
        },
    });

    const faqs = faqsResponse?.data || [];

    // ==================== FAQ MUTATIONS ====================

    const addFaqMutation = useMutation({
        mutationFn: async (data: typeof faqFormData) => {
            const response = await fetch("/api/faqs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    position: parseInt(data.position),
                    categoryId: data.categoryId || null,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to add FAQ");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
            resetFaqForm();
            setShowAddFaqDialog(false);
            toast({ title: "Success", description: "FAQ created successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create FAQ",
                variant: "destructive",
            });
        },
    });

    const updateFaqMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<typeof faqFormData> }) => {
            const response = await fetch(`/api/faqs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    position: data.position ? parseInt(data.position) : undefined,
                    categoryId: data.categoryId || null,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update FAQ");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
            resetFaqForm();
            setEditingFaq(null);
            toast({ title: "Success", description: "FAQ updated successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update FAQ",
                variant: "destructive",
            });
        },
    });

    const deleteFaqMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/faqs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
            toast({ title: "Success", description: "FAQ deleted successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete FAQ",
                variant: "destructive",
            });
        },
    });

    const toggleFaqActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const response = await fetch(`/api/faqs/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive }),
            });
            if (!response.ok) throw new Error("Failed to update FAQ status");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
            toast({ title: "Success", description: "FAQ status updated" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update FAQ status",
                variant: "destructive",
            });
        },
    });

    // ==================== CATEGORY MUTATIONS ====================

    const addCategoryMutation = useMutation({
        mutationFn: async (data: typeof categoryFormData) => {
            const response = await fetch("/api/faqs/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    position: parseInt(data.position),
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to add category");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs/categories"] });
            resetCategoryForm();
            setShowAddCategoryDialog(false);
            toast({ title: "Success", description: "Category created successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to create category",
                variant: "destructive",
            });
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<typeof categoryFormData> }) => {
            const response = await fetch(`/api/faqs/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    position: data.position ? parseInt(data.position) : undefined,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update category");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs/categories"] });
            queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
            resetCategoryForm();
            setEditingCategory(null);
            toast({ title: "Success", description: "Category updated successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update category",
                variant: "destructive",
            });
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/faqs/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/faqs/categories"] });
            queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
            toast({ title: "Success", description: "Category deleted successfully" });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete category",
                variant: "destructive",
            });
        },
    });

    // ==================== HELPER FUNCTIONS ====================

    const resetFaqForm = () => {
        setFaqFormData({
            question: "",
            answer: "",
            categoryId: "",
            position: "0",
            isActive: true,
        });
    };

    const resetCategoryForm = () => {
        setCategoryFormData({
            name: "",
            slug: "",
            description: "",
            position: "0",
            isActive: true,
        });
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    };

    const handleAddFaq = () => {
        if (!faqFormData.question || !faqFormData.answer) {
            toast({
                title: "Validation Error",
                description: "Question and answer are required",
                variant: "destructive",
            });
            return;
        }
        addFaqMutation.mutate(faqFormData);
    };

    const handleUpdateFaq = () => {
        if (!editingFaq) return;
        if (!faqFormData.question || !faqFormData.answer) {
            toast({
                title: "Validation Error",
                description: "Question and answer are required",
                variant: "destructive",
            });
            return;
        }
        updateFaqMutation.mutate({ id: editingFaq.id, data: faqFormData });
    };

    const openEditFaqDialog = (faq: Faq) => {
        setEditingFaq(faq);
        setFaqFormData({
            question: faq.question,
            answer: faq.answer,
            categoryId: faq.categoryId || "",
            position: faq.position.toString(),
            isActive: faq.isActive,
        });
    };

    const handleAddCategory = () => {
        if (!categoryFormData.name || !categoryFormData.slug) {
            toast({
                title: "Validation Error",
                description: "Name and slug are required",
                variant: "destructive",
            });
            return;
        }
        addCategoryMutation.mutate(categoryFormData);
    };

    const handleUpdateCategory = () => {
        if (!editingCategory) return;
        if (!categoryFormData.name || !categoryFormData.slug) {
            toast({
                title: "Validation Error",
                description: "Name and slug are required",
                variant: "destructive",
            });
            return;
        }
        updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryFormData });
    };

    const openEditCategoryDialog = (category: Category) => {
        setEditingCategory(category);
        setCategoryFormData({
            name: category.name,
            slug: category.slug,
            description: category.description || "",
            position: category.position.toString(),
            isActive: category.isActive,
        });
    };

    return (
        <div className="admin-light-surface p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        FAQ Management
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1">
                        Manage frequently asked questions and categories
                    </p>
                </div>
            </div>


            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto">
                    <TabsTrigger value="faqs">FAQs</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                </TabsList>

                {/* FAQs Tab */}
                <TabsContent value="faqs" className="space-y-4 pt-4">
                    <div className="flex justify-end">
                        <Button
                            onClick={() => {
                                resetFaqForm();
                                setShowAddFaqDialog(true);
                            }}
                            className="h-11 w-full gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200 sm:h-10 sm:w-auto"
                            data-testid="button-add-faq"
                        >
                            <Plus className="h-4 w-4" />
                            Add FAQ
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="px-4 py-4 md:px-6">
                            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                                <HelpCircle className="h-5 w-5" />
                                Frequently Asked Questions
                            </CardTitle>
                            <CardDescription>
                                Manage questions and answers for your users
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {faqsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : !faqs || faqs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No FAQs found. Add your first FAQ to get started.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Question</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead>Views</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {faqs.map((faq: Faq) => (
                                            <TableRow key={faq.id} data-testid={`faq-row-${faq.id}`}>
                                                <TableCell className="font-medium max-w-md truncate">
                                                    {faq.question}
                                                </TableCell>
                                                <TableCell>
                                                    {faq.category ? (
                                                        <Badge variant="outline">{faq.category.name}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">Uncategorized</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{faq.position}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">{faq.views}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={faq.isActive}
                                                        onCheckedChange={(checked) =>
                                                            toggleFaqActiveMutation.mutate({
                                                                id: faq.id,
                                                                isActive: checked,
                                                            })
                                                        }
                                                        data-testid={`switch-faq-active-${faq.id}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditFaqDialog(faq)}
                                                            data-testid={`button-edit-faq-${faq.id}`}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => deleteFaqMutation.mutate(faq.id)}
                                                            disabled={deleteFaqMutation.isPending}
                                                            data-testid={`button-delete-faq-${faq.id}`}
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
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-4 pt-4">
                    <div className="flex justify-end">
                        <Button
                            onClick={() => {
                                resetCategoryForm();
                                setShowAddCategoryDialog(true);
                            }}
                            className="h-11 w-full gap-2 bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200 sm:h-10 sm:w-auto"
                            data-testid="button-add-category"
                        >
                            <FolderPlus className="h-4 w-4" />
                            Add Category
                        </Button>
                    </div>

                    <Card>
                        <CardHeader className="px-4 py-4 md:px-6">
                            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">FAQ Categories</CardTitle>
                            <CardDescription>
                                Organize your FAQs into categories
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {categoriesLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : !categories || categories.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No categories found. Add your first category to get started.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Slug</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categories.map((category: Category) => (
                                            <TableRow key={category.id} data-testid={`category-row-${category.id}`}>
                                                <TableCell className="font-semibold">{category.name}</TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-muted px-2 py-1 rounded">
                                                        {category.slug}
                                                    </code>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{category.position}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={category.isActive ? "default" : "secondary"}>
                                                        {category.isActive ? (
                                                            <>
                                                                <Eye className="h-3 w-3 mr-1" />
                                                                Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <EyeOff className="h-3 w-3 mr-1" />
                                                                Inactive
                                                            </>
                                                        )}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditCategoryDialog(category)}
                                                            data-testid={`button-edit-category-${category.id}`}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => deleteCategoryMutation.mutate(category.id)}
                                                            disabled={deleteCategoryMutation.isPending}
                                                            data-testid={`button-delete-category-${category.id}`}
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
                </TabsContent>
            </Tabs>

            {/* Add FAQ Dialog */}
            <Dialog open={showAddFaqDialog} onOpenChange={setShowAddFaqDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle >Add New FAQ</DialogTitle>
                        <DialogDescription>
                            Create a new frequently asked question
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="question">Question *</Label>
                            <Input
                                id="question"
                                value={faqFormData.question}
                                onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                                placeholder="What is your question?"
                                data-testid="input-faq-question"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="answer">Answer *</Label>
                            <Textarea
                                id="answer"
                                value={faqFormData.answer}
                                onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                                placeholder="Provide a detailed answer..."
                                rows={6}
                                data-testid="input-faq-answer"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={faqFormData.categoryId}
                                    onValueChange={(value) => setFaqFormData({ ...faqFormData, categoryId: value })}
                                >
                                    <SelectTrigger data-testid="select-faq-category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat: Category) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="position">Position</Label>
                                <Input
                                    id="position"
                                    type="number"
                                    min="0"
                                    value={faqFormData.position}
                                    onChange={(e) => setFaqFormData({ ...faqFormData, position: e.target.value })}
                                    data-testid="input-faq-position"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="isActive"
                                checked={faqFormData.isActive}
                                onCheckedChange={(checked) =>
                                    setFaqFormData({ ...faqFormData, isActive: checked })
                                }
                                data-testid="switch-faq-active"
                            />
                            <Label htmlFor="isActive">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddFaqDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddFaq}
                            disabled={addFaqMutation.isPending}
                            className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
                            data-testid="button-save-faq"
                        >
                            {addFaqMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create FAQ"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit FAQ Dialog */}
            <Dialog open={!!editingFaq} onOpenChange={(open) => !open && setEditingFaq(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit FAQ</DialogTitle>
                        <DialogDescription>Update FAQ details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-question">Question *</Label>
                            <Input
                                id="edit-question"
                                value={faqFormData.question}
                                onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
                                placeholder="What is your question?"
                                data-testid="input-edit-faq-question"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-answer">Answer *</Label>
                            <Textarea
                                id="edit-answer"
                                value={faqFormData.answer}
                                onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
                                placeholder="Provide a detailed answer..."
                                rows={6}
                                data-testid="input-edit-faq-answer"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category</Label>
                                <Select
                                    value={faqFormData.categoryId}
                                    onValueChange={(value) => setFaqFormData({ ...faqFormData, categoryId: value })}
                                >
                                    <SelectTrigger data-testid="select-edit-faq-category">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat: Category) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-position">Position</Label>
                                <Input
                                    id="edit-position"
                                    type="number"
                                    min="0"
                                    value={faqFormData.position}
                                    onChange={(e) => setFaqFormData({ ...faqFormData, position: e.target.value })}
                                    data-testid="input-edit-faq-position"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-isActive"
                                checked={faqFormData.isActive}
                                onCheckedChange={(checked) =>
                                    setFaqFormData({ ...faqFormData, isActive: checked })
                                }
                                data-testid="switch-edit-faq-active"
                            />
                            <Label htmlFor="edit-isActive">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingFaq(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateFaq}
                            disabled={updateFaqMutation.isPending}
                            className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
                            data-testid="button-update-faq"
                        >
                            {updateFaqMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update FAQ"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Category Dialog */}
            <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                            Create a new FAQ category
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-name">Name *</Label>
                            <Input
                                id="cat-name"
                                value={categoryFormData.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setCategoryFormData({
                                        ...categoryFormData,
                                        name,
                                        slug: generateSlug(name),
                                    });
                                }}
                                placeholder="e.g., General Questions"
                                data-testid="input-category-name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-slug">Slug *</Label>
                            <Input
                                id="cat-slug"
                                value={categoryFormData.slug}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                                placeholder="general-questions"
                                data-testid="input-category-slug"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-description">Description</Label>
                            <Textarea
                                id="cat-description"
                                value={categoryFormData.description}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                                placeholder="Brief description..."
                                rows={2}
                                data-testid="input-category-description"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-position">Position</Label>
                            <Input
                                id="cat-position"
                                type="number"
                                min="0"
                                value={categoryFormData.position}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, position: e.target.value })}
                                data-testid="input-category-position"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="cat-isActive"
                                checked={categoryFormData.isActive}
                                onCheckedChange={(checked) =>
                                    setCategoryFormData({ ...categoryFormData, isActive: checked })
                                }
                                data-testid="switch-category-active"
                            />
                            <Label htmlFor="cat-isActive">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCategory}
                            disabled={addCategoryMutation.isPending}
                            className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
                            data-testid="button-save-category"
                        >
                            {addCategoryMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>Update category details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-cat-name">Name *</Label>
                            <Input
                                id="edit-cat-name"
                                value={categoryFormData.name}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                                placeholder="e.g., General Questions"
                                data-testid="input-edit-category-name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-cat-slug">Slug *</Label>
                            <Input
                                id="edit-cat-slug"
                                value={categoryFormData.slug}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                                placeholder="general-questions"
                                data-testid="input-edit-category-slug"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-cat-description">Description</Label>
                            <Textarea
                                id="edit-cat-description"
                                value={categoryFormData.description}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                                placeholder="Brief description..."
                                rows={2}
                                data-testid="input-edit-category-description"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-cat-position">Position</Label>
                            <Input
                                id="edit-cat-position"
                                type="number"
                                min="0"
                                value={categoryFormData.position}
                                onChange={(e) => setCategoryFormData({ ...categoryFormData, position: e.target.value })}
                                data-testid="input-edit-category-position"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-cat-isActive"
                                checked={categoryFormData.isActive}
                                onCheckedChange={(checked) =>
                                    setCategoryFormData({ ...categoryFormData, isActive: checked })
                                }
                                data-testid="switch-edit-category-active"
                            />
                            <Label htmlFor="edit-cat-isActive">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCategory(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCategory}
                            disabled={updateCategoryMutation.isPending}
                            className="bg-lime-300 text-slate-950 shadow-sm shadow-lime-300/30 hover:bg-lime-200"
                            data-testid="button-update-category"
                        >
                            {updateCategoryMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
