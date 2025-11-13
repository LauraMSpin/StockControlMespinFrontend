import api from './api';
import { Sale } from '@/types';
import { CreateOrderDto, UpdateSaleDto } from '@/types/dtos';

export const saleService = {
  // Listar todas as vendas
  getAll: async (): Promise<Sale[]> => {
    return api.get<Sale[]>('/Sales');
  },

  // Obter uma venda por ID
  getById: async (id: string): Promise<Sale> => {
    return api.get<Sale>(`/Sales/${id}`);
  },

  // Obter vendas por cliente
  getByCustomer: async (customerId: string): Promise<Sale[]> => {
    return api.get<Sale[]>(`/Sales/customer/${customerId}`);
  },

  // Obter vendas do dia
  getToday: async (): Promise<Sale[]> => {
    return api.get<Sale[]>('/Sales/today');
  },

  // Obter vendas pendentes
  getPending: async (): Promise<Sale[]> => {
    return api.get<Sale[]>('/Sales/pending');
  },

  // Criar venda
  create: async (saleDto: CreateOrderDto): Promise<Sale> => {
    return api.post<Sale>('/Sales', saleDto);
  },

  // Atualizar venda
  update: async (id: string, saleDto: UpdateSaleDto): Promise<void> => {
    return api.put<void>(`/Sales/${id}`, saleDto);
  },

  // Atualizar status da venda
  updateStatus: async (id: string, status: string, paymentMethod?: 'Cash' | 'Pix' | 'Debit' | 'Credit'): Promise<Sale> => {
    return api.patch<Sale>(`/Sales/${id}/status`, { status, paymentMethod });
  },

  // Deletar venda
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Sales/${id}`);
  },
};

export default saleService;
