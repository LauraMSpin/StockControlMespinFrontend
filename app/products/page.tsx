'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product, CategoryPrice } from '@/types';
import { productService, settingsService, categoryPriceService } from '@/services';
import Link from 'next/link';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryPrice[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [editingQuantity, setEditingQuantity] = useState<{ productId: string; value: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupByWeight, setGroupByWeight] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
    fragrance: '',
    weight: '',
  });

  useEffect(() => {
    loadData();
    
    // Verificar se deve abrir o modal automaticamente
    if (searchParams.get('openModal') === 'true') {
      setShowModal(true);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsData, productsData, categoriesData] = await Promise.all([
        settingsService.get(),
        productService.getAll(),
        categoryPriceService.getAll()
      ]);
      setLowStockThreshold(settingsData.lowStockThreshold);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os produtos. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await productService.getAll();
      setProducts(allProducts);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(formData.quantity);
    const price = parseFloat(formData.price);
    
    // Validar valores
    if (quantity < 0) {
      alert('A quantidade não pode ser negativa!');
      return;
    }
    
    if (price < 0) {
      alert('O preço não pode ser negativo!');
      return;
    }
    
    const productData: Partial<Product> = {
      name: formData.name,
      description: formData.description,
      price: price,
      quantity: quantity,
      category: formData.category || undefined,
      fragrance: formData.fragrance || undefined,
      weight: formData.weight || undefined,
    };
    
    try {
      if (editingProduct) {
        // O backend espera o objeto completo do produto com id, createdAt e updatedAt
        const fullProductData: Product = {
          ...editingProduct,
          ...productData,
          id: editingProduct.id,
          createdAt: editingProduct.createdAt,
          updatedAt: editingProduct.updatedAt,
        };
        await productService.update(editingProduct.id, fullProductData);
      } else {
        await productService.create(productData as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
      }

      resetForm();
      await loadProducts();
      setShowModal(false);
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      alert('Não foi possível salvar o produto. Tente novamente.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDuplicating(false);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      category: product.category || '',
      fragrance: product.fragrance || '',
      weight: product.weight || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await productService.delete(id);
        await loadProducts();
      } catch (err) {
        console.error('Erro ao excluir produto:', err);
        alert('Não foi possível excluir o produto. Tente novamente.');
      }
    }
  };

  const handleDuplicate = (product: Product) => {
    // Preencher o formulário com os dados do produto existente
    setEditingProduct(null); // Não está editando, está criando novo
    setIsDuplicating(true);
    setFormData({
      name: `${product.name} (Cópia)`,
      description: product.description,
      price: product.price.toString(),
      quantity: '0', // Quantidade zerada para o novo produto
      category: product.category || '',
      fragrance: product.fragrance || '',
      weight: product.weight || '',
    });
    setShowModal(true);
  };

  const handleQuantityClick = (product: Product) => {
    setEditingQuantity({ productId: product.id, value: product.quantity.toString() });
  };

  const handleQuantityChange = (value: string) => {
    // Permitir apenas números
    if (value === '' || /^\d+$/.test(value)) {
      setEditingQuantity(prev => prev ? { ...prev, value } : null);
    }
  };

  const handleQuantityBlur = async () => {
    if (editingQuantity) {
      const newQuantity = parseInt(editingQuantity.value) || 0;
      
      if (newQuantity < 0) {
        alert('A quantidade não pode ser negativa!');
        setEditingQuantity(null);
        return;
      }

      try {
        await productService.updateStock(editingQuantity.productId, newQuantity);
        await loadProducts();
      } catch (err) {
        console.error('Erro ao atualizar quantidade:', err);
        alert('Não foi possível atualizar a quantidade. Tente novamente.');
      }
      setEditingQuantity(null);
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuantityBlur();
    } else if (e.key === 'Escape') {
      setEditingQuantity(null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentValue = parseInt(editingQuantity?.value || '0');
      setEditingQuantity(prev => prev ? { ...prev, value: (currentValue + 1).toString() } : null);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentValue = parseInt(editingQuantity?.value || '0');
      const newValue = Math.max(0, currentValue - 1);
      setEditingQuantity(prev => prev ? { ...prev, value: newValue.toString() } : null);
    }
  };

  const adjustQuantity = async (productId: string, adjustment: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newQuantity = Math.max(0, product.quantity + adjustment);
    try {
      await productService.updateStock(productId, newQuantity);
      await loadProducts();
    } catch (err) {
      console.error('Erro ao ajustar quantidade:', err);
      alert('Não foi possível ajustar a quantidade. Tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      quantity: '',
      category: '',
      fragrance: '',
      weight: '',
    });
    setEditingProduct(null);
    setIsDuplicating(false);
  };

  // Agrupar produtos por peso
  const groupProductsByWeight = () => {
    const grouped = new Map<string, Product[]>();
    
    products.forEach(product => {
      const weight = product.weight || 'Sem peso definido';
      if (!grouped.has(weight)) {
        grouped.set(weight, []);
      }
      grouped.get(weight)!.push(product);
    });

    // Ordenar os grupos por peso (extrair números)
    const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
      const weightA = a[0];
      const weightB = b[0];
      
      // Produtos sem peso vão para o final
      if (weightA === 'Sem peso definido') return 1;
      if (weightB === 'Sem peso definido') return -1;
      
      // Extrair números dos pesos
      const numA = parseFloat(weightA.match(/\d+(\.\d+)?/)?.[0] || '0');
      const numB = parseFloat(weightB.match(/\d+(\.\d+)?/)?.[0] || '0');
      
      return numA - numB;
    });

    return sortedGroups;
  };

  const renderProductRow = (product: Product) => (
    <tr key={product.id} className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-500">{product.fragrance}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900">{product.category || '-'}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-gray-900">{product.weight || '-'}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-semibold text-gray-900">R$ {product.price.toFixed(2)}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingQuantity?.productId === product.id ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={editingQuantity.value}
              onChange={(e) => handleQuantityChange(e.target.value)}
              onBlur={handleQuantityBlur}
              onKeyDown={handleQuantityKeyDown}
              autoFocus
              className="w-20 px-2 py-1 text-sm border border-blue-500 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-sm text-gray-500">un.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <button
              onClick={() => adjustQuantity(product.id, -1)}
              disabled={product.quantity === 0}
              className="p-1 rounded hover:bg-[#FFEDD5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Diminuir quantidade"
            >
              <svg className="w-4 h-4 text-[#AF6138]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={() => handleQuantityClick(product)}
              className="min-w-[60px] px-3 py-1 text-sm text-[#2C1810] hover:bg-[#FFF9F0] hover:text-[#814923] rounded border border-transparent hover:border-[#B49959] transition-colors"
              title="Clicar para editar"
            >
              {product.quantity} un.
            </button>
            <button
              onClick={() => adjustQuantity(product.id, 1)}
              className="p-1 rounded hover:bg-[#EEF2E8] transition-colors"
              title="Aumentar quantidade"
            >
              <svg className="w-4 h-4 text-[#22452B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {product.quantity === 0 ? (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#FFEDD5] text-[#AF6138]">
            Esgotado
          </span>
        ) : product.quantity < lowStockThreshold ? (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#FFF9F0] text-[#B49959]">
            Baixo
          </span>
        ) : (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-[#EEF2E8] text-[#22452B]">
            Normal
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => handleEdit(product)}
          className="text-[#5D663D] hover:text-[#22452B] mr-3 inline-flex items-center gap-1"
          title="Editar produto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
        <button
          onClick={() => handleDuplicate(product)}
          className="text-[#B49959] hover:text-[#814923] mr-3 inline-flex items-center gap-1"
          title="Criar cópia deste produto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Duplicar
        </button>
        <button
          onClick={() => handleDelete(product.id)}
          className="text-[#AF6138] hover:text-[#814923] inline-flex items-center gap-1"
          title="Excluir produto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Excluir
        </button>
      </td>
    </tr>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-600 mt-2">Gerencie seu estoque de velas aromáticas</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setGroupByWeight(!groupByWeight)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              groupByWeight 
                ? 'bg-[#22452B] text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={groupByWeight ? 'Desagrupar produtos' : 'Agrupar por peso'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {groupByWeight ? 'Agrupado por Peso' : 'Agrupar por Peso'}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-[#AF6138] text-white px-6 py-3 rounded-lg hover:bg-[#814923] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Novo Produto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produtos...</p>
        </div>
      ) : error ? (
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
      ) : products.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-[#B49959] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-xl font-semibold text-[#2C1810] mb-2">Nenhum produto cadastrado</h3>
          <p className="text-[#814923] mb-4">Comece adicionando seu primeiro produto ao estoque</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#AF6138] text-white px-6 py-2 rounded-lg hover:bg-[#814923] transition-colors"
          >
            Adicionar Produto
          </button>
        </div>
      ) : groupByWeight ? (
        // Visualização agrupada por peso
        <div className="space-y-6">
          {groupProductsByWeight().map(([weight, weightProducts]) => (
            <div key={weight} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-[#22452B] text-white px-6 py-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <h3 className="text-lg font-semibold">{weight}</h3>
                <span className="ml-auto text-sm opacity-90">
                  {weightProducts.length} {weightProducts.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
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
                  {weightProducts.map(product => renderProductRow(product))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        // Visualização normal (lista única)
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
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
              {products.map(product => renderProductRow(product))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#2C1810]">
                {editingProduct ? 'Editar Produto' : isDuplicating ? 'Duplicar Produto' : 'Novo Produto'}
              </h2>
              {isDuplicating && (
                <p className="text-sm text-[#814923] mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Criando cópia do produto. Ajuste o nome e a quantidade conforme necessário.
                </p>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setFormData({ ...formData, category: newCategory });
                      
                      // Buscar preço da categoria e aplicar automaticamente
                      const categoryPrice = categories.find(c => c.categoryName === newCategory);
                      if (categoryPrice && !editingProduct) {
                        setFormData(prev => ({ ...prev, price: categoryPrice.price.toString() }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.categoryName}>
                          {cat.categoryName} (R$ {cat.price.toFixed(2)})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Vela Aromatizada">Vela Aromatizada</option>
                        <option value="Vela Decorativa">Vela Decorativa</option>
                        <option value="Difusor">Difusor</option>
                      </>
                    )}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-blue-500 mt-1">
                      💡 Dica: Cadastre categorias com preços em "Preço por Categoria"
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aroma
                  </label>
                  <input
                    type="text"
                    value={formData.fragrance}
                    onChange={(e) => setFormData({ ...formData, fragrance: e.target.value })}
                    placeholder="Ex: Lavanda"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peso
                  </label>
                  <input
                    type="text"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="Ex: 250g"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.category && categories.find(c => c.categoryName === formData.category) && (
                    <p className="text-xs text-green-600 mt-1">
                      💰 Preço sugerido da categoria: R$ {categories.find(c => c.categoryName === formData.category)?.price.toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#AF6138] text-white rounded-lg hover:bg-[#814923] transition-colors"
                >
                  {editingProduct ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
