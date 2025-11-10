import api from './api';
import { Order } from '@/types';

export const orderService = {
  // Listar todas as encomendas
  getAll: async (): Promise<Order[]> => {
    return api.get<Order[]>('/Orders');
  },

  // Obter uma encomenda por ID
  getById: async (id: string): Promise<Order> => {
    return api.get<Order>(`/Orders/${id}`);
  },

  // Obter encomendas por cliente
  getByCustomer: async (customerId: string): Promise<Order[]> => {
    return api.get<Order[]>(`/Orders/customer/${customerId}`);
  },

  // Obter encomendas pendentes
  getPending: async (): Promise<Order[]> => {
    return api.get<Order[]>('/Orders/pending');
  },

  // Criar encomenda
  create: async (order: Omit<Order, 'id'>): Promise<Order> => {
    return api.post<Order>('/Orders', order);
  },

  // Atualizar encomenda
  update: async (id: string, order: Partial<Order>): Promise<void> => {
    return api.put<void>(`/Orders/${id}`, order);
  },

  // Atualizar status da encomenda
  updateStatus: async (id: string, status: string, paymentMethod?: string): Promise<Order> => {
    return api.patch<Order>(`/Orders/${id}/status`, { status, paymentMethod });
  },

  // Deletar encomenda
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Orders/${id}`);
  },
};

export default orderService;
