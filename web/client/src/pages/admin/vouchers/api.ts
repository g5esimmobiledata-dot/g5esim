import { VoucherFormData, Voucher } from "./types";
import { apiRequest } from "@/lib/queryClient";

// Fetch all
// export async function fetchVouchers(): Promise<Voucher[]> {
//   return await apiRequest("GET", "/api/admin/vouchers");
// }


export async function fetchVouchers(): Promise<Voucher[]> {
  const res = await apiRequest("GET", "/api/admin/vouchers");
  const json = await res.json();
  return json.vouchers ?? json.data ?? [];
}


// Create
export async function createVoucher(data: VoucherFormData) {
  return await apiRequest("POST", "/api/admin/vouchers", data);
}

// Update
export async function updateVoucher(id: string, data: VoucherFormData) {
  return await apiRequest("PUT", `/api/admin/vouchers/${id}`, data);
}

// Delete
export async function deleteVoucher(id: string) {
  return await apiRequest("DELETE", `/api/admin/vouchers/${id}`);
}
