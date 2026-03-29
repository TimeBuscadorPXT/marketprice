import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  compareSuppliers,
  type Supplier,
  type SupplierComparison,
} from '@/services/suppliers';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { ModelSelector } from '@/components/shared/ModelSelector';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/HelpTip';

function getRecommendationBadge(recommendation: string) {
  const lower = recommendation.toLowerCase();
  if (lower.includes('excelente')) return <Badge variant="success">{recommendation}</Badge>;
  if (lower.includes('bom')) return <Badge variant="success">{recommendation}</Badge>;
  if (lower.includes('apertada') || lower.includes('regular'))
    return <Badge variant="warning">{recommendation}</Badge>;
  return <Badge variant="danger">{recommendation}</Badge>;
}

export default function Suppliers() {
  useDocumentTitle('Fornecedores');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Form state
  const [formName, setFormName] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const region = user?.region ?? 'SP';

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const { data: comparisons = [] } = useQuery<SupplierComparison[]>({
    queryKey: ['supplier-comparisons', region],
    queryFn: () => compareSuppliers(region),
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-comparisons'] });
      setFormName('');
      setFormModelId('');
      setFormPrice(0);
      setFormNotes('');
      setFormError('');
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar fornecedor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateSupplier>[1] }) =>
      updateSupplier(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-comparisons'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-comparisons'] });
      setDeletingId(null);
    },
  });

  function handleCreate() {
    if (!formName.trim() || !formModelId || formPrice <= 0) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }
    createMutation.mutate({
      name: formName.trim(),
      modelId: formModelId,
      price: formPrice,
      notes: formNotes.trim() || undefined,
    });
  }

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setEditName(supplier.name);
    setEditPrice(supplier.price);
    setEditNotes(supplier.notes ?? '');
  }

  function handleUpdate(id: string) {
    updateMutation.mutate({
      id,
      body: { name: editName, price: editPrice, notes: editNotes || null },
    });
  }

  // Summary cards
  const totalSuppliers = suppliers.length;
  const margins = comparisons.map((c) => c.margin);
  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
  const bestMargin = margins.length > 0 ? Math.max(...margins) : 0;
  const worstMargin = margins.length > 0 ? Math.min(...margins) : 0;

  const comparisonMap = new Map(comparisons.map((c) => [c.supplier.id, c]));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Total Fornecedores</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#f0f0f5]">
            {totalSuppliers}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Margem M\u00e9dia <HelpTip text="Quanto voc\u00ea lucra em porcentagem. 15% de margem em R$ 4.000 = R$ 600 de lucro." /></p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#fbbf24]">
            {formatPercent(avgMargin)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Melhor Margem</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">
            {formatPercent(bestMargin)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-[#f0f0f5]/50">Pior Margem</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#f87171]">
            {formatPercent(worstMargin)}
          </p>
        </Card>
      </div>

      {/* Add supplier form */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-[#f0f0f5]/70">
          Adicionar Fornecedor
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg border border-[#f87171]/20 bg-[#f87171]/10 px-4 py-3 text-sm text-[#f87171]">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Nome do Fornecedor"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ex: Distribuidora XYZ"
          />
          <ModelSelector value={formModelId} onChange={setFormModelId} />
          <CurrencyInput
            label="Preço"
            value={formPrice}
            onChange={setFormPrice}
            placeholder="0,00"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#f0f0f5]/70">Notas</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Observações opcionais"
              rows={1}
              className="w-full rounded-lg border border-[#27272a] bg-[#12121a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#f0f0f5]/30 outline-none transition-colors focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]"
            />
          </div>
        </div>

        <Button
          className="mt-4"
          onClick={handleCreate}
          loading={createMutation.isPending}
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </Card>

      {/* Suppliers table */}
      <Card>
        <h3 className="mb-2 text-sm font-semibold text-[#f0f0f5]/70">
          Fornecedores
        </h3>
        <p className="mb-4 text-xs text-[#f0f0f5]/40">
          {'\ud83d\udfe2'} Excelente/Bom = comprar | {'\ud83d\udfe1'} Marginal = avaliar com cuidado | {'\ud83d\udd34'} Não recomendado = não comprar
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum fornecedor"
            description="Cadastre seu primeiro fornecedor para comparar preços com a média do mercado."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-xs text-[#f0f0f5]/50">
                  <th className="pb-3 pr-4 font-medium">Fornecedor</th>
                  <th className="pb-3 pr-4 font-medium">Modelo</th>
                  <th className="pb-3 pr-4 font-medium">Preço Fornecedor</th>
                  <th className="hidden pb-3 pr-4 font-medium md:table-cell">
                    M\u00e9dia Mercado <HelpTip text="Soma de todos os pre\u00e7os dividida pelo total. \u00c9 o pre\u00e7o 'normal' do mercado." />
                  </th>
                  <th className="hidden pb-3 pr-4 font-medium lg:table-cell">
                    Diferença
                  </th>
                  <th className="pb-3 pr-4 font-medium">Margem</th>
                  <th className="hidden pb-3 pr-4 font-medium sm:table-cell">
                    Recomenda\u00e7\u00e3o <HelpTip text="Baseado na diferen\u00e7a entre pre\u00e7o do fornecedor e a m\u00e9dia de mercado. Verde = lucro bom." />
                  </th>
                  <th className="pb-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {suppliers.map((supplier) => {
                  const comparison = comparisonMap.get(supplier.id);
                  const isEditing = editingId === supplier.id;
                  const isDeleting = deletingId === supplier.id;

                  return (
                    <tr key={supplier.id} className="text-[#f0f0f5]/80">
                      <td className="py-3 pr-4">
                        {isEditing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded border border-[#27272a] bg-[#12121a] px-2 py-1 text-sm text-[#f0f0f5] outline-none focus:border-[#22c55e]"
                          />
                        ) : (
                          supplier.name
                        )}
                      </td>
                      <td className="py-3 pr-4 text-[#f0f0f5]/60">
                        {supplier.model.brand} {supplier.model.name} {supplier.model.variant}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 font-mono font-medium">
                        {isEditing ? (
                          <CurrencyInput value={editPrice} onChange={setEditPrice} />
                        ) : (
                          formatCurrency(Number(supplier.price))
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap py-3 pr-4 font-mono md:table-cell">
                        {comparison ? formatCurrency(comparison.marketAverage) : '-'}
                      </td>
                      <td className="hidden whitespace-nowrap py-3 pr-4 font-mono lg:table-cell">
                        {comparison ? (
                          <span
                            className={cn(
                              comparison.marketAverage - supplier.price > 0
                                ? 'text-[#22c55e]'
                                : 'text-[#f87171]',
                            )}
                          >
                            {formatCurrency(comparison.marketAverage - supplier.price)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 font-mono">
                        {comparison ? (
                          <span
                            className={cn(
                              comparison.margin > 10
                                ? 'text-[#22c55e]'
                                : comparison.margin > 0
                                  ? 'text-[#fbbf24]'
                                  : 'text-[#f87171]',
                            )}
                          >
                            {formatPercent(comparison.margin)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        {comparison
                          ? getRecommendationBadge(comparison.recommendation)
                          : '-'}
                      </td>
                      <td className="py-3">
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteMutation.mutate(supplier.id)}
                              loading={deleteMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleUpdate(supplier.id)}
                              loading={updateMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(supplier)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingId(supplier.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
