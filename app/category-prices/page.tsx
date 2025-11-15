'use client';

import { useState, useEffect } from 'react';
import { CategoryPrice } from '@/types';
import { categoryPriceService, productService } from '@/services';

export default function CategoryPricesPage() {
  const [categoryPrices, setCategoryPrices] = useState<CategoryPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<CategoryPrice | null>(null);
  const [formData, setFormData] = useState({
    categoryName: '',
    price: '',
    isProductCategory: true, // true para produtos, false para materiais
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryPriceService.getAll();
      setCategoryPrices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = formData.price ? parseFloat(formData.price) : 0;
    
    // Para produtos, o preço é obrigatório
    if (formData.isProductCategory && (!formData.price || price <= 0)) {
      alert('O preço é obrigatório para categorias de produtos!');
      return;
    }
    
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
    
    try {
      if (editingPrice) {
        // Verificar quantos produtos serão afetados
        const products = await productService.getAll();
        const oldCategoryName = editingPrice.categoryName;
        const affectedProducts = products.filter((p: any) => 
          p.category?.toLowerCase() === oldCategoryName.toLowerCase()
        );
        
        // Confirmar atualização se houver produtos afetados
        if (affectedProducts.length > 0) {
          const confirmUpdate = confirm(
            `Esta ação irá atualizar o preço de ${affectedProducts.length} produto(s) da categoria "${oldCategoryName}" para R$ ${price.toFixed(2)}.\n\n` +
            `Os produtos afetados são:\n${affectedProducts.map((p: any) => `- ${p.name}`).slice(0, 5).join('\n')}` +
            `${affectedProducts.length > 5 ? `\n... e mais ${affectedProducts.length - 5} produto(s)` : ''}\n\n` +
            `Vendas já registradas NÃO serão alteradas.\n\nDeseja continuar?`
          );
          
          if (!confirmUpdate) {
            return;
          }
        }
        
        await categoryPriceService.update(editingPrice.id, {
          categoryName: formData.categoryName,
          price: price,
        });
        
        // Aplicar preço aos produtos da categoria
        if (affectedProducts.length > 0) {
          await categoryPriceService.applyToProducts(editingPrice.id);
          alert(`✅ Preço atualizado com sucesso!\n\n${affectedProducts.length} produto(s) da categoria "${oldCategoryName}" foram atualizados para R$ ${price.toFixed(2)}.`);
        }
      } else {
        await categoryPriceService.create({
          categoryName: formData.categoryName,
          price: price,
        });
      }

      resetForm();
      await loadData();
      setShowModal(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar categoria: ${error.message}`);
      }
    }
  };

  const handleEdit = (categoryPrice: CategoryPrice) => {
    setEditingPrice(categoryPrice);
    // Determina se é categoria de produto (tem preço) ou material (pode não ter)
    const isProduct = categoryPrice.price > 0 || categoryPrice.categoryName.toLowerCase().includes('vela') || 
                      categoryPrice.categoryName.toLowerCase().includes('difusor') ||
                      categoryPrice.categoryName.toLowerCase().includes('sabonete');
    setFormData({
      categoryName: categoryPrice.categoryName,
      price: categoryPrice.price > 0 ? categoryPrice.price.toString() : '',
      isProductCategory: isProduct,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este preço de categoria?')) {
      try {
        await categoryPriceService.delete(id);
        await loadData();
      } catch (error) {
        if (error instanceof Error) {
          alert(`Erro ao excluir categoria: ${error.message}`);
        }
      }
    }
  };

  const resetForm = () => {
    setFormData({
      categoryName: '',
      price: '',
      isProductCategory: true,
    });
    setEditingPrice(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22452B] mx-auto"></div>
          <p className="mt-4 text-[#814923]">Carregando categorias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Erro ao carregar dados</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadData()}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

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
        <div className="space-y-6">
          {/* Categorias de Produtos */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#22452B] px-6 py-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🛍️ Categorias de Produtos
              </h3>
            </div>
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
                {categoryPrices.filter(cp => cp.price > 0).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma categoria de produto cadastrada
                    </td>
                  </tr>
                ) : (
                  categoryPrices.filter(cp => cp.price > 0).map((categoryPrice) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Categorias de Materiais */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#B49959] px-6 py-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🧪 Categorias de Materiais de Produção
              </h3>
            </div>
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
                {categoryPrices.filter(cp => cp.price === 0).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma categoria de material cadastrada
                    </td>
                  </tr>
                ) : (
                  categoryPrices.filter(cp => cp.price === 0).map((categoryPrice) => (
                    <tr key={categoryPrice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {categoryPrice.categoryName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 italic">
                          Sem preço padrão
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
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                    Tipo de Categoria *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.isProductCategory}
                        onChange={() => setFormData({ ...formData, isProductCategory: true })}
                        className="mr-2"
                      />
                      <span className="text-sm">🛍️ Produto (requer preço)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.isProductCategory}
                        onChange={() => setFormData({ ...formData, isProductCategory: false, price: '' })}
                        className="mr-2"
                      />
                      <span className="text-sm">🧪 Material (preço opcional)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.isProductCategory ? "Ex: Vela Aromática, Difusor, Sabonete" : "Ex: Cera, Essência, Embalagem"}
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço Padrão (R$) {formData.isProductCategory ? '*' : '(Opcional)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required={formData.isProductCategory}
                    placeholder={formData.isProductCategory ? "Ex: 32.90" : "Ex: 0 ou deixe vazio"}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                  {!formData.isProductCategory && (
                    <p className="text-xs text-gray-500 mt-1">
                      Materiais podem não ter preço padrão, pois o preço pode variar
                    </p>
                  )}
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
