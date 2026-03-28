export type ListingStatus = 'active' | 'sold' | 'expired' | 'removed';
export type ListingSource = 'facebook_marketplace' | 'manual';

/** Anuncio capturado do marketplace */
export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  imageUrls: string[];
  sellerName: string;
  sellerProfileUrl: string;
  location: string;
  listingUrl: string;
  source: ListingSource;
  status: ListingStatus;
  modelId: string | null;
  capturedAt: string;
  updatedAt: string;
}
