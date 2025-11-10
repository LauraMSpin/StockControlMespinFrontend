import api from './api';
import { CategoryPrice } from '@/types';

export const categoryPriceService = {
  // Listar todos os preços de categoria
  getAll: async (): Promise<CategoryPrice[]> => {
    return api.get<CategoryPrice[]>('/CategoryPrices');
  },

  // Obter um preço de categoria por ID
  getById: async (id: string): Promise<CategoryPrice> => {
    return api.get<CategoryPrice>(`/CategoryPrices/${id}`);
  },

  // Obter preço por nome da categoria
  getByName: async (categoryName: string): Promise<CategoryPrice> => {
    return api.get<CategoryPrice>(`/CategoryPrices/name/${categoryName}`);
  },

  // Criar preço de categoria
  create: async (categoryPrice: Omit<CategoryPrice, 'id' | 'createdAt' | 'updatedAt'>): Promise<CategoryPrice> => {
    return api.post<CategoryPrice>('/CategoryPrices', categoryPrice);
  },

  // Atualizar preço de categoria
  update: async (id: string, categoryPrice: Partial<CategoryPrice>): Promise<void> => {
    return api.put<void>(`/CategoryPrices/${id}`, categoryPrice);
  },

  // Deletar preço de categoria
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/CategoryPrices/${id}`);
  },

  // Aplicar preço de categoria a produtos
  applyToProducts: async (categoryName: string, price: number): Promise<{ updated: number }> => {
    return api.post<{ updated: number }>(`/CategoryPrices/apply`, { categoryName, price });
  },
};

export default categoryPriceService;
