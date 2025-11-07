// Tipos para o sistema de controle de estoque

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category?: string;
  fragrance?: string;
  weight?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  saleDate: Date;
  notes?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  orderDate: Date;
  expectedDeliveryDate: Date;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  notes?: string;
}
