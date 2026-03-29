import api from './api';

export interface Supplier {
  id: string;
  name: string;
  price: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  model: { id: string; brand: string; name: string; variant: string };
}

export interface SupplierComparison {
  supplier: { id: string; name: string; price: number; model: { id: string; brand: string; name: string; variant: string } };
  marketAverage: number;
  margin: number;
  recommendation: string;
}

export async function getSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get('/suppliers');
  return data.data;
}

export async function createSupplier(body: { name: string; modelId: string; price: number; notes?: string }): Promise<Supplier> {
  const { data } = await api.post('/suppliers', body);
  return data.data;
}

export async function updateSupplier(id: string, body: { name?: string; modelId?: string; price?: number; notes?: string | null }): Promise<Supplier> {
  const { data } = await api.put(`/suppliers/${id}`, body);
  return data.data;
}

export async function deleteSupplier(id: string): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}

export async function compareSuppliers(region: string): Promise<SupplierComparison[]> {
  const { data } = await api.get('/suppliers/compare', { params: { region } });
  return data.data;
}
