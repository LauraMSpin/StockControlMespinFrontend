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

export interface SaleItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateOrderDto {
  customerId: string;
  customerName: string;
  items: SaleItemDto[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number;
  saleDate: Date;
  status: string;
  notes?: string;
}

export interface UpdateSaleDto {
  customerId: string;
  customerName: string;
  items: SaleItemDto[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalAmount: number;
  saleDate: Date;
  status: string;
  paymentMethod?: string;
  notes?: string;
}

export interface OrderDto {
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  orderDate: Date;
  expectedDeliveryDate: Date;
  deliveredDate?: Date;
  status: string;
  paymentMethod?: string;
  notes?: string;
}
