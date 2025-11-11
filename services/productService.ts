import api from './api';
import { Product } from '@/types';
import { UpdateProductDto } from '@/types/dtos';

export const productService = {
  // Listar todos os produtos
  getAll: async (): Promise<Product[]> => {
    return api.get<Product[]>('/Products');
  },

  // Obter um produto por ID
  getById: async (id: string): Promise<Product> => {
    return api.get<Product>(`/Products/${id}`);
  },

  // Obter produtos com estoque baixo
  getLowStock: async (): Promise<Product[]> => {
    return api.get<Product[]>('/Products/low-stock');
  },

  // Obter produtos por categoria
  getByCategory: async (category: string): Promise<Product[]> => {
    return api.get<Product[]>(`/Products/category/${category}`);
  },

  // Criar produto
  create: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    return api.post<Product>('/Products', product);
  },

  // Atualizar produto
  update: async (id: string, productDto: UpdateProductDto): Promise<void> => {
    return api.put<void>(`/Products/${id}`, productDto);
  },

  // Deletar produto
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/Products/${id}`);
  },

  // Atualizar estoque
  updateStock: async (id: string, quantity: number): Promise<{ id: string; name: string; quantity: number }> => {
    return api.post<{ id: string; name: string; quantity: number }>(`/Products/${id}/update-stock`, quantity);
  },
};

export default productService;
