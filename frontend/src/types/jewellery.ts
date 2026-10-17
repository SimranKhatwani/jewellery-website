export type JewelleryCategory = 'rings' | 'anklets' | string;

export interface ProductSpecification {
  purity: string; // e.g. "Solid 925 Sterling Silver"
  hallmark: string; // e.g. "Laser-engraved 925 authenticity hallmark"
  finish: string; // e.g. "Mirror polished with fine brushed satin facets"
  weight: string; // e.g. "8.4 grams"
  dimensions: string; // e.g. "Band width 7.5mm; thickness 2.4mm"
  hypoallergenic: string; // e.g. "100% Nickel-free & cadmium-free"
  protection: string; // e.g. "Protective rhodium barrier for lasting brilliance"
}

export interface ProductOption {
  type: 'size' | 'length';
  name: string;
  values: string[];
  default: string;
}

export interface Product {
  id: string;
  _id?: string;
  slug: string;
  name: string;
  category: JewelleryCategory;
  priceUSD: number;
  subtitle: string;
  description: string;
  editorialQuote?: string;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
  inStock: boolean;
  sku: string;
  primaryImage: string;
  secondaryImage?: string;
  detailImage?: string;
  lifestyleImage?: string;
  options: ProductOption;
  finishes: string[];
  specifications: ProductSpecification;
  careInstructions: string[];
  stockistInquiryAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}
