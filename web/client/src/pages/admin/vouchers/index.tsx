import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import VoucherList from "./VoucherList";
import VoucherForm from "./VoucherForm";
import { Voucher, VoucherFormData } from "./types";
import { fetchVouchers, createVoucher, updateVoucher, deleteVoucher } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function AdminVouchers() {
  const [search, setSearch] = useState("");
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [open, setOpen] = useState(false);

  // ✅ React-Query v5 usage
  const {
    data: vouchers = [],
    refetch,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["/api/admin/vouchers"],
    queryFn: () => fetchVouchers(),
  });

  // Create/update mutation
  const saveMutation = useMutation({
    mutationFn: (data: { id?: string; values: VoucherFormData }) => {
      return data.id
        ? updateVoucher(data.id, data.values)
        : createVoucher(data.values);
    },
    onSuccess: () => {
      refetch();
      setOpen(false);
    },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteVoucher(id),
    onSuccess: () => refetch(),
  });

  const filtered = vouchers.filter((v) =>
    v.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (data: VoucherFormData) => {
    saveMutation.mutate({
      id: editingVoucher?.id,
      values: data,
    });
  };

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setOpen(true);
  };

  const handleCreate = () => {
    setEditingVoucher(null);
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this voucher?")) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Admin — Vouchers</title>
      </Helmet>

      <div className="flex items-center gap-3">
        <Gift className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Voucher Management</h1>
      </div>

      {/* Search + New */}
      <div className="flex gap-2">
        <Input
          placeholder="Search vouchers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={handleCreate}>New Voucher</Button>
      </div>

      {/* Optional: Loading & Error */}
      {isFetching && <p>Loading vouchers…</p>}
      {isError && <p className="text-destructive">Error loading vouchers</p>}

      <VoucherList
        vouchers={filtered}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modal for Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {/* Hidden trigger */}
          <></>
        </DialogTrigger>

        <DialogContent className="sm:max-w-lg p-0">
          <DialogTitle>
            {editingVoucher ? "Edit Voucher" : "Create Voucher"}
          </DialogTitle>

          <div className="p-4 max-h-[60vh] overflow-y-auto pr-2">
            <VoucherForm
              initialData={editingVoucher ?? undefined}
              onSubmit={handleSave}
            />
          </div>

          <DialogClose asChild>
            <Button variant="outline" className="mt-2 w-full">
              Close
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
