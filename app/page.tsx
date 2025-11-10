'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Material } from '@/types';
import { productService, customerService, saleService, settingsService } from '@/services';

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settings, products, customers, sales] = await Promise.all([
        settingsService.get(),
        productService.getAll(),
        customerService.getAll(),
        saleService.getAll(),
      ]);

      setLowStockThreshold(settings.lowStockThreshold);

      const lowStock = await productService.getLowStock();
      
      // TODO: Quando orderService e materialService estiverem implementados, adicionar aqui
      const pendingOrdersCount = 0; // orders.filter(o => o.status === 'pending').length;
      const lowMaterials: Material[] = []; // materials com estoque baixo

      // Calcular receita apenas das vendas com status "paid"
      const revenue = sales
        .filter(sale => sale.status === 'paid')
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      setStats({
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalSales: sales.length,
        pendingOrders: pendingOrdersCount,
        totalRevenue: revenue,
      });
      setLowStockProducts(lowStock);
      setLowStockMaterials(lowMaterials);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
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
            onClick={loadDashboardData}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Visão geral do seu negócio de velas aromáticas</p>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/products?openModal=true')}
            className="flex items-center justify-center sm:justify-start p-3 sm:p-4 border-2 border-[#B49959] rounded-lg hover:border-[#AF6138] hover:bg-[#FFF9F0] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#AF6138] mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm sm:text-base font-medium text-[#2C1810]">Adicionar Produto</span>
          </button>
          
          <button
            onClick={() => router.push('/customers?openModal=true')}
            className="flex items-center justify-center sm:justify-start p-3 sm:p-4 border-2 border-[#5D663D] rounded-lg hover:border-[#22452B] hover:bg-[#F5F7F3] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#22452B] mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm sm:text-base font-medium text-[#2C1810]">Novo Cliente</span>
          </button>
          
          <button
            onClick={() => router.push('/sales?openModal=true')}
            className="flex items-center justify-center sm:justify-start p-3 sm:p-4 border-2 border-[#B49959] rounded-lg hover:border-[#814923] hover:bg-[#FFF9F0] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#814923] mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-sm sm:text-base font-medium text-[#2C1810]">Nova Venda</span>
          </button>
          
          <button
            onClick={() => router.push('/orders?openModal=true')}
            className="flex items-center justify-center sm:justify-start p-3 sm:p-4 border-2 border-[#AF6138] rounded-lg hover:border-[#814923] hover:bg-[#FFF5ED] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#AF6138] mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm sm:text-base font-medium text-[#2C1810]">Nova Encomenda</span>
          </button>
        </div>
      </div>

      {/* Grid com Cards de Estatísticas e Produtos com Estoque Baixo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Metade Esquerda - Cards de Estatísticas */}
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Card Total de Produtos */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#814923]">Total de Produtos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#2C1810] mt-1 sm:mt-2">{stats.totalProducts}</p>
                </div>
                <div className="p-2 sm:p-3 bg-[#F5EFE7] rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#AF6138]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card Total de Clientes */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#814923]">Total de Clientes</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#2C1810] mt-1 sm:mt-2">{stats.totalCustomers}</p>
                </div>
                <div className="p-2 sm:p-3 bg-[#EEF2E8] rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#22452B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card Total de Vendas */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#814923]">Total de Vendas</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#2C1810] mt-1 sm:mt-2">{stats.totalSales}</p>
                </div>
                <div className="p-2 sm:p-3 bg-[#FFF9F0] rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#B49959]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card Encomendas Pendentes */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#814923]">Encomendas Pendentes</p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#2C1810] mt-1 sm:mt-2">{stats.pendingOrders}</p>
                </div>
                <div className="p-2 sm:p-3 bg-[#F5EFE7] rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#814923]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card Receita Total - Ocupando 2 colunas */}
            <div className="bg-gradient-to-br from-[#22452B] to-[#1A3521] rounded-lg shadow-md p-4 sm:p-6 sm:col-span-2 border-2 border-[#5D663D]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-[#B49959]">Receita Total</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">
                    R$ {stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-white/20 rounded-full">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metade Direita - Produtos com Estoque Baixo */}
        <div>
          {stats.totalProducts === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 h-full flex items-center justify-center border-2 border-[#B49959]">
              <div className="text-center">
                <div className="p-2 sm:p-3 bg-[#FFF9F0] rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#AF6138]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#814923] mb-2">Nenhum Produto Cadastrado</h3>
                <p className="text-sm sm:text-base text-[#AF6138] mb-4">Comece adicionando seus produtos de velas aromáticas</p>
                <button
                  onClick={() => router.push('/products?openModal=true')}
                  className="px-4 sm:px-6 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#5D663D] transition-colors text-sm sm:text-base"
                >
                  Adicionar Primeiro Produto
                </button>
              </div>
            </div>
          ) : lowStockProducts.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 h-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
                <div className="p-2 bg-[#FFF9F0] rounded-lg">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#AF6138]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#2C1810]">Produtos com Estoque Baixo</h2>
                  <p className="text-xs sm:text-sm text-[#814923]">Produtos com menos de {lowStockThreshold} unidades</p>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
                {lowStockProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-[#FFF9F0] border border-[#B49959] rounded-lg hover:bg-[#FFEDD5] transition-colors gap-2 sm:gap-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FFEDD5] rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#814923]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-[#2C1810]">{product.name}</p>
                        {product.fragrance && (
                          <p className="text-xs sm:text-sm text-[#814923]">Fragrância: {product.fragrance}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xl sm:text-2xl font-bold text-[#AF6138]">
                        {product.quantity} {product.quantity === 1 ? 'unidade' : 'unidades'}
                      </p>
                      {product.quantity === 0 && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold text-[#AF6138] bg-[#FFEDD5] border border-[#AF6138] rounded-full">
                          SEM ESTOQUE
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 h-full flex items-center justify-center border-2 border-[#22452B]">
              <div className="text-center">
                <div className="p-2 sm:p-3 bg-[#EEF2E8] rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-[#22452B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#22452B] mb-2">Estoque em Boa Situação</h3>
                <p className="text-sm sm:text-base text-[#5D663D]">Todos os produtos têm estoque adequado</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Painel de Alertas de Materiais */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">⚠️ Materiais com Estoque Baixo</h2>
              <p className="text-xs sm:text-sm text-gray-600">Materiais que precisam ser repostos</p>
            </div>
            <button
              onClick={() => router.push('/materials')}
              className="w-full sm:w-auto px-4 py-2 bg-[#22452B] text-white rounded-lg hover:bg-[#2C5A38] transition-colors text-sm font-medium"
            >
              Ver Todos os Materiais
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {lowStockMaterials.map((material) => {
              const currentStock = material.currentStock ?? material.totalQuantityPurchased;
              const lowStockAlert = material.lowStockAlert || 100;
              const status = currentStock === 0 
                ? { text: 'SEM ESTOQUE', color: 'bg-red-100 border-red-500 text-red-800' }
                : { text: `ABAIXO DE ${lowStockAlert} ${material.unit}`, color: 'bg-yellow-100 border-yellow-500 text-yellow-800' };

              return (
                <div 
                  key={material.id} 
                  className={`p-3 sm:p-4 border-2 rounded-lg ${status.color} hover:shadow-lg transition-all cursor-pointer`}
                  onClick={() => router.push('/materials')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{material.name}</h3>
                      {material.category && (
                        <span className="text-xs px-2 py-0.5 bg-white rounded-full">
                          {material.category}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Estoque:</span>
                      <span className="text-xl sm:text-2xl font-bold text-gray-900">
                        {currentStock}
                        <span className="text-xs sm:text-sm ml-1">{material.unit}</span>
                      </span>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-gray-300">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color} block text-center sm:inline-block`}>
                        {status.text}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
