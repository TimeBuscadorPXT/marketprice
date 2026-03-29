import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Flame,
  Search,
  ExternalLink,
  TrendingUp,
  Percent,
  Trophy,
  Smartphone,
  MapPin,
  Clock,
  User,
  Brain,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  FileText,
  Image,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth } from '@/contexts/AuthContext';
import { getDeals, type Deal } from '@/services/deals';
import { analyzeDeal, type DealVerdict } from '@/services/ai';
import { getAvailableRegions } from '@/services/prices';
import { getCategories, type CategoryConfig } from '@/services/categories';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTip } from '@/components/ui/HelpTip';

const HEAT_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'hot', label: '🔥 Quentes' },
  { value: 'warm', label: '⭐ Boas' },
  { value: 'moderate', label: '💡 Moderadas' },
] as const;

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'compra_revenda', label: 'Compra/Revenda' },
  { value: 'liquidacao', label: 'Liquidação' },
  { value: 'recem_publicado', label: 'Recém Publicado' },
] as const;

const DISCOUNT_OPTIONS = [
  { value: '0', label: 'Qualquer' },
  { value: '10', label: '10%+' },
  { value: '15', label: '15%+' },
  { value: '20', label: '20%+' },
  { value: '30', label: '30%+' },
] as const;

const SCORE_OPTIONS = [
  { value: '0', label: 'Todos' },
  { value: '25', label: '25+' },
  { value: '50', label: '50+' },
  { value: '75', label: '75+' },
] as const;

const heatStyles = {
  hot: {
    border: 'border-l-4 border-l-orange-500',
    glow: 'deal-card-hot',
    badgeBg: 'bg-orange-500/15 text-orange-400 badge-pulse',
    badgeLabel: '🔥 QUENTE',
    scoreColor: 'bg-orange-500',
    scoreLabel: 'Quente',
  },
  warm: {
    border: 'border-l-[3px] border-l-[#22c55e]',
    glow: '',
    badgeBg: 'bg-[#22c55e]/10 text-[#22c55e]',
    badgeLabel: '⭐ BOA',
    scoreColor: 'bg-[#22c55e]',
    scoreLabel: 'Boa',
  },
  moderate: {
    border: 'border-l-2 border-l-[#f0f0f5]/20',
    glow: '',
    badgeBg: 'bg-white/[0.06] text-[#f0f0f5]/50',
    badgeLabel: '💡 MODERADA',
    scoreColor: 'bg-[#f0f0f5]/30',
    scoreLabel: 'Moderada',
  },
};

