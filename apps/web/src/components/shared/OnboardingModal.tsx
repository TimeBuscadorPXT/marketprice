import { useState } from 'react';
import { Download, Search, BarChart3 } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Download,
    title: 'Instale a extensão Chrome',
    text: 'Baixe a extensão MarketPrice para capturar preços automaticamente do Facebook Marketplace.',
  },
  {
    icon: Search,
    title: 'Navegue pelo Marketplace',
    text: 'Pesquise por celulares normalmente. A extensão captura os preços enquanto você navega.',
  },
  {
    icon: BarChart3,
    title: 'Veja seus dados aqui',
    text: 'Volte ao dashboard para ver médias, tendências e calcular seu lucro.',
  },
] as const;

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  function handleClose() {
    localStorage.setItem('mp_onboarding_done', 'true');
    setStep(0);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />

      {/* Card */}
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#12121a] p-8 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e]/10">
          <Icon className="h-8 w-8 text-[#22c55e]" />
        </div>

        {/* Content */}
        <h2 className="mb-2 text-center text-lg font-bold text-[#f0f0f5]">
          {current.title}
        </h2>
        <p className="mb-8 text-center text-sm leading-relaxed text-[#f0f0f5]/60">
          {current.text}
        </p>

        {/* Step dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? 'bg-[#22c55e]' : 'bg-[#f0f0f5]/20'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3">
          {!isFirst ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-white/[0.06] bg-transparent px-4 py-2 text-sm font-medium text-[#f0f0f5]/70 transition-colors hover:bg-white/[0.04]"
            >
              Voltar
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-[#22c55e] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a]"
            >
              Fechar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-lg bg-[#22c55e] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a]"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
