'use client';

import { useState, useEffect } from 'react';
import { Product, Material, ProductionMaterial } from '@/types';
import { productService, materialService } from '@/services';

export default function ProductionCostsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showAddToProductModal, setShowAddToProductModal] = useState(false);
  const [editingProductMaterial, setEditingProductMaterial] = useState<ProductionMaterial | null>(null);

  const [materialForm, setMaterialForm] = useState({
    name: '',
    unit: 'g',
    totalQuantityPurchased: '',
    totalCostPaid: '',
    category: '',
    supplier: '',
    notes: '',
  });

  const [addToProductForm, setAddToProductForm] = useState({
    materialId: '',
    quantity: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsData, materialsData] = await Promise.all([
        productService.getAll(),
        materialService.getAll(),
      ]);
      setProducts(productsData);
      setMaterials(materialsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalQuantity = parseFloat(materialForm.totalQuantityPurchased);
    const totalCost = parseFloat(materialForm.totalCostPaid);
    
    if (isNaN(totalQuantity) || totalQuantity <= 0) {
      alert('Quantidade inválida!');
      return;
    }
    
    if (isNaN(totalCost) || totalCost <= 0) {
      alert('Custo inválido!');
      return;
    }

    const costPerUnit = totalCost / totalQuantity;

    try {
      if (editingMaterial) {
        await materialService.update(editingMaterial.id, {
          name: materialForm.name,
          unit: materialForm.unit,
          totalQuantityPurchased: totalQuantity,
          totalCostPaid: totalCost,
          costPerUnit: costPerUnit,
          currentStock: totalQuantity,
          lowStockAlert: 0,
          category: materialForm.category,
          supplier: materialForm.supplier,
          notes: materialForm.notes,
        });
      } else {
        await materialService.create({
          name: materialForm.name,
          unit: materialForm.unit,
          totalQuantityPurchased: totalQuantity,
          totalCostPaid: totalCost,
          costPerUnit: costPerUnit,
          currentStock: totalQuantity,
          lowStockAlert: 0,
          category: materialForm.category,
          supplier: materialForm.supplier,
          notes: materialForm.notes,
        });
      }

      resetMaterialForm();
      await loadData();
      setShowMaterialForm(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar material: ${error.message}`);
      }
    }
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      unit: material.unit,
      totalQuantityPurchased: material.totalQuantityPurchased.toString(),
      totalCostPaid: material.totalCostPaid.toString(),
      category: material.category || '',
      supplier: material.supplier || '',
      notes: material.notes || '',
    });
    setShowMaterialForm(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    if (confirm('Deseja excluir este material? Ele será removido de todos os produtos.')) {
      try {
        await materialService.delete(id);
        await loadData();
      } catch (error) {
        if (error instanceof Error) {
          alert(`Erro ao excluir material: ${error.message}`);
        }
      }
    }
  };

  const resetMaterialForm = () => {
    setMaterialForm({
      name: '',
      unit: 'g',
      totalQuantityPurchased: '',
      totalCostPaid: '',
      category: '',
      supplier: '',
      notes: '',
    });
    setEditingMaterial(null);
  };

  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleAddMaterialToProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;
    
    const quantity = parseFloat(addToProductForm.quantity);
    const materialId = addToProductForm.materialId;
    
    if (!materialId) {
      alert('Selecione um material!');
      return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      alert('Quantidade inválida!');
      return;
    }

    const material = materials.find(m => m.id === materialId);
    if (!material) {
      alert('Material não encontrado!');
      return;
    }

    const totalCost = quantity * material.costPerUnit;
    const currentMaterials = selectedProduct.productionMaterials || [];

    const newProductMaterial: ProductionMaterial = {
      id: editingProductMaterial?.id || generateId(),
      materialId: material.id,
      materialName: material.name,
      quantity: quantity,
      unit: material.unit,
      costPerUnit: material.costPerUnit,
      totalCost: totalCost,
    };

    let updatedMaterials: ProductionMaterial[];
    
    if (editingProductMaterial) {
      updatedMaterials = currentMaterials.map(m => 
        m.id === editingProductMaterial.id ? newProductMaterial : m
      );
    } else {
      updatedMaterials = [...currentMaterials, newProductMaterial];
    }

    const totalProductionCost = updatedMaterials.reduce((sum, m) => sum + m.totalCost, 0);
    const profitMargin = selectedProduct.price - totalProductionCost;

    try {
      await productService.update(selectedProduct.id, {
        productionMaterials: updatedMaterials,
        productionCost: totalProductionCost,
        profitMargin: profitMargin,
      });

      const updatedProduct = { 
        ...selectedProduct, 
        productionMaterials: updatedMaterials,
        productionCost: totalProductionCost,
        profitMargin: profitMargin,
      };
      setSelectedProduct(updatedProduct);

      resetAddToProductForm();
      await loadData();
      setShowAddToProductModal(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao adicionar material: ${error.message}`);
      }
    }
  };

  const handleEditProductMaterial = (material: ProductionMaterial) => {
    setEditingProductMaterial(material);
    setAddToProductForm({
      materialId: material.materialId,
      quantity: material.quantity.toString(),
    });
    setShowAddToProductModal(true);
  };

  const handleDeleteProductMaterial = async (materialId: string) => {
    if (!selectedProduct || !confirm('Deseja remover este material do produto?')) return;

    const updatedMaterials = (selectedProduct.productionMaterials || []).filter(m => m.id !== materialId);
    const totalProductionCost = updatedMaterials.reduce((sum, m) => sum + m.totalCost, 0);
    const profitMargin = selectedProduct.price - totalProductionCost;

    try {
      await productService.update(selectedProduct.id, {
        productionMaterials: updatedMaterials,
        productionCost: totalProductionCost,
        profitMargin: profitMargin,
      });

      const updatedProduct = { 
        ...selectedProduct, 
        productionMaterials: updatedMaterials,
        productionCost: totalProductionCost,
        profitMargin: profitMargin,
      };
      setSelectedProduct(updatedProduct);
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao remover material: ${error.message}`);
      }
    }
  };

  const resetAddToProductForm = () => {
    setAddToProductForm({
      materialId: '',
      quantity: '',
    });
    setEditingProductMaterial(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AF6138] mx-auto"></div>
          <p className="mt-4 text-[#814923]">Carregando dados...</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2C1810]">Custos de Produção</h1>
        <p className="text-[#814923] mt-2">Gerencie o catálogo de materiais reutilizáveis</p>
      </div>

      <button
        onClick={() => setShowCatalogModal(true)}
        className="mb-6 bg-[#B49959] text-white px-6 py-3 rounded-lg hover:bg-[#814923] transition-colors"
      >
        📦 Gerenciar Catálogo de Materiais ({materials.length})
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Produtos ({products.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Preço</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Custo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lucro</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => {
                  const cost = product.productionCost || 0;
                  const profit = product.profitMargin || 0;
                  const profitPercentage = product.price > 0 ? (profit / product.price) * 100 : 0;
                  
                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`cursor-pointer ${
                        selectedProduct?.id === product.id
                          ? 'bg-[#22452B] text-white hover:bg-[#2C5A38]'
                          : 'hover:bg-[#F5EFE7]'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold">{product.name}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm">R$ {product.price.toFixed(2)}</div>
                      </td>
                      <td className="px-3 py-3">
                        {cost > 0 ? (
                          <div className={`text-sm ${selectedProduct?.id === product.id ? 'text-red-200' : 'text-red-600'}`}>
                            R$ {cost.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {cost > 0 ? (
                          <div>
                            <div className={`text-sm font-semibold ${
                              selectedProduct?.id === product.id 
                                ? (profit >= 0 ? 'text-green-200' : 'text-red-200')
                                : (profit >= 0 ? 'text-green-600' : 'text-red-600')
                            }`}>
                              R$ {profit.toFixed(2)}
                            </div>
                            <div className={`text-xs ${
                              selectedProduct?.id === product.id
                                ? (profit >= 0 ? 'text-green-300' : 'text-red-300')
                                : (profit >= 0 ? 'text-green-500' : 'text-red-500')
                            }`}>
                              {profitPercentage.toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          {selectedProduct ? (
            <div>
              <h2 className="text-2xl font-bold text-[#2C1810] mb-4">{selectedProduct.name}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#F5EFE7] rounded-lg">
                  <p className="text-sm text-[#814923]">Preço de Venda</p>
                  <p className="text-2xl font-bold">R$ {selectedProduct.price.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-[#FFF9F0] rounded-lg">
                  <p className="text-sm text-[#814923]">Custo de Produção</p>
                  <p className="text-2xl font-bold text-[#AF6138]">
                    R$ {(selectedProduct.productionCost || 0).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-[#EEF2E8] rounded-lg">
                  <p className="text-sm text-[#814923]">Lucro</p>
                  <p className="text-2xl font-bold text-[#22452B]">
                    R$ {(selectedProduct.profitMargin || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Materiais Utilizados:</h3>
                  <button
                    onClick={() => {
                      resetAddToProductForm();
                      setShowAddToProductModal(true);
                    }}
                    className="bg-[#AF6138] text-white px-4 py-2 rounded-lg hover:bg-[#814923] transition-colors text-sm flex items-center gap-2"
                  >
                    <span>+</span>
                    Adicionar Material
                  </button>
                </div>
                {selectedProduct.productionMaterials?.length ? (
                  <div className="space-y-2">
                    {selectedProduct.productionMaterials.map(m => (
                      <div key={m.id} className="p-3 bg-[#F5EFE7] rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-[#2C1810]">{m.materialName}</p>
                            <p className="text-sm text-[#814923]">
                              {m.quantity}{m.unit} × R$ {m.costPerUnit.toFixed(4)}/{m.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#AF6138]">R$ {m.totalCost.toFixed(2)}</p>
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => handleEditProductMaterial(m)}
                                className="text-xs text-[#5D663D] hover:text-[#22452B]"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProductMaterial(m.id)}
                                className="text-xs text-[#AF6138] hover:text-[#814923]"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t-2 border-[#B49959]">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Custo Total de Produção:</span>
                        <span className="text-xl font-bold text-[#AF6138]">
                          R$ {(selectedProduct.productionCost || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#814923] text-center py-6 bg-[#F5EFE7] rounded-lg">
                    Nenhum material configurado. Clique em "Adicionar Material" para começar.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-[#814923] py-12">Selecione um produto</p>
          )}
        </div>
      </div>

      {showCatalogModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#2C1810]">Catálogo de Materiais</h2>
              <button 
                onClick={() => setShowCatalogModal(false)} 
                className="text-[#814923] hover:text-[#AF6138] text-3xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* Formulário Adicionar/Editar Material */}
            {showMaterialForm ? (
              <form onSubmit={handleSubmitMaterial} className="mb-8 p-6 bg-[#F5EFE7] rounded-lg">
                <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                  {editingMaterial ? 'Editar Material' : 'Adicionar Novo Material'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Material *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cera de soja, Essência de lavanda"
                      value={materialForm.name}
                      onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Cera, Essência, Embalagem"
                      value={materialForm.category}
                      onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade Comprada *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="1000"
                        value={materialForm.totalQuantityPurchased}
                        onChange={(e) => setMaterialForm({ ...materialForm, totalQuantityPurchased: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                      />
                      <select
                        required
                        value={materialForm.unit}
                        onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="un">un</option>
                        <option value="m">m</option>
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                        <option value="pol">pol</option>
                        <option value="oz">oz</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Pago *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="50.00"
                      value={materialForm.totalCostPaid}
                      onChange={(e) => setMaterialForm({ ...materialForm, totalCostPaid: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fornecedor
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do fornecedor"
                      value={materialForm.supplier}
                      onChange={(e) => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações
                    </label>
                    <input
                      type="text"
                      placeholder="Notas adicionais"
                      value={materialForm.notes}
                      onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>
                </div>

                {materialForm.totalQuantityPurchased && materialForm.totalCostPaid && (
                  <div className="mt-4 p-3 bg-[#EEF2E8] rounded">
                    <p className="text-sm text-[#814923]">
                      💡 Custo por {materialForm.unit}: 
                      <span className="font-bold text-[#22452B] ml-2">
                        R$ {(parseFloat(materialForm.totalCostPaid) / parseFloat(materialForm.totalQuantityPurchased)).toFixed(4)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#AF6138] text-white rounded-lg hover:bg-[#814923] transition-colors"
                  >
                    {editingMaterial ? 'Atualizar Material' : 'Adicionar ao Catálogo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMaterialForm(false);
                      resetMaterialForm();
                    }}
                    className="px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowMaterialForm(true)}
                className="mb-6 w-full bg-[#22452B] text-white px-6 py-3 rounded-lg hover:bg-[#5D663D] transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                Adicionar Novo Material ao Catálogo
              </button>
            )}

            {/* Lista de Materiais */}
            <div>
              <h3 className="text-lg font-semibold text-[#2C1810] mb-4">
                Materiais Cadastrados ({materials.length})
              </h3>
              
              {materials.length === 0 ? (
                <p className="text-center text-[#814923] py-8">
                  Nenhum material cadastrado. Comece adicionando seu primeiro material!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materials.map(material => (
                    <div key={material.id} className="p-4 bg-white border-2 border-[#B49959] rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-[#2C1810]">{material.name}</h4>
                          {material.category && (
                            <span className="text-xs bg-[#B49959] text-white px-2 py-0.5 rounded mt-1 inline-block">
                              {material.category}
                            </span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-[#AF6138]">
                          R$ {material.costPerUnit.toFixed(4)}/{material.unit}
                        </p>
                      </div>
                      <p className="text-sm text-[#814923] mb-2">
                        {material.totalQuantityPurchased} {material.unit} por R$ {material.totalCostPaid.toFixed(2)}
                      </p>
                      {material.supplier && (
                        <p className="text-xs text-[#5D663D] mb-2">
                          📦 Fornecedor: {material.supplier}
                        </p>
                      )}
                      {material.notes && (
                        <p className="text-xs text-[#814923] italic mb-2">
                          "{material.notes}"
                        </p>
                      )}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[#B49959]">
                        <button
                          onClick={() => handleEditMaterial(material)}
                          className="flex-1 text-[#5D663D] hover:text-[#22452B] text-sm font-medium"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="flex-1 text-[#AF6138] hover:text-[#814923] text-sm font-medium"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Adicionar Material ao Produto */}
      {showAddToProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-[#2C1810]">
                {editingProductMaterial ? 'Editar Material' : 'Adicionar Material ao Produto'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddToProductModal(false);
                  resetAddToProductForm();
                }}
                className="text-[#814923] hover:text-[#AF6138] text-3xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddMaterialToProduct} className="p-6">
              <div className="space-y-4">
                {/* Seletor de Material */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material *
                  </label>
                  <select
                    required
                    disabled={!!editingProductMaterial}
                    value={addToProductForm.materialId}
                    onChange={(e) => {
                      const material = materials.find(m => m.id === e.target.value);
                      setAddToProductForm({ 
                        ...addToProductForm, 
                        materialId: e.target.value 
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Selecione um material</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} - R$ {material.costPerUnit.toFixed(4)}/{material.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview do Material Selecionado */}
                {addToProductForm.materialId && (
                  <div className="bg-[#F5EFE7] p-4 rounded-lg">
                    {(() => {
                      const material = materials.find(m => m.id === addToProductForm.materialId);
                      if (!material) return null;
                      return (
                        <div className="text-sm space-y-1">
                          <p className="font-semibold text-[#22452B]">{material.name}</p>
                          <p className="text-[#814923]">
                            Custo por {material.unit}: R$ {material.costPerUnit.toFixed(4)}
                          </p>
                          {material.category && (
                            <p className="text-gray-600">Categoria: {material.category}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade Utilizada *
                    {addToProductForm.materialId && (
                      <span className="text-gray-500 text-xs ml-2">
                        ({materials.find(m => m.id === addToProductForm.materialId)?.unit || ''})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 180"
                    value={addToProductForm.quantity}
                    onChange={(e) => setAddToProductForm({ ...addToProductForm, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                {/* Preview do Custo Total */}
                {addToProductForm.materialId && addToProductForm.quantity && (
                  <div className="bg-[#B49959] bg-opacity-10 p-4 rounded-lg border border-[#B49959]">
                    {(() => {
                      const material = materials.find(m => m.id === addToProductForm.materialId);
                      const quantity = parseFloat(addToProductForm.quantity);
                      if (!material || isNaN(quantity)) return null;
                      const totalCost = quantity * material.costPerUnit;
                      return (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">Custo Total deste Material</p>
                          <p className="text-2xl font-bold text-[#22452B]">
                            R$ {totalCost.toFixed(2)}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddToProductModal(false);
                    resetAddToProductForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#2C5A38] transition-colors"
                >
                  {editingProductMaterial ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
