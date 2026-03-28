/** Fornecedor */
export interface Supplier {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  location: string;
  rating: number;
  totalTransactions: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
