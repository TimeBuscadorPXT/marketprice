import { useState } from 'react';
import { X, ExternalLink, ChevronLeft, ChevronRight, User, MapPin, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ListingDetailProps {
  listing: {
    id: string;
    title: string;
    price: number;
    region: string;
    capturedAt: string;
    fbUrl: string;
    condition: string | null;
    imageUrl: string | null;
    isDeepCaptured?: boolean;
    fullDescription?: string | null;
    photoUrls?: string[];
    sellerName?: string | null;
    sellerProfileUrl?: string | null;
    sellerJoinDate?: string | null;
    sellerLocation?: string | null;
  } | null;
  onClose: () => void;
}

export function ListingDetailModal({ listing, onClose }: ListingDetailProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!listing) return null;

  const photos = listing.photoUrls && listing.photoUrls.length > 0
    ? listing.photoUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : [];

  const hasMultiplePhotos = photos.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#12121a] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#12121a] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#f0f0f5]">Detalhes do Anúncio</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#f0f0f5]/50 hover:bg-white/[0.04] hover:text-[#f0f0f5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Photo carousel */}
          {photos.length > 0 && (
            <div className="relative overflow-hidden rounded-xl bg-black/20">
              <img
                src={photos[photoIndex]}
                alt={`Foto ${photoIndex + 1}`}
                className="w-full h-64 object-contain"
              />
              {hasMultiplePhotos && (
                <>
                  <button
                    onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
                    {photoIndex + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Title + Price */}
          <div>
            <h3 className="text-lg font-bold text-[#f0f0f5]">{listing.title}</h3>
            <p className="mt-1 font-mono text-2xl font-bold text-[#22c55e]">{formatCurrency(listing.price)}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#f0f0f5]/50">
              {listing.condition && <span className="rounded bg-white/[0.06] px-2 py-0.5">{listing.condition}</span>}
              <span className="rounded bg-white/[0.06] px-2 py-0.5">{listing.region}</span>
              <span className="rounded bg-white/[0.06] px-2 py-0.5">{formatDate(listing.capturedAt)}</span>
              {listing.isDeepCaptured && (
                <span className="rounded bg-[#22c55e]/10 px-2 py-0.5 text-[#22c55e]">📸 Captura completa</span>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="mb-2 text-xs font-medium text-[#f0f0f5]/50">Descrição</p>
            {listing.fullDescription ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#f0f0f5]/80">{listing.fullDescription}</p>
            ) : (
              <p className="text-sm text-[#f0f0f5]/30 italic">
                {listing.isDeepCaptured
                  ? 'Nenhuma descrição disponível neste anúncio.'
                  : 'Abra o anúncio no Marketplace para capturar a descrição completa.'}
              </p>
            )}
          </div>

          {/* Seller info */}
          {(listing.sellerName || listing.sellerProfileUrl || listing.sellerJoinDate || listing.sellerLocation) && (
            <div className="rounded-xl border border-white/[0.06] p-4">
              <p className="mb-3 text-xs font-medium text-[#f0f0f5]/50">Vendedor</p>
              <div className="space-y-2 text-sm">
                {listing.sellerName && (
                  <div className="flex items-center gap-2 text-[#f0f0f5]/80">
                    <User className="h-3.5 w-3.5 text-[#f0f0f5]/40" />
                    {listing.sellerProfileUrl ? (
                      <a href={listing.sellerProfileUrl} target="_blank" rel="noopener noreferrer" className="text-[#22c55e] hover:underline">
                        {listing.sellerName}
                      </a>
                    ) : (
                      <span>{listing.sellerName}</span>
                    )}
                  </div>
                )}
                {listing.sellerJoinDate && (
                  <div className="flex items-center gap-2 text-[#f0f0f5]/60">
                    <Calendar className="h-3.5 w-3.5 text-[#f0f0f5]/40" />
                    <span>{listing.sellerJoinDate}</span>
                  </div>
                )}
                {listing.sellerLocation && (
                  <div className="flex items-center gap-2 text-[#f0f0f5]/60">
                    <MapPin className="h-3.5 w-3.5 text-[#f0f0f5]/40" />
                    <span>{listing.sellerLocation}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href={listing.fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#16a34a]"
            >
              <ExternalLink className="h-4 w-4" />
              Ver no Marketplace
            </a>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/[0.06] px-4 py-2.5 text-sm font-medium text-[#f0f0f5]/70 hover:bg-white/[0.04]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
