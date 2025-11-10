'use client';

import { useState, useEffect } from 'react';
import { CategoryPrice } from '@/types';
import { categoryPriceStorage, productStorage } from '@/lib/storage';

export default function CategoryPricesPage() {
  const [categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<CategoryPrice | null>(null);
  const [formData, setFormData] = useState({
    categoryName: '',
    price: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCategoryPrices(categoryPriceStorage.getAll());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(formData.price);
    
    if (price < 0) {
      alert('O preço não pode ser negativo!');
      return;
    }

    // Verificar se já existe uma categoria com o mesmo nome (exceto se estiver editando)
    const existingCategory = categoryPrices.find(
      cp => cp.categoryName.toLowerCase() === formData.categoryName.toLowerCase() && 
      (!editingPrice || cp.id !== editingPrice.id)
    );

    if (existingCategory) {
      alert('Já existe um preço definido para esta categoria!');
      return;
    }
    
    if (editingPrice) {
      // Verificar quantos produtos serão afetados
      const products = productStorage.getAll();
      const oldCategoryName = editingPrice.categoryName;
      const affectedProducts = products.filter(p => 
        p.category?.toLowerCase() === oldCategoryName.toLowerCase()
      );
      
      // Confirmar atualização se houver produtos afetados
      if (affectedProducts.length > 0) {
        const confirmUpdate = confirm(
          `Esta ação irá atualizar o preço de ${affectedProducts.length} produto(s) da categoria "${oldCategoryName}" para R$ ${price.toFixed(2)}.\n\n` +
          `Os produtos afetados são:\n${affectedProducts.map(p => `- ${p.name}`).slice(0, 5).join('\n')}` +
          `${affectedProducts.length > 5 ? `\n... e mais ${affectedProducts.length - 5} produto(s)` : ''}\n\n` +
          `Vendas já registradas NÃO serão alteradas.\n\nDeseja continuar?`
        );
        
        if (!confirmUpdate) {
          return;
        }
      }
      
      categoryPriceStorage.update(editingPrice.id, {
        categoryName: formData.categoryName,
        price: price,
      });
      
      // Atualizar preço de todos os produtos desta categoria
      affectedProducts.forEach(product => {
        productStorage.update(product.id, {
          price: price,
          priceChangeReason: `Atualização de categoria "${oldCategoryName}"`,
        } as any);
      });
      
      if (affectedProducts.length > 0) {
        alert(`✅ Preço atualizado com sucesso!\n\n${affectedProducts.length} produto(s) da categoria "${oldCategoryName}" foram atualizados para R$ ${price.toFixed(2)}.`);
      }
    } else {
      categoryPriceStorage.add({
        categoryName: formData.categoryName,
        price: price,
      });
    }

    resetForm();
    loadData();
    setShowModal(false);
  };

  const handleEdit = (categoryPrice: CategoryPrice) => {
    setEditingPrice(categoryPrice);
    setFormData({
      categoryName: categoryPrice.categoryName,
      price: categoryPrice.price.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este preço de categoria?')) {
      categoryPriceStorage.delete(id);
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      categoryName: '',
      price: '',
    });
    setEditingPrice(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#2C1810]">Preços por Categoria</h1>
          <p className="text-[#814923] mt-2">
            Defina preços padrão para cada tipo de produto
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#22452B] text-white px-6 py-3 rounded-lg hover:bg-[#2C5A38] transition-colors font-medium"
        >
          + Nova Categoria
        </button>
      </div>

      {categoryPrices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🏷️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhuma categoria cadastrada
          </h2>
          <p className="text-gray-500 mb-6">
            Comece definindo preços padrão para suas categorias de produtos
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#22452B] text-white px-6 py-2 rounded-lg hover:bg-[#2C5A38] transition-colors"
          >
            Adicionar Primeira Categoria
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Padrão
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categoryPrices.map((categoryPrice) => (
                <tr key={categoryPrice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {categoryPrice.categoryName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-lg font-bold text-[#22452B]">
                      R$ {categoryPrice.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(categoryPrice)}
                      className="text-[#5D663D] hover:text-[#22452B] mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(categoryPrice.id)}
                      className="text-[#AF6138] hover:text-[#814923]"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#2C1810]">
                {editingPrice ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-[#814923] hover:text-[#AF6138] text-3xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Vela Aromática, Difusor, Sabonete"
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Padrão (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 32.90"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#2C5A38] transition-colors"
                >
                  {editingPrice ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
