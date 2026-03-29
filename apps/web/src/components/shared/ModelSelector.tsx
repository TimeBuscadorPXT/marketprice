import { useQuery } from '@tanstack/react-query';
import { getModels, type Product } from '@/services/models';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  brand?: string;
  category?: string;
  label?: string;
  error?: string;
}

export function ModelSelector({ value, onChange, brand, category, label = 'Modelo', error }: ModelSelectorProps) {
  const { data: models, isLoading } = useQuery<Product[]>({
    queryKey: ['models', brand, category],
    queryFn: () => getModels(brand, category),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <span className="text-sm font-medium text-[#f0f0f5]/70">{label}</span>}
        <div className="flex h-[38px] items-center gap-2 rounded-lg border border-[#27272a] bg-[#12121a] px-3">
          <Spinner size="sm" />
          <span className="text-sm text-[#f0f0f5]/30">Carregando modelos...</span>
        </div>
      </div>
    );
  }

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
    >
      <option value="">Selecione um modelo</option>
      {models?.map((model) => (
        <option key={model.id} value={model.id}>
          {model.brand} {model.name} {model.variant}
        </option>
      ))}
    </Select>
  );
}
