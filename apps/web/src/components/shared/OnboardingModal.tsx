import { useState } from 'react';
import {
  Download,
  Search,
  BarChart3,
  Chrome,
  MapPin,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Puzzle,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const REGIONS = [
  'SC', 'PR', 'RS', 'SP', 'RJ', 'MG', 'BA', 'GO', 'DF', 'PE',
  'CE', 'PA', 'MA', 'MT', 'MS', 'ES', 'PB', 'RN', 'AL', 'SE',
  'PI', 'RO', 'TO', 'AC', 'AM', 'RR', 'AP',
];

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [region, setRegion] = useState(user?.region || '');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const totalSteps = 5;

  async function handleFinish() {
    setSaving(true);
    try {
      await completeOnboarding(region || undefined);
      onClose();
    } catch {
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5">
              <Rocket className="h-10 w-10 text-[#22c55e]" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#f0f0f5]">
              Bem-vindo ao MarketPrice! 🎉
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[#f0f0f5]/60">
              Vamos configurar tudo em <span className="font-semibold text-[#22c55e]">menos de 2 minutos</span> para você
              começar a encontrar as melhores oportunidades de revenda.
            </p>
            <div className="space-y-3 text-left">
              {[
                { icon: Puzzle, text: 'Instalar a extensão Chrome' },
                { icon: Globe, text: 'Escolher sua região' },
                { icon: TrendingUp, text: 'Capturar seus primeiros preços' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/10 text-sm font-bold text-[#22c55e]">
                    {i + 1}
                  </div>
                  <Icon className="h-4 w-4 shrink-0 text-[#f0f0f5]/40" />
                  <span className="text-sm text-[#f0f0f5]/80">{text}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
              <Chrome className="h-10 w-10 text-blue-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#f0f0f5]">
              Instale a Extensão Chrome
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[#f0f0f5]/60">
              A extensão captura automaticamente os preços enquanto você navega no Facebook Marketplace.
              <span className="block mt-1 font-medium text-[#f0f0f5]/80">Sem ela, o sistema não consegue coletar dados.</span>
            </p>

            <div className="mb-6 space-y-3 text-left">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#f0f0f5]/80">Como instalar:</h3>
                <ol className="space-y-3">
                  {[
                    'Abra o Chrome e acesse chrome://extensions',
                    'Ative o "Modo do desenvolvedor" (canto superior direito)',
                    'Clique em "Carregar sem compactação"',
                    'Selecione a pasta da extensão MarketPrice',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/10 text-xs font-bold text-[#22c55e]">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#f0f0f5]/70">{text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3">
              <p className="text-xs text-[#22c55e]/80">
                💡 <span className="font-medium">Dica:</span> Fixe a extensão na barra do Chrome para fácil acesso.
                Clique no ícone de quebra-cabeça → MarketPrice → Fixar.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5">
              <MapPin className="h-10 w-10 text-purple-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#f0f0f5]">
              Sua Região
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[#f0f0f5]/60">
              Selecione seu estado para ver preços e oportunidades da sua região.
              Você pode alterar depois nas configurações.
            </p>

            <div className="mb-4">
              <div className="grid grid-cols-5 gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      region === r
                        ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                        : 'border-white/[0.06] text-[#f0f0f5]/50 hover:border-white/[0.12] hover:text-[#f0f0f5]/80'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {region && (
              <div className="rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3">
                <p className="text-sm text-[#22c55e]">
                  <CheckCircle2 className="mb-0.5 mr-1 inline h-4 w-4" />
                  Região selecionada: <span className="font-bold">{region}</span>
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
              <Search className="h-10 w-10 text-orange-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-[#f0f0f5]">
              Como Capturar Preços
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[#f0f0f5]/60">
              Com a extensão instalada, basta navegar normalmente no Facebook Marketplace.
            </p>

            <div className="space-y-4 text-left">
              {[
                {
                  icon: Globe,
                  title: 'Abra o Facebook Marketplace',
                  desc: 'Acesse facebook.com/marketplace e pesquise por celulares',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                },
                {
                  icon: Search,
                  title: 'Navegue pelos resultados',
                  desc: 'A extensão detecta e captura os preços automaticamente enquanto você rola a página',
                  color: 'text-orange-400',
                  bg: 'bg-orange-500/10',
                },
                {
                  icon: Download,
                  title: 'Dados enviados ao dashboard',
                  desc: 'Os preços são enviados em lotes para o MarketPrice — você não precisa fazer nada',
                  color: 'text-green-400',
                  bg: 'bg-green-500/10',
                },
                {
                  icon: BarChart3,
                  title: 'Analise e encontre oportunidades',
                  desc: 'Volte aqui para ver médias, tendências e as melhores oportunidades de revenda',
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10',
                },
              ].map(({ icon: Icon, title, desc, color, bg }, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#f0f0f5]">{title}</h4>
                    <p className="text-xs text-[#f0f0f5]/50">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5">
              <CheckCircle2 className="h-10 w-10 text-[#22c55e]" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-[#f0f0f5]">
              Tudo Pronto! 🚀
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-[#f0f0f5]/60">
              Sua conta está configurada. Agora é só instalar a extensão, navegar no Marketplace
              e acompanhar tudo pelo dashboard.
            </p>

            <div className="space-y-3 text-left">
              {[
                { icon: Puzzle, label: 'Extensão Chrome', desc: 'Instale para capturar preços', done: false },
                { icon: MapPin, label: `Região: ${region || 'Não definida'}`, desc: region ? 'Configurada com sucesso' : 'Você pode definir depois', done: !!region },
                { icon: BarChart3, label: 'Dashboard', desc: 'Pronto para receber dados', done: true },
              ].map(({ icon: Icon, label, desc, done }, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-[#22c55e]/10' : 'bg-yellow-500/10'}`}>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                    ) : (
                      <Icon className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#f0f0f5]/80">{label}</span>
                    <p className="text-xs text-[#f0f0f5]/40">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 mx-4 flex w-full max-w-lg flex-col rounded-2xl border border-white/[0.06] bg-[#12121a] shadow-2xl">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-[#22c55e]' : 'bg-[#f0f0f5]/10'
              }`}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="px-6 pt-3">
          <span className="text-xs text-[#f0f0f5]/30">
            {step + 1} de {totalSteps}
          </span>
        </div>

        {/* Content */}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-transparent px-4 py-2.5 text-sm font-medium text-[#f0f0f5]/70 transition-colors hover:bg-white/[0.04]"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="text-sm text-[#f0f0f5]/30 transition-colors hover:text-[#f0f0f5]/60"
            >
              Pular
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a]"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Começar a usar'}
              {!saving && <Rocket className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
