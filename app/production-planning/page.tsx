'use client';

import { useState, useEffect } from 'react';
import { Product, Order, Material } from '@/types';
import productService from '@/services/productService';
import orderService from '@/services/orderService';
import materialService from '@/services/materialService';

interface ProductionPlan {
  productId: string;
  productName: string;
  productWeight?: string; // Peso da vela
  currentStock: number;
  pendingOrders: number; // Total nas encomendas
  manualQuantity: number; // Quantidade manual definida pelo usuário
  totalToProduce: number; // Total a produzir
  materialsNeeded: MaterialNeeded[];
}

interface MaterialNeeded {
  materialId: string;
  materialName: string;
  unit: string;
  quantityNeeded: number;
  currentStock: number;
  deficit: number; // Quanto falta (se negativo)
  costPerUnit: number;
  totalCost: number;
}

export default function ProductionPlanningPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlan | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, ordersData, materialsData] = await Promise.all([
        productService.getAll(),
        orderService.getAll(),
        materialService.getAll(),
      ]);
      
      setProducts(productsData);
      setOrders(ordersData);
      setMaterials(materialsData);
      
      // Calcular planejamento inicial
      calculateProductionPlans(productsData, ordersData, materialsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const calculateProductionPlans = (
    productsData: Product[],
    ordersData: Order[],
    materialsData: Material[],
    manualQuantities?: Map<string, number>
  ) => {
    // Filtrar apenas encomendas pendentes ou em produção
    const activeOrders = ordersData.filter(
      order => order.status === 'Pending' || order.status === 'InProduction'
    );

    // Agrupar quantidades por produto
    const orderQuantities = new Map<string, number>();
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        const current = orderQuantities.get(item.productId) || 0;
        orderQuantities.set(item.productId, current + item.quantity);
      });
    });

    const plans: ProductionPlan[] = productsData.map(product => {
      const pendingOrders = orderQuantities.get(product.id) || 0;
      const manualQuantity = manualQuantities?.get(product.id) || 0;
      const totalToProduce = pendingOrders + manualQuantity;

      // Calcular materiais necessários
      const materialsNeeded: MaterialNeeded[] = [];
      
      if (product.productionMaterials && product.productionMaterials.length > 0) {
        product.productionMaterials.forEach(pm => {
          const material = materialsData.find(m => m.id === pm.materialId);
          const quantityNeeded = pm.quantity * totalToProduce;
          const currentStock = material?.currentStock || 0;
          const deficit = currentStock - quantityNeeded;

          materialsNeeded.push({
            materialId: pm.materialId,
            materialName: pm.materialName,
            unit: pm.unit,
            quantityNeeded: quantityNeeded,
            currentStock: currentStock,
            deficit: deficit,
            costPerUnit: pm.costPerUnit,
            totalCost: quantityNeeded * pm.costPerUnit,
          });
        });
      }

      return {
        productId: product.id,
        productName: product.name,
        productWeight: product.weight,
        currentStock: product.quantity,
        pendingOrders: pendingOrders,
        manualQuantity: manualQuantity,
        totalToProduce: totalToProduce,
        materialsNeeded: materialsNeeded,
      };
    });

    // Ordenar: produtos com encomendas primeiro
    plans.sort((a, b) => {
      if (a.pendingOrders > 0 && b.pendingOrders === 0) return -1;
      if (a.pendingOrders === 0 && b.pendingOrders > 0) return 1;
      return b.totalToProduce - a.totalToProduce;
    });

    setProductionPlans(plans);
  };

  const handleManualQuantityChange = (productId: string, quantity: number) => {
    const manualQuantities = new Map<string, number>();
    productionPlans.forEach(plan => {
      if (plan.manualQuantity > 0) {
        manualQuantities.set(plan.productId, plan.manualQuantity);
      }
    });
    manualQuantities.set(productId, quantity);
    
    calculateProductionPlans(products, orders, materials, manualQuantities);
  };

  const getTotalMaterialsNeeded = () => {
    const materialsMap = new Map<string, MaterialNeeded>();

    productionPlans.forEach(plan => {
      plan.materialsNeeded.forEach(material => {
        const existing = materialsMap.get(material.materialId);
        if (existing) {
          existing.quantityNeeded += material.quantityNeeded;
          existing.totalCost += material.totalCost;
          existing.deficit = existing.currentStock - existing.quantityNeeded;
        } else {
          materialsMap.set(material.materialId, { ...material });
        }
      });
    });

    return Array.from(materialsMap.values()).sort((a, b) => {
      if (a.deficit < 0 && b.deficit >= 0) return -1;
      if (a.deficit >= 0 && b.deficit < 0) return 1;
      return a.materialName.localeCompare(b.materialName);
    });
  };

  const getTotalProductionCost = () => {
    return productionPlans.reduce((sum, plan) => {
      const planCost = plan.materialsNeeded.reduce((s, m) => s + m.totalCost, 0);
      return sum + planCost;
    }, 0);
  };

  const getProductsNeedingProduction = () => {
    return productionPlans.filter(plan => plan.totalToProduce > 0);
  };

  const getMaterialsInDeficit = () => {
    return getTotalMaterialsNeeded().filter(m => m.deficit < 0);
  };

  const printProductionPlan = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const productsNeedingProduction = getProductsNeedingProduction();
    const totalMaterials = getTotalMaterialsNeeded();
    const totalCost = getTotalProductionCost();
    const materialsInDeficit = getMaterialsInDeficit();

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Planejamento de Produção - ${new Date().toLocaleDateString('pt-BR')}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            font-size: 11px;
          }
          h1 {
            text-align: center;
            color: #333;
            border-bottom: 2px solid #7c3aed;
            padding-bottom: 8px;
            margin: 0 0 15px 0;
            font-size: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
          }
          th, td {
            border: 1px solid #999;
            padding: 6px 8px;
            text-align: left;
          }
          th {
            background-color: #7c3aed;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            padding: 8px;
          }
          tbody tr {
            height: auto;
          }
          tbody tr:nth-child(odd) {
            background-color: #f9f9f9;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-purple { color: #7c3aed; }
          .bg-red { background-color: #ffe6e6; }
          .warning-icon {
            color: #ef4444;
            font-weight: bold;
            margin-right: 3px;
          }
          tfoot tr {
            background-color: #f3f4f6 !important;
            font-weight: bold;
          }
          @media print {
            body { 
              margin: 0;
              padding: 5mm;
            }
            h1 {
              font-size: 18px;
              margin-bottom: 10px;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            button { display: none !important; }
          }
        </style>
      </head>
      <body>
        <h1 style="margin-bottom: 20px;">📋 Lista de Produção</h1>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;" class="text-center">Nº</th>
              <th>Produto</th>
              <th class="text-center" style="width: 60px;">Peso</th>
              <th class="text-center" style="width: 80px;">Qtd.</th>
              <th style="width: 180px;">Observações</th>
            </tr>
          </thead>
          <tbody>
            ${productsNeedingProduction.map((plan, index) => {
              const hasMaterialDeficit = plan.materialsNeeded.some(m => m.deficit < 0);
              const observations = [];
              if (plan.pendingOrders > 0) observations.push(`${plan.pendingOrders} encomenda(s)`);
              if (plan.manualQuantity > 0) observations.push(`${plan.manualQuantity} manual`);
              if (hasMaterialDeficit) observations.push('⚠️ Verificar materiais');
              
              return `
                <tr ${hasMaterialDeficit ? 'class="bg-red"' : ''}>
                  <td class="text-center font-bold" style="font-size: 10px;">${index + 1}</td>
                  <td class="font-bold">
                    ${plan.productName}
                  </td>
                  <td class="text-center">${plan.productWeight || '-'}</td>
                  <td class="text-center" style="font-size: 16px; font-weight: bold; color: #7c3aed;">
                    ${plan.totalToProduce}
                  </td>
                  <td style="font-size: 10px; color: #555;">
                    ${observations.join(' • ')}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #e5e7eb; font-weight: bold;">
              <td colspan="3" class="text-right" style="padding: 10px; font-size: 12px;">TOTAL:</td>
              <td class="text-center" style="font-size: 18px; font-weight: bold; color: #7c3aed; padding: 10px;">
                ${productionPlans.reduce((sum, p) => sum + p.totalToProduce, 0)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <button onclick="window.print()" style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #7c3aed;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          🖨️ Imprimir
        </button>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planejamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planejamento de Produção</h1>
          <p className="text-gray-600 mt-2">
            Calcule a produção necessária com base em encomendas, estoque e metas
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={printProductionPlan}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={loadData}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Produtos a Produzir</p>
              <p className="text-2xl font-bold text-purple-600">
                {getProductsNeedingProduction().length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unidades Totais</p>
              <p className="text-2xl font-bold text-blue-600">
                {productionPlans.reduce((sum, p) => sum + p.totalToProduce, 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Custo Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {getTotalProductionCost().toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Materiais em Falta</p>
              <p className="text-2xl font-bold text-red-600">
                {getMaterialsInDeficit().length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Materiais em Falta */}
      {getMaterialsInDeficit().length > 0 && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-semibold mb-1">Atenção: Materiais Insuficientes</h3>
              <p className="text-red-700 text-sm">
                Há {getMaterialsInDeficit().length} material(is) com estoque insuficiente para a produção planejada.
                Verifique a lista de materiais necessários abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Planejamento */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Planejamento por Produto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque Atual
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Encomendas
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade Manual
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total a Produzir
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Produção
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productionPlans.map((plan) => {
                const productionCost = plan.materialsNeeded.reduce((sum, m) => sum + m.totalCost, 0);
                const hasMaterialDeficit = plan.materialsNeeded.some(m => m.deficit < 0);

                return (
                  <tr key={plan.productId} className={hasMaterialDeficit ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{plan.productName}</span>
                        {hasMaterialDeficit && (
                          <svg className="w-4 h-4 text-red-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {plan.productWeight ? (
                        <span className="text-sm text-gray-900">
                          {plan.productWeight}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          não definido
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm ${plan.currentStock === 0 ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                        {plan.currentStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm ${plan.pendingOrders > 0 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                        {plan.pendingOrders}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="number"
                        min="0"
                        value={plan.manualQuantity}
                        onChange={(e) => handleManualQuantityChange(plan.productId, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-semibold ${plan.totalToProduce > 0 ? 'text-purple-600' : 'text-gray-500'}`}>
                        {plan.totalToProduce}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">
                        R$ {productionCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowMaterialsModal(true);
                        }}
                        disabled={plan.totalToProduce === 0}
                        className="text-purple-600 hover:text-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Ver Materiais
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo de Materiais Necessários */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Resumo de Materiais Necessários</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Necessário
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Em Estoque
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getTotalMaterialsNeeded().map((material) => (
                <tr key={material.materialId} className={material.deficit < 0 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{material.materialName}</span>
                      {material.deficit < 0 && (
                        <svg className="w-4 h-4 text-red-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-900">
                      {material.quantityNeeded.toFixed(2)} {material.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-900">
                      {material.currentStock.toFixed(2)} {material.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-semibold ${
                      material.deficit < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {material.deficit >= 0 ? '+' : ''}{material.deficit.toFixed(2)} {material.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-gray-900">
                      R$ {material.totalCost.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Custo Total de Produção:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-lg font-bold text-green-600">
                    R$ {getTotalProductionCost().toFixed(2)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal de Materiais do Produto */}
      {showMaterialsModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPlan.productName}
                  {selectedPlan.productWeight && (
                    <span className="text-lg font-normal text-gray-600 ml-2">({selectedPlan.productWeight})</span>
                  )}
                </h2>
                <p className="text-gray-600 mt-1">
                  Materiais necessários para produzir {selectedPlan.totalToProduce} unidade(s)
                </p>
              </div>
              <button
                onClick={() => setShowMaterialsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {selectedPlan.materialsNeeded.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>Nenhum material de produção cadastrado para este produto</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Necessário</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estoque</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPlan.materialsNeeded.map((material) => (
                      <tr key={material.materialId} className={material.deficit < 0 ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {material.materialName}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                          {material.quantityNeeded.toFixed(2)} {material.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                          {material.currentStock.toFixed(2)} {material.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {material.deficit < 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Falta {Math.abs(material.deficit).toFixed(2)} {material.unit}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Suficiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          R$ {material.totalCost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        Custo Total:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                        R$ {selectedPlan.materialsNeeded.reduce((sum, m) => sum + m.totalCost, 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowMaterialsModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
