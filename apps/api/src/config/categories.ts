export interface CategoryConfig {
  id: string;
  label: string;
  outlierMin: number;
  outlierMax: number;
  variantLabel: string;
  brands: string[];
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  phone: {
    id: 'phone',
    label: 'Celulares',
    outlierMin: 200,
    outlierMax: 15000,
    variantLabel: 'Armazenamento',
    brands: ['Apple', 'Samsung', 'Xiaomi', 'Motorola'],
  },
  console: {
    id: 'console',
    label: 'Consoles',
    outlierMin: 200,
    outlierMax: 8000,
    variantLabel: 'Edição',
    brands: ['Sony', 'Microsoft', 'Nintendo'],
  },
  notebook: {
    id: 'notebook',
    label: 'Notebooks',
    outlierMin: 500,
    outlierMax: 20000,
    variantLabel: 'Spec',
    brands: ['Apple', 'Dell', 'Lenovo', 'Acer', 'Asus', 'HP', 'Samsung'],
  },
  motorcycle: {
    id: 'motorcycle',
    label: 'Motos',
    outlierMin: 2000,
    outlierMax: 150000,
    variantLabel: 'Cilindrada',
    brands: ['Honda', 'Yamaha', 'Suzuki', 'BMW', 'Kawasaki'],
  },
  car: {
    id: 'car',
    label: 'Carros',
    outlierMin: 5000,
    outlierMax: 500000,
    variantLabel: 'Ano',
    brands: ['Fiat', 'Volkswagen', 'Chevrolet', 'Honda', 'Toyota', 'Hyundai', 'Jeep', 'Renault', 'Ford', 'Nissan', 'BMW', 'Mercedes'],
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES);

export function getCategoryConfig(id: string): CategoryConfig | undefined {
  return CATEGORIES[id];
}

export function getAllCategories(): CategoryConfig[] {
  return Object.values(CATEGORIES);
}
