// DTOs para envio de dados ao backend

export interface ProductionMaterialDto {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface PriceHistoryDto {
  price: number;
  date: Date;
  reason?: string;
}

export interface UpdateProductDto {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  category?: string;
  fragrance?: string;
  weight?: string;
  productionCost?: number;
  profitMargin?: number;
  productionMaterials?: ProductionMaterialDto[];
  priceHistories?: PriceHistoryDto[];
}
