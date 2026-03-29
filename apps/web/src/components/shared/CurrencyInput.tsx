import { type ChangeEvent } from 'react';
import { parseCurrencyInput, formatCurrencyInput } from '@/lib/utils';
import { Input } from '@/components/ui/Input';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  placeholder?: string;
}

export function CurrencyInput({ value, onChange, label, error, placeholder = '0,00' }: CurrencyInputProps) {
  const cents = Math.round(value * 100);
  const displayValue = formatCurrencyInput(cents);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const parsed = parseCurrencyInput(raw);
    onChange(parsed);
  }

  return (
    <div className="relative">
      <Input
        label={label}
        error={error}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
        className="pl-10 font-mono"
      />
      <span className="pointer-events-none absolute bottom-[9px] left-3 text-sm text-[#f0f0f5]/40">
        R$
      </span>
    </div>
  );
}