function formatPercentBR(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function ScoreBar({ score, heat }: { score: number; heat: Deal['heat'] }) {
  const style = heatStyles[heat];
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(score, 100)), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`score-bar-fill h-full rounded-full ${style.scoreColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-xs font-bold text-[#f0f0f5]">{Math.round(score)}</span>
        <span className="text-[10px] text-[#f0f0f5]/40">{style.scoreLabel}</span>
      </div>
    </div>
  );
}

function cleanDescriptionText(raw: string): string {
  return raw
    .replace(/Envie uma mensagem ao vendedor.*?Enviar/gs, '')
    .replace(/Olá, esse item ainda está disponível\?/g, '')
    .replace(/Enviar mensagem/g, '')
    .replace(/Salvar|Compartilhar/g, '')
    .replace(/Patrocinado\s*.*/gs, '')
    .replace(/Sele[çc][õo]es de hoje.*/gs, '')
    .replace(/A localiza[çc][ãa]o [ée] aproximada/gi, '')
    .replace(/Informa[çc][õo]es do vendedor.*/gs, '')
    .replace(/Detalhes do vendedor.*/gs, '')
    .replace(/Entrou no Facebook.*/g, '')
    .replace(/Em estoque/g, '')
    .replace(/Anunciado em .{3,50}\n?/g, '')
    // Remove leaked "other listings" block (starts with prices from other items)
    .replace(/R\$[\d.,]+\s*[A-Z].{5,}$/gs, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function DealDetailModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  // Only trust photoUrls if count is reasonable (real listings have 1-10 photos).
  // Legacy data has garbage URLs from the old scraper — fall back to imageUrl.
  const hasCleanPhotos = deal.photoUrls && deal.photoUrls.length > 0 && deal.photoUrls.length <= 10;
  const photos = hasCleanPhotos ? deal.photoUrls! : deal.imageUrl ? [deal.imageUrl] : [];
  const style = heatStyles[deal.heat];
  const estimatedProfit = deal.averagePrice - deal.price;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && currentPhoto > 0) setCurrentPhoto(p => p - 1);
    if (e.key === 'ArrowRight' && currentPhoto < photos.length - 1) setCurrentPhoto(p => p + 1);
  }, [onClose, currentPhoto, photos.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0e0e14]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0e0e14]/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badgeBg}`}>
              {style.badgeLabel}
            </span>
            <span className="text-sm font-semibold text-[#f0f0f5]">
              {deal.model.brand} {deal.model.name} {deal.model.variant}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#f0f0f5]/40 transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photos */}
        {photos.length > 0 ? (
          <div className="relative bg-black/30">
            <img
              src={photos[currentPhoto]}
              alt={`Foto ${currentPhoto + 1}`}
              className="mx-auto h-72 w-full object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentPhoto(p => Math.max(0, p - 1))}
                  disabled={currentPhoto === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-opacity disabled:opacity-20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPhoto(p => Math.min(photos.length - 1, p + 1))}
                  disabled={currentPhoto === photos.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-opacity disabled:opacity-20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPhoto(i)}
                      className={`h-1.5 rounded-full transition-all ${i === currentPhoto ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                  ))}
                </div>
              </>
            )}
            {photos.length > 1 && (
              <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-medium text-white/80">
                <Image className="mr-1 inline h-3 w-3" />
                {currentPhoto + 1}/{photos.length}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-white/[0.02]">
            <Smartphone className="h-16 w-16 text-[#f0f0f5]/10" />
          </div>
        )}

        {/* Photo thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-5 py-3">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setCurrentPhoto(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === currentPhoto ? 'border-[#22c55e]' : 'border-transparent opacity-50 hover:opacity-80'}`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-5 p-5">
          {/* Price block */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#f0f0f5]/40">Preço do anúncio</p>
              <p className="font-mono text-2xl font-[800] text-[#22c55e]">{formatCurrency(deal.price)}</p>
              <p className="mt-0.5 font-mono text-xs text-[#f0f0f5]/30 line-through">{formatCurrency(deal.averagePrice)} média</p>
            </div>
            <div className="text-right">
              <span className="rounded-lg bg-[#22c55e]/15 px-3 py-1.5 font-mono text-lg font-bold text-[#22c55e]">
                -{Math.round(deal.discount)}%
              </span>
              <p className="mt-2 text-[11px] text-[#f0f0f5]/40">Lucro estimado</p>
              <p className="font-mono text-lg font-bold text-[#22c55e]">{formatCurrency(Math.max(0, estimatedProfit))}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-[#60a5fa]" />
              <div>
                <p className="text-[10px] text-[#f0f0f5]/40">Localização</p>
                <p className="text-xs font-medium text-[#f0f0f5]">{deal.sellerLocation || deal.region}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
              <Clock className="h-4 w-4 shrink-0 text-[#fbbf24]" />
              <div>
                <p className="text-[10px] text-[#f0f0f5]/40">Tempo no mercado</p>
                <p className="text-xs font-medium text-[#f0f0f5]">
                  {deal.daysOnMarket === null ? 'Desconhecido' : deal.daysOnMarket === 0 ? 'Publicado hoje' : `${deal.daysOnMarket} dias`}
                </p>
              </div>
            </div>
            {deal.sellerName && (
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
                <User className="h-4 w-4 shrink-0 text-[#a78bfa]" />
                <div>
                  <p className="text-[10px] text-[#f0f0f5]/40">Vendedor</p>
                  <p className="text-xs font-medium text-[#f0f0f5]">{deal.sellerName}</p>
                  {deal.sellerJoinDate && (
                    <p className="text-[10px] text-[#f0f0f5]/30">Desde {deal.sellerJoinDate}</p>
                  )}
                </div>
              </div>
            )}
            {deal.condition && (
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2.5">
                <Tag className="h-4 w-4 shrink-0 text-[#22c55e]" />
                <div>
                  <p className="text-[10px] text-[#f0f0f5]/40">Condição</p>
                  <p className="text-xs font-medium text-[#f0f0f5]">{deal.condition}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {deal.description && cleanDescriptionText(deal.description) && (
            <div className="rounded-xl bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#f0f0f5]/40" />
                <p className="text-xs font-medium text-[#f0f0f5]/60">Descrição do anúncio</p>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#f0f0f5]/80">{cleanDescriptionText(deal.description)}</p>
            </div>
          )}

          {/* Flags */}
          {((deal.redFlags && deal.redFlags.length > 0) || (deal.greenFlags && deal.greenFlags.length > 0)) && (
            <div className="flex flex-wrap gap-2">
              {deal.greenFlags?.map((flag, i) => (
                <span key={`g-${i}`} className="rounded-lg bg-[#22c55e]/10 px-2.5 py-1 text-xs text-[#22c55e]">
                  ✅ {flag}
                </span>
              ))}
              {deal.redFlags?.map((flag, i) => (
                <span key={`r-${i}`} className="rounded-lg bg-[#f87171]/10 px-2.5 py-1 text-xs text-[#f87171]">
                  ⚠️ {flag}
                </span>
              ))}
            </div>
          )}

          {/* Score */}
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#f0f0f5]/40">Score da oportunidade</p>
            <ScoreBar score={deal.score} heat={deal.heat} />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={deal.fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a]"
            >
              <ExternalLink className="h-4 w-4" />
              Ver no Marketplace
            </a>
            {deal.sellerProfileUrl && (
              <a
                href={deal.sellerProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm font-medium text-[#f0f0f5]/60 transition-colors hover:bg-white/[0.04]"
              >
                <User className="h-4 w-4" />
                Perfil
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DealCard({
  deal,
  index,
  onAnalyze,
  isAnalyzing,
  verdict,
  onNavigate,
}: {
  deal: Deal;
  index: number;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  verdict?: DealVerdict;
  onNavigate: () => void;
}) {
  const style = heatStyles[deal.heat];
  const estimatedProfit = deal.averagePrice - deal.price;
  const marginPercent = deal.price > 0 ? (estimatedProfit / deal.price) * 100 : 0;
  const isDanger = deal.flagLevel === 'danger';
  const aiRec = deal.aiRecommendation || verdict?.verdict;

  return (
    <div
      className={`deal-card-enter relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#12121a] ${style.border} ${style.glow} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${isDanger ? 'opacity-60' : 'cursor-pointer'}`}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={isDanger ? undefined : onNavigate}
    >
      {/* Danger overlay */}
      {isDanger && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f87171]/5 backdrop-blur-[1px]">
          <span className="rounded-lg bg-[#f87171]/20 px-3 py-1.5 text-xs font-semibold text-[#f87171]">
            ⚠️ Problema detectado
          </span>
        </div>
      )}

      <div className="p-5">
        {/* Top: badges */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badgeBg}`}>
              {deal.heat === 'hot' && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-400" />
                </span>
              )}
              {style.badgeLabel}
            </span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#f0f0f5]/40">
              {deal.model.brand}
            </span>
          </div>
          <span className="rounded-lg bg-[#22c55e]/15 px-3 py-1.5 font-mono text-sm font-bold text-[#22c55e]">
            -{Math.round(deal.discount)}%
          </span>
        </div>

        {/* Body: 2-column layout */}
        <div className="flex gap-4">
          {/* Left column: model info */}
          <div className="min-w-0 flex-1">
            {/* Image or placeholder */}
            {deal.imageUrl ? (
              <div className="mb-3 h-28 w-full overflow-hidden rounded-lg bg-black/20">
                <img src={deal.imageUrl} alt={deal.title} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg bg-white/[0.03]">
                <Smartphone className="h-10 w-10 text-[#f0f0f5]/10" />
              </div>
            )}

            <h3 className="text-sm font-semibold text-[#f0f0f5]">
              {deal.model.name} {deal.model.variant}
            </h3>

            {/* Meta info */}
            <div className="mt-2 space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] text-[#f0f0f5]/40">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{deal.region}</span>
                {deal.daysOnMarket != null && (
                  <>
                    <span className="text-[#f0f0f5]/20">•</span>
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{deal.daysOnMarket === 0 ? 'Hoje' : `${deal.daysOnMarket}d`}</span>
                  </>
                )}
              </p>
              {deal.sellerName && (
                <p className="flex items-center gap-1.5 text-[11px] text-[#f0f0f5]/40">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{deal.sellerName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right column: pricing */}
          <div className="flex w-32 shrink-0 flex-col items-end text-right">
            <p className="font-mono text-xl font-[800] text-[#22c55e]">
              {formatCurrency(deal.price)}
            </p>
            <p className="font-mono text-xs text-[#f0f0f5]/30 line-through">
              {formatCurrency(deal.averagePrice)}
            </p>

            <div className="my-2 h-px w-full bg-white/[0.06]" />

            <p className="text-[10px] font-medium uppercase tracking-wide text-[#f0f0f5]/40">
              💰 Lucro estimado
            </p>
            <p className="font-mono text-lg font-bold text-[#22c55e]">
              {formatCurrency(Math.max(0, estimatedProfit))}
            </p>
            <span className="mt-1 inline-flex rounded bg-[#22c55e]/10 px-2 py-0.5 font-mono text-[10px] font-medium text-[#22c55e]">
              📊 {formatPercentBR(marginPercent)} margem
            </span>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4">
          <ScoreBar score={deal.score} heat={deal.heat} />
        </div>

        {/* Flags */}
        {((deal.redFlags && deal.redFlags.length > 0) || (deal.greenFlags && deal.greenFlags.length > 0) || deal.isDeepCaptured) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {deal.isDeepCaptured && (
              <span className="inline-flex items-center gap-1 rounded bg-[#60a5fa]/10 px-1.5 py-0.5 text-[10px] text-[#60a5fa]">
                <Camera className="h-2.5 w-2.5" /> Detalhes completos
              </span>
            )}
            {deal.greenFlags?.map((flag, i) => (
              <span key={`g-${i}`} className="rounded bg-[#22c55e]/10 px-1.5 py-0.5 text-[10px] text-[#22c55e]">
                ✅ {flag}
              </span>
            ))}
            {deal.redFlags?.map((flag, i) => (
              <span key={`r-${i}`} className="rounded bg-[#f87171]/10 px-1.5 py-0.5 text-[10px] text-[#f87171]">
                ⚠️ {flag}
              </span>
            ))}
          </div>
        )}

        {/* AI verdict + reason */}
        {aiRec && (
          <div className="mt-3 flex items-center gap-2">
            {aiRec === 'comprar' && <Badge variant="success">✅ IA: Comprar</Badge>}
            {(aiRec === 'avaliar' || aiRec === 'avaliar_pessoalmente') && <Badge variant="warning">⚠️ IA: Avaliar</Badge>}
            {aiRec === 'evitar' && <Badge variant="danger">❌ IA: Evitar</Badge>}
            {verdict?.reason && (
              <span className="text-[10px] text-[#f0f0f5]/40 truncate">{verdict.reason}</span>
            )}
          </div>
        )}

        {/* Footer: buttons */}
        <div className="mt-4 flex items-center gap-2">
          <a
            href={deal.fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#22c55e] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#16a34a]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver no Marketplace
          </a>
          {!aiRec && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze();
              }}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-[#f0f0f5]/60 transition-colors hover:bg-white/[0.04] disabled:opacity-40"
            >
              <Brain className="h-3.5 w-3.5" />
              Analisar
            </button>
          )}
        </div>

        {/* Reason text */}
        <p className="mt-2 text-[11px] text-[#f0f0f5]/40">{deal.reason}</p>
      </div>
    </div>
  );
}

export default function Deals() {
  useDocumentTitle('Oportunidades');
  const { user } = useAuth();

  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('phone');
  const [brand, setBrand] = useState('');
  const [heat, setHeat] = useState('');
  const [type, setType] = useState('');
  const [minDiscount, setMinDiscount] = useState('0');
  const [minScore, setMinScore] = useState('0');
  const [onlyClean, setOnlyClean] = useState(false);
  const [verdicts, setVerdicts] = useState<Record<string, DealVerdict>>({});
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: (dealId: string) => analyzeDeal(dealId),
    onSuccess: (data, dealId) => {
      setVerdicts((prev) => ({ ...prev, [dealId]: data }));
    },
  });

  const { data: regions } = useQuery<string[]>({
    queryKey: ['regions'],
    queryFn: getAvailableRegions,
  });

  const { data: categories } = useQuery<CategoryConfig[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  const currentCategory = categories?.find(c => c.id === category);
  const categoryBrands = currentCategory?.brands ?? [];

  const effectiveRegion =
    region ||
    (user?.region && regions?.includes(user.region) ? user.region : '') ||
    (regions && regions.length > 0 ? regions[0] : '');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['deals', effectiveRegion, category, brand, heat, type, minScore],
    queryFn: () =>
      getDeals(effectiveRegion, {
        category: category || undefined,
        brand: brand || undefined,
        heat: heat || undefined,
        type: type || undefined,
        minScore: Number(minScore) || undefined,
      }),
    enabled: !!effectiveRegion,
    refetchInterval: 60000,
  });

  const summary = data?.summary;
  const allDeals = data?.deals ?? [];
  const deals = allDeals
    .filter((d) => !onlyClean || (d.flagLevel !== 'danger' && d.flagLevel !== 'warning'))
    .filter((d) => d.discount >= Number(minDiscount));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card hover>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#60a5fa]/10">
              <TrendingUp className="h-5 w-5 text-[#60a5fa]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]/50">Total de Oportunidades</p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-[#f0f0f5]">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (summary?.total ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${(summary?.hot ?? 0) > 0 ? 'bg-orange-500/10' : 'bg-white/[0.04]'}`}>
              <Flame className={`h-5 w-5 ${(summary?.hot ?? 0) > 0 ? 'text-orange-400 animate-pulse' : 'text-[#f0f0f5]/20'}`} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]/50">Deals Quentes 🔥</p>
              <p className={`mt-0.5 font-mono text-2xl font-bold ${(summary?.hot ?? 0) > 0 ? 'text-orange-400' : 'text-[#f0f0f5]/30'}`}>
                {isLoading ? <Skeleton className="h-8 w-16" /> : (summary?.hot ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#22c55e]/10">
              <Percent className="h-5 w-5 text-[#22c55e]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]/50">Desconto Médio</p>
              <p className="mt-0.5 font-mono text-2xl font-bold text-[#22c55e]">
                {isLoading ? <Skeleton className="h-8 w-16" /> : formatPercentBR(summary?.avgDiscount ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fbbf24]/10">
              <Trophy className="h-5 w-5 text-[#fbbf24]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#f0f0f5]/50">Melhor Oportunidade</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-32" />
              ) : summary?.bestDeal ? (
                <div className="mt-0.5">
                  <p className="text-sm font-semibold text-[#f0f0f5] truncate">
                    {summary.bestDeal.model.name} {summary.bestDeal.model.variant}
                  </p>
                  <p className="flex items-center gap-2 text-xs">
                    <span className="text-[#22c55e]">-{Math.round(summary.bestDeal.discount)}%</span>
                    <span className="text-[#f0f0f5]/30">•</span>
                    <span className="text-[#22c55e]">
                      💰 {formatCurrency(summary.bestDeal.averagePrice - summary.bestDeal.price)}
                    </span>
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-[#f0f0f5]/30">—</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[140px]">
          <Select label="Categoria" value={category} onChange={(e) => { setCategory(e.target.value); setBrand(''); }}>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Select label="Região" value={region || effectiveRegion} onChange={(e) => setRegion(e.target.value)}>
            {regions?.map((r) => <option key={r} value={r}>{r}</option>)}
            {(!regions || regions.length === 0) && <option value="">Carregando regiões...</option>}
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Select label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">Todas</option>
            {categoryBrands.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Select label="Temperatura" value={heat} onChange={(e) => setHeat(e.target.value)}>
            {HEAT_OPTIONS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <Select label="Desconto mínimo" value={minDiscount} onChange={(e) => setMinDiscount(e.target.value)}>
            {DISCOUNT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <Select label="Score mínimo" value={minScore} onChange={(e) => setMinScore(e.target.value)}>
            {SCORE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
      </Card>

      {/* Clean filter checkbox */}
      <label className="flex items-center gap-2 text-sm text-[#f0f0f5]/60 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={onlyClean}
          onChange={(e) => setOnlyClean(e.target.checked)}
          className="h-4 w-4 rounded border-white/[0.12] bg-[#12121a] accent-[#22c55e]"
        />
        Mostrar apenas anúncios limpos
        <HelpTip text="Oculta anúncios com problemas detectados (tela trocada, bloqueado, etc.)" />
      </label>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="flex gap-2 mb-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
              <Skeleton className="mb-2 h-28 w-full rounded-lg" />
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-2 h-8 w-1/2" />
              <Skeleton className="mb-2 h-3 w-1/3" />
              <Skeleton className="h-2 w-full" />
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <EmptyState
          icon={Flame}
          title="Erro ao carregar oportunidades"
          description="Não foi possível carregar as oportunidades. Tente novamente."
        />
      )}

      {/* Empty */}
      {!isLoading && !isError && deals.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16">
          <Search className="mb-4 h-12 w-12 text-[#f0f0f5]/10" />
          <h3 className="mb-2 text-lg font-semibold text-[#f0f0f5]/60">
            Nenhuma oportunidade no momento
          </h3>
          <p className="max-w-md text-center text-sm text-[#f0f0f5]/30">
            Continue navegando pelo Marketplace — novas oportunidades aparecem a cada minuto! 🔍
          </p>
        </Card>
      )}

      {/* Deal cards grid */}
      {!isLoading && deals.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal, index) => (
            <DealCard
              key={deal.id}
              deal={deal}
              index={index}
              onAnalyze={() => analyzeMutation.mutate(deal.id)}
              isAnalyzing={analyzeMutation.isPending}
              verdict={verdicts[deal.id]}
              onNavigate={() => setSelectedDeal(deal)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedDeal && (
        <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </div>
  );
}
