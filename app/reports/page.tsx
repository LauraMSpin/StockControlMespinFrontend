'use client';

import { useState, useEffect } from 'react';
import { Sale, Customer, SaleItem, Product, PriceHistory } from '@/types';
import { saleService, customerService, productService } from '@/services';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedView, setSelectedView] = useState<'dashboard' | 'priceHistory'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [salesData, customersData, productsData] = await Promise.all([
        saleService.getAll(),
        customerService.getAll(),
        productService.getAll(),
      ]);
      setSales(salesData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados dos relatórios.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSales = () => {
    const now = new Date();
    let startDate = new Date(0); // Epoch

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        return sales;
    }

    return sales.filter(sale => new Date(sale.saleDate) >= startDate);
  };

  const getCustomDateFilteredSales = () => {
    if (!customStartDate && !customEndDate) {
      return getFilteredSales();
    }

    const filtered = getFilteredSales();
    const start = customStartDate ? new Date(customStartDate) : new Date(0);
    const end = customEndDate ? new Date(customEndDate) : new Date();
    end.setHours(23, 59, 59, 999); // Fim do dia

    return filtered.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return saleDate >= start && saleDate <= end;
    });
  };

  const filteredSales = getCustomDateFilteredSales();

  // Estatísticas Gerais
  const totalSales = filteredSales.length;
  const paidSales = filteredSales.filter(s => s.status === 'paid');
  const pendingSales = filteredSales.filter(s => s.status === 'pending');
  const awaitingPaymentSales = filteredSales.filter(s => s.status === 'awaiting_payment');
  const cancelledSales = filteredSales.filter(s => s.status === 'cancelled');

  const totalRevenue = paidSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const potentialRevenue = [...pendingSales, ...awaitingPaymentSales].reduce((sum, sale) => sum + sale.totalAmount, 0);
  const lostRevenue = cancelledSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

  // Estatísticas por Método de Pagamento
  const paymentMethods = paidSales.reduce((acc, sale) => {
    if (sale.paymentMethod) {
      const method = sale.paymentMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, total: 0 };
      }
      acc[method].count++;
      acc[method].total += sale.totalAmount;
    }
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  // Top 5 Clientes
  const customerStats = filteredSales
    .filter(s => s.status === 'paid')
    .reduce((acc, sale) => {
      if (!acc[sale.customerId]) {
        acc[sale.customerId] = {
          name: sale.customerName,
          count: 0,
          total: 0,
        };
      }
      acc[sale.customerId].count++;
      acc[sale.customerId].total += sale.totalAmount;
      return acc;
    }, {} as Record<string, { name: string; count: number; total: number }>);

  const topCustomers = Object.values(customerStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top 5 Produtos Mais Vendidos
  const productStats = filteredSales
    .filter(s => s.status === 'paid')
    .reduce((acc, sale) => {
      sale.items.forEach((item: SaleItem) => {
        if (!acc[item.productId]) {
          acc[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        acc[item.productId].quantity += item.quantity;
        acc[item.productId].revenue += item.totalPrice;
      });
      return acc;
    }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Ticket Médio
  const averageTicket = paidSales.length > 0 ? totalRevenue / paidSales.length : 0;

  // Descontos Totais
  const totalDiscounts = paidSales.reduce((sum, sale) => sum + (sale.discountAmount || 0), 0);

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: '💵 Dinheiro',
      pix: '📱 PIX',
      debit: '💳 Débito',
      credit: '💳 Crédito',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#22452B] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando relatórios...</p>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2C1810]">Relatórios e Análises</h1>
        <p className="text-[#814923] mt-2">Visualize estatísticas e insights sobre suas vendas</p>
      </div>

      {/* Tabs de navegação */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setSelectedView('dashboard')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedView === 'dashboard'
              ? 'text-[#22452B] border-b-2 border-[#22452B]'
              : 'text-gray-500 hover:text-[#22452B]'
          }`}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setSelectedView('priceHistory')}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedView === 'priceHistory'
              ? 'text-[#22452B] border-b-2 border-[#22452B]'
              : 'text-gray-500 hover:text-[#22452B]'
          }`}
        >
          📈 Histórico de Preços
        </button>
      </div>

      {selectedView === 'priceHistory' ? (
        <div className="space-y-6">
          {/* Gráfico de Linhas por Categoria */}
          {(() => {
            const productsWithHistory = products.filter(p => p.priceHistory && p.priceHistory.length > 0 && p.category);
            
            if (productsWithHistory.length === 0) {
              return null;
            }

            // Agrupar produtos por categoria
            const productsByCategory = productsWithHistory.reduce((acc, product) => {
              const category = product.category || 'Sem Categoria';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(product);
              return acc;
            }, {} as Record<string, typeof productsWithHistory>);

            // Coletar todas as datas únicas de todos os produtos
            const allDates = new Set<string>();
            productsWithHistory.forEach(product => {
              // Adicionar data de criação
              allDates.add(new Date(product.createdAt).toISOString());
              // Adicionar datas do histórico
              product.priceHistory?.forEach(h => {
                allDates.add(new Date(h.date).toISOString());
              });
            });

            // Ordenar datas
            const sortedDates = Array.from(allDates).sort();

            // Preparar dados para o gráfico agrupados por categoria
            const chartData = sortedDates.map(dateStr => {
              const date = new Date(dateStr);
              const dataPoint: any = {
                date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
                fullDate: date,
              };

              // Para cada categoria, calcular preço médio nessa data
              Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
                const pricesAtDate: number[] = [];
                
                categoryProducts.forEach(product => {
                  const productHistory = product.priceHistory || [];
                  let priceAtDate = null;
                  
                  // Verificar histórico ordenado cronologicamente
                  const sortedHistory = [...productHistory].sort((a, b) => 
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  
                  for (const h of sortedHistory) {
                    if (new Date(h.date) <= date) {
                      priceAtDate = h.price;
                    } else {
                      break;
                    }
                  }
                  
                  // Se não encontrou no histórico, usar preço atual se a data for após a criação
                  if (priceAtDate === null && new Date(product.createdAt) <= date) {
                    priceAtDate = product.price;
                  }
                  
                  if (priceAtDate !== null) {
                    pricesAtDate.push(priceAtDate);
                  }
                });
                
                // Calcular preço médio da categoria nessa data
                if (pricesAtDate.length > 0) {
                  const avgPrice = pricesAtDate.reduce((sum, p) => sum + p, 0) / pricesAtDate.length;
                  dataPoint[category] = avgPrice;
                }
              });

              return dataPoint;
            });

            // Cores para as linhas
            const colors = ['#22452B', '#AF6138', '#B49959', '#5D663D', '#814923', '#2C5A38', '#C17A4F', '#D4AF37', '#6B7B42', '#A05A2C'];
            const categories = Object.keys(productsByCategory);

            return (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-[#2C1810] mb-6">Gráfico de Evolução de Preços por Categoria</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Mostra o preço médio de cada categoria ao longo do tempo
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`R$ ${value.toFixed(2)} (média)`, '']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    {categories.map((category, idx) => (
                      <Line
                        key={category}
                        type="monotone"
                        dataKey={category}
                        name={`${category} (${productsByCategory[category].length} produto${productsByCategory[category].length > 1 ? 's' : ''})`}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* Tabelas de Histórico Detalhado */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-[#2C1810] mb-6">Histórico Detalhado por Produto</h2>
            
            <div className="space-y-6">
            {products
              .filter(product => product.priceHistory && product.priceHistory.length > 0)
              .map(product => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#2C1810]">{product.name}</h3>
                      {product.category && (
                        <span className="text-sm text-gray-500">{product.category}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Preço Atual</p>
                      <p className="text-xl font-bold text-[#22452B]">R$ {product.price.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Histórico de Mudanças:</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Preço</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Variação</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Motivo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {product.priceHistory!
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((history, idx, arr) => {
                              const previousPrice = idx < arr.length - 1 ? arr[idx + 1].price : product.price;
                              const variation = history.price - previousPrice;
                              const variationPercent = previousPrice > 0 ? (variation / previousPrice) * 100 : 0;
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {new Date(history.date).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                                    R$ {history.price.toFixed(2)}
                                  </td>
                                  <td className="px-4 py-2 text-sm">
                                    {variation !== 0 && (
                                      <span className={`font-medium ${variation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {variation > 0 ? '+' : ''}R$ {variation.toFixed(2)} ({variation > 0 ? '+' : ''}{variationPercent.toFixed(1)}%)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    {history.reason || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            
            {products.filter(p => p.priceHistory && p.priceHistory.length > 0).length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Nenhum histórico de preços
                </h3>
                <p className="text-gray-500">
                  Alterações de preços aparecerão aqui quando você atualizar os preços dos produtos
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      ) : (
        <>
      {/* Dashboard - continua aqui */}

      {/* Filtros de Data */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#2C1810] mb-4">Período de Análise</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'today'
                  ? 'bg-[#22452B] text-white'
                  : 'bg-[#EEF2E8] text-[#5D663D] hover:bg-[#22452B] hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'week'
                  ? 'bg-[#22452B] text-white'
                  : 'bg-[#EEF2E8] text-[#5D663D] hover:bg-[#22452B] hover:text-white'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'month'
                  ? 'bg-[#22452B] text-white'
                  : 'bg-[#EEF2E8] text-[#5D663D] hover:bg-[#22452B] hover:text-white'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'year'
                  ? 'bg-[#22452B] text-white'
                  : 'bg-[#EEF2E8] text-[#5D663D] hover:bg-[#22452B] hover:text-white'
              }`}
            >
              Este Ano
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'all'
                  ? 'bg-[#22452B] text-white'
                  : 'bg-[#EEF2E8] text-[#5D663D] hover:bg-[#22452B] hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>
          
          <div className="flex gap-2 items-center ml-auto">
            <label className="text-sm text-[#814923]">De:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-[#B49959] rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
            />
            <label className="text-sm text-[#814923]">Até:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-[#B49959] rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Receita Total */}
        <div className="bg-gradient-to-br from-[#22452B] to-[#1A3521] rounded-lg shadow-md p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[#B49959]">Receita Total</h3>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold">R$ {totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-[#B49959] mt-1">{paidSales.length} vendas pagas</p>
        </div>

        {/* Receita Pendente */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-[#B49959]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[#814923]">Receita Pendente</h3>
            <svg className="w-6 h-6 text-[#B49959]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-[#2C1810]">R$ {potentialRevenue.toFixed(2)}</p>
          <p className="text-xs text-[#814923] mt-1">{pendingSales.length + awaitingPaymentSales.length} vendas pendentes</p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-[#AF6138]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[#814923]">Ticket Médio</h3>
            <svg className="w-6 h-6 text-[#AF6138]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-[#2C1810]">R$ {averageTicket.toFixed(2)}</p>
          <p className="text-xs text-[#814923] mt-1">Por venda paga</p>
        </div>

        {/* Descontos Concedidos */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-[#5D663D]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-[#814923]">Descontos Totais</h3>
            <svg className="w-6 h-6 text-[#5D663D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-[#2C1810]">R$ {totalDiscounts.toFixed(2)}</p>
          <p className="text-xs text-[#814923] mt-1">Em {paidSales.filter(s => s.discountAmount > 0).length} vendas</p>
        </div>
      </div>

      {/* Status das Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Status das Vendas</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-[#EEF2E8] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#22452B] rounded-full"></div>
                <span className="text-[#2C1810] font-medium">Pagas</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#22452B]">{paidSales.length}</p>
                <p className="text-xs text-[#814923]">
                  {totalSales > 0 ? ((paidSales.length / totalSales) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-[#FFF9F0] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#B49959] rounded-full"></div>
                <span className="text-[#2C1810] font-medium">Aguardando Pagamento</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#B49959]">{awaitingPaymentSales.length}</p>
                <p className="text-xs text-[#814923]">
                  {totalSales > 0 ? ((awaitingPaymentSales.length / totalSales) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-[#F5EFE7] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#5D663D] rounded-full"></div>
                <span className="text-[#2C1810] font-medium">Pendentes</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#5D663D]">{pendingSales.length}</p>
                <p className="text-xs text-[#814923]">
                  {totalSales > 0 ? ((pendingSales.length / totalSales) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-4 bg-[#FFEDD5] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#AF6138] rounded-full"></div>
                <span className="text-[#2C1810] font-medium">Canceladas</span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#AF6138]">{cancelledSales.length}</p>
                <p className="text-xs text-[#814923]">
                  {totalSales > 0 ? ((cancelledSales.length / totalSales) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Métodos de Pagamento */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Métodos de Pagamento</h2>
          {Object.keys(paymentMethods).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(paymentMethods).map(([method, data]) => (
                <div key={method} className="p-4 bg-[#EEF2E8] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#2C1810] font-medium">{getPaymentMethodLabel(method)}</span>
                    <span className="text-sm text-[#814923]">{data.count} vendas</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-2xl font-bold text-[#22452B]">R$ {data.total.toFixed(2)}</p>
                    <p className="text-xs text-[#814923]">
                      {((data.total / totalRevenue) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#814923]">
              <p>Nenhuma venda paga no período selecionado</p>
            </div>
          )}
        </div>
      </div>

      {/* Top 5 Clientes e Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Top 5 Clientes</h2>
          {topCustomers.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-[#EEF2E8] rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#22452B] text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#2C1810]">{customer.name}</p>
                    <p className="text-sm text-[#814923]">{customer.count} compras</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#22452B]">R$ {customer.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#814923]">
              <p>Nenhuma venda paga no período selecionado</p>
            </div>
          )}
        </div>

        {/* Top 5 Produtos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Top 5 Produtos Mais Vendidos</h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-[#F5EFE7] rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#AF6138] text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#2C1810]">{product.name}</p>
                    <p className="text-sm text-[#814923]">{product.quantity} unidades vendidas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#AF6138]">R$ {product.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#814923]">
              <p>Nenhuma venda paga no período selecionado</p>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
