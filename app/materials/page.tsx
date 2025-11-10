'use client';

import { useState, useEffect } from 'react';
import { Material, CategoryPrice } from '@/types';
import { materialService, categoryPriceService } from '@/services';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<CategoryPrice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'g',
    totalQuantityPurchased: '0',
    currentStock: '0',
    lowStockAlert: '100',
    totalCostPaid: '0',
    category: '',
    supplier: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [materialsData, categoriesData] = await Promise.all([
        materialService.getAll(),
        categoryPriceService.getAll()
      ]);
      setMaterials(materialsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
      setError('Não foi possível carregar os materiais.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalQuantityPurchased = parseFloat(formData.totalQuantityPurchased);
    const currentStock = parseFloat(formData.currentStock);
    const lowStockAlert = parseFloat(formData.lowStockAlert);
    const totalCostPaid = parseFloat(formData.totalCostPaid);
    const costPerUnit = totalQuantityPurchased > 0 ? totalCostPaid / totalQuantityPurchased : 0;

    const materialData: Partial<Material> = {
      name: formData.name,
      unit: formData.unit,
      totalQuantityPurchased,
      currentStock,
      lowStockAlert,
      totalCostPaid,
      costPerUnit,
      category: formData.category || undefined,
      supplier: formData.supplier || undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (editingMaterial) {
        await materialService.update(editingMaterial.id, materialData);
      } else {
        await materialService.create(materialData as Omit<Material, 'id' | 'createdAt' | 'updatedAt'>);
      }

      resetForm();
      await loadData();
      setShowModal(false);
    } catch (err) {
      console.error('Erro ao salvar material:', err);
      alert('Não foi possível salvar o material. Tente novamente.');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit: material.unit,
      totalQuantityPurchased: material.totalQuantityPurchased.toString(),
      currentStock: (material.currentStock || material.totalQuantityPurchased).toString(),
      lowStockAlert: (material.lowStockAlert || 100).toString(),
      totalCostPaid: material.totalCostPaid.toString(),
      category: material.category || '',
      supplier: material.supplier || '',
      notes: material.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este material?')) {
      try {
        await materialService.delete(id);
        await loadData();
      } catch (err) {
        console.error('Erro ao excluir material:', err);
        alert('Não foi possível excluir o material. Tente novamente.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit: 'g',
      totalQuantityPurchased: '0',
      currentStock: '0',
      lowStockAlert: '100',
      totalCostPaid: '0',
      category: '',
      supplier: '',
      notes: '',
    });
    setEditingMaterial(null);
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    
    const colors: { [key: string]: string } = {
      cera: 'bg-yellow-100 text-yellow-800',
      essência: 'bg-purple-100 text-purple-800',
      embalagem: 'bg-blue-100 text-blue-800',
      decoração: 'bg-pink-100 text-pink-800',
      pavio: 'bg-orange-100 text-orange-800',
      outro: 'bg-gray-100 text-gray-800',
    };

    const color = colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
        {category}
      </span>
    );
  };

  const getStockStatus = (currentStock: number, lowStockAlert: number) => {
    if (currentStock === 0) {
      return { text: 'Sem estoque', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (currentStock < lowStockAlert) {
      return { text: 'Estoque baixo', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
    return { text: 'Estoque ok', color: 'text-green-600', bg: 'bg-green-50' };
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando materiais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-red-900 mb-2">Erro ao carregar</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadData}
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
          <h1 className="text-3xl font-bold text-gray-900">Materiais</h1>
          <p className="text-gray-600 mt-2">Controle de estoque de materiais para produção</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#22452B] text-white px-6 py-3 rounded-lg hover:bg-[#2C5A38] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Novo Material
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Materiais</p>
              <p className="text-2xl font-bold text-[#22452B]">{materials.length}</p>
            </div>
            <div className="p-3 bg-[#EEF2E8] rounded-full">
              <svg className="w-6 h-6 text-[#22452B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Estoque Baixo</p>
              <p className="text-2xl font-bold text-yellow-600">
                {materials.filter(m => {
                  const stock = m.currentStock ?? m.totalQuantityPurchased;
                  const alert = m.lowStockAlert || 100;
                  return stock > 0 && stock < alert;
                }).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sem Estoque</p>
              <p className="text-2xl font-bold text-red-600">
                {materials.filter(m => (m.currentStock ?? m.totalQuantityPurchased) === 0).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Investimento Total</p>
              <p className="text-2xl font-bold text-[#AF6138]">
                R$ {materials.reduce((sum, m) => sum + m.totalCostPaid, 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-[#FFF9F0] rounded-full">
              <svg className="w-6 h-6 text-[#AF6138]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum material cadastrado</h3>
          <p className="text-gray-600 mb-4">Comece registrando seus materiais de produção</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#22452B] text-white px-6 py-2 rounded-lg hover:bg-[#2C5A38] transition-colors"
          >
            Novo Material
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Atual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qtd. Comprada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo/Unidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investimento Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.map((material) => {
                const currentStock = material.currentStock ?? material.totalQuantityPurchased;
                const lowStockAlert = material.lowStockAlert || 100;
                const status = getStockStatus(currentStock, lowStockAlert);
                return (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{material.name}</div>
                        {material.supplier && (
                          <div className="text-xs text-gray-500">Fornecedor: {material.supplier}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCategoryBadge(material.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {currentStock} {material.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {material.totalQuantityPurchased} {material.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        R$ {material.costPerUnit.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-[#AF6138]">
                        R$ {material.totalCostPaid.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${status.bg} ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingMaterial ? 'Editar Material' : 'Novo Material'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Material *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    placeholder="Ex: Cera de soja, Essência de lavanda"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.categoryName}>
                          {cat.categoryName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Cera">Cera</option>
                        <option value="Essência">Essência</option>
                        <option value="Embalagem">Embalagem</option>
                        <option value="Decoração">Decoração</option>
                        <option value="Pavio">Pavio</option>
                        <option value="Outro">Outro</option>
                      </>
                    )}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Dica: Cadastre categorias em "Preço por Categoria" para usar aqui
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidade de Medida *
                  </label>
                  <select
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  >
                    <option value="g">Gramas (g)</option>
                    <option value="kg">Quilogramas (kg)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="L">Litros (L)</option>
                    <option value="unidade">Unidades</option>
                    <option value="m">Metros (m)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade Comprada (para cálculo) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.totalQuantityPurchased}
                    onChange={(e) => setFormData({ ...formData, totalQuantityPurchased: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Usado para calcular o custo por unidade</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estoque Atual *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Quantidade disponível agora</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    Alerta de Estoque Baixo *
                    <span className="text-xs text-gray-500 font-normal">({formData.unit})</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.lowStockAlert}
                    onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                    className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-yellow-50"
                  />
                  <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Será alertado quando estoque for menor que este valor
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custo Total Pago *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.totalCostPaid}
                    onChange={(e) => setFormData({ ...formData, totalCostPaid: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    placeholder="R$"
                  />
                  <p className="text-xs text-gray-500 mt-1">Usado para calcular o custo por unidade</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                {/* Custo por unidade calculado */}
                {formData.totalQuantityPurchased && formData.totalCostPaid && parseFloat(formData.totalQuantityPurchased) > 0 && (
                  <div className="md:col-span-2 bg-[#EEF2E8] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Custo por {formData.unit}:</span>
                      <span className="text-xl font-bold text-[#22452B]">
                        R$ {(parseFloat(formData.totalCostPaid) / parseFloat(formData.totalQuantityPurchased)).toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#2C5A38] transition-colors"
                >
                  {editingMaterial ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
