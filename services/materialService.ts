import api from './api';
import { Material } from '@/types';

export const materialService = {
  // Listar todos os materiais
  getAll: async (): Promise<Material[]> => {
    return api.get<Material[]>('/Materials');
  },

  // Obter um material por ID
  getById: async (id: string): Promise<Material> => {
    return api.get<Material>(`/Materials/${id}`);
  },

  // Obter materiais com estoque baixo
  getLowStock: async (): Promise<Material[]> => {
    return api.get<Material[]>('/Materials/low-stock');
  },

  // Obter materiais por categoria
  getByCategory: async (category: string): Promise<Material[]> => {
    return api.get<Material[]>(`/Materials/category/${category}`);
  },

  // Criar material
  create: async (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<Material> => {
    return api.post<Material>('/Materials', material);
  },

  // Atualizar material
  update: async (id: string, material: Partial<Material>): Promise<void> => {
    return api.put<void>(`/Materials/${id}`, material);
  },

  // Deletar material
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Materials/${id}`);
  },

  // Atualizar estoque
  updateStock: async (id: string, quantity: number): Promise<{ id: string; name: string; currentStock: number }> => {
    return api.post<{ id: string; name: string; currentStock: number }>(`/Materials/${id}/update-stock`, { quantity });
  },
};

export default materialService;
