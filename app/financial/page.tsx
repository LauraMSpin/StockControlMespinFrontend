'use client';

import { useState, useEffect } from 'react';
import { Expense, InstallmentPayment, Sale } from '@/types';
import { expenseService, installmentService, saleService } from '@/services';

export default function FinancialPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [installments, setInstallments] = useState<InstallmentPayment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingInstallment, setEditingInstallment] = useState<InstallmentPayment | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Production' as Expense['category'],
    amount: '',
    date: '',
    isRecurring: false,
    notes: '',
  });

  const [installmentForm, setInstallmentForm] = useState({
    description: '',
    totalAmount: '',
    installments: '',
    startDate: '',
    category: 'Production' as InstallmentPayment['category'],
    notes: '',
  });

  useEffect(() => {
    loadData();
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1).padStart(2, '0'));
    setSelectedYear(String(now.getFullYear()));
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [expensesData, installmentsData, salesData] = await Promise.all([
        expenseService.getAll(),
        installmentService.getAll(),
        saleService.getAll(),
      ]);
      setExpenses(expensesData);
      setInstallments(installmentsData);
      setSales(salesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      Production: 'Produção',
      Investment: 'Investimento',
      FixedCost: 'Custo Fixo',
      VariableCost: 'Custo Variável',
      Equipment: 'Equipamento',
      Other: 'Outro',
      // Mantém compatibilidade com valores antigos em lowercase
      production: 'Produção',
      investment: 'Investimento',
      fixed_cost: 'Custo Fixo',
      variable_cost: 'Custo Variável',
      equipment: 'Equipamento',
      other: 'Outro',
    };
    return labels[category] || category;
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Valor inválido!');
      return;
    }

    const expenseData: Omit<Expense, 'id'> = {
      description: expenseForm.description,
      category: expenseForm.category,
      amount: amount,
      date: expenseForm.date ? new Date(expenseForm.date) : new Date(),
      isRecurring: expenseForm.isRecurring,
      notes: expenseForm.notes,
    };

    try {
      if (editingExpense) {
        await expenseService.update(editingExpense.id, expenseData);
      } else {
        await expenseService.create(expenseData);
      }

      resetExpenseForm();
      await loadData();
      setShowExpenseModal(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar despesa: ${error.message}`);
      }
    }
  };

  const handleSubmitInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const totalAmount = parseFloat(installmentForm.totalAmount);
    const installments = parseInt(installmentForm.installments);
    
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Valor total inválido!');
      return;
    }
    
    if (isNaN(installments) || installments <= 0) {
      alert('Número de parcelas inválido!');
      return;
    }

    const installmentAmount = totalAmount / installments;
    const installmentData: Omit<InstallmentPayment, 'id'> = {
      description: installmentForm.description,
      totalAmount: totalAmount,
      installments: installments,
      currentInstallment: 1,
      installmentAmount: installmentAmount,
      startDate: installmentForm.startDate ? new Date(installmentForm.startDate) : new Date(),
      category: installmentForm.category,
      notes: installmentForm.notes,
      paymentStatus: [], // O backend vai criar os registros automaticamente
    };

    try {
      if (editingInstallment) {
        await installmentService.update(editingInstallment.id, installmentData);
      } else {
        await installmentService.create(installmentData);
      }

      resetInstallmentForm();
      await loadData();
      setShowInstallmentModal(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar parcelamento: ${error.message}`);
      }
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      description: '',
      category: 'Production',
      amount: '',
      date: '',
      isRecurring: false,
      notes: '',
    });
    setEditingExpense(null);
  };

  const resetInstallmentForm = () => {
    setInstallmentForm({
      description: '',
      totalAmount: '',
      installments: '',
      startDate: '',
      category: 'Production',
      notes: '',
    });
    setEditingInstallment(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    const date = new Date(expense.date);
    const dateStr = date.toISOString().split('T')[0];
    setExpenseForm({
      description: expense.description,
      category: expense.category,
      amount: expense.amount.toString(),
      date: dateStr,
      isRecurring: expense.isRecurring,
      notes: expense.notes || '',
    });
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Deseja realmente excluir esta despesa?')) {
      try {
        await expenseService.delete(id);
        await loadData();
      } catch (error) {
        if (error instanceof Error) {
          alert(`Erro ao excluir despesa: ${error.message}`);
        }
      }
    }
  };

  const handleDeleteInstallment = async (id: string) => {
    if (confirm('Deseja realmente excluir este parcelamento?')) {
      try {
        await installmentService.delete(id);
        await loadData();
      } catch (error) {
        if (error instanceof Error) {
          alert(`Erro ao excluir parcelamento: ${error.message}`);
        }
      }
    }
  };

  const toggleInstallmentPaid = async (id: string, installmentNumber: number) => {
    const installment = installments.find(i => i.id === id);
    if (!installment) return;

    const currentStatus = installment.paymentStatus?.find(ps => ps.installmentNumber === installmentNumber);
    const currentValue = currentStatus?.isPaid || false;
    
    if (!currentValue) {
      // Tentando marcar como pago - verificar se todas anteriores estão pagas
      for (let i = 1; i < installmentNumber; i++) {
        const prevStatus = installment.paymentStatus?.find(ps => ps.installmentNumber === i);
        if (!prevStatus?.isPaid) {
          alert('⚠️ Você deve pagar as parcelas na ordem sequencial.\n\nMarque primeiro a parcela ' + i + '.');
          return;
        }
      }
    } else {
      // Tentando desmarcar - verificar se é a última paga
      let lastPaidNumber = 0;
      installment.paymentStatus?.forEach(ps => {
        if (ps.isPaid && ps.installmentNumber > lastPaidNumber) {
          lastPaidNumber = ps.installmentNumber;
        }
      });
      
      if (installmentNumber !== lastPaidNumber) {
        alert('⚠️ Você só pode desmarcar a última parcela paga.\n\nDesmarque primeiro a parcela ' + lastPaidNumber + '.');
        return;
      }
    }

    try {
      await installmentService.toggleInstallment(id, installmentNumber);
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao atualizar parcela: ${error.message}`);
      }
    }
  };

  // Cálculos financeiros do mês selecionado
  const getMonthlyFinancials = () => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);

    // Receita do mês (vendas pagas)
    const monthlyRevenue = sales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      return sale.status === 'Paid' && 
             saleDate.getMonth() + 1 === month && 
             saleDate.getFullYear() === year;
    }).reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Despesas do mês
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() + 1 === month && 
             expenseDate.getFullYear() === year;
    }).reduce((sum, expense) => sum + expense.amount, 0);

    // Despesas recorrentes (todas)
    const recurringExpenses = expenses.filter(e => e.isRecurring)
      .reduce((sum, expense) => sum + expense.amount, 0);

    // Parcelas do mês
    const monthlyInstallments = installments.reduce((sum, installment) => {
      const startDate = new Date(installment.startDate);
      const monthsSinceStart = (year - startDate.getFullYear()) * 12 + (month - (startDate.getMonth() + 1));
      
      if (monthsSinceStart >= 0 && monthsSinceStart < installment.installments) {
        const installmentNumber = monthsSinceStart + 1;
        const statusForMonth = installment.paymentStatus?.find(ps => ps.installmentNumber === installmentNumber);
        if (!statusForMonth?.isPaid) {
          return sum + installment.installmentAmount;
        }
      }
      return sum;
    }, 0);

    const totalExpenses = monthlyExpenses + recurringExpenses + monthlyInstallments;
    const netProfit = monthlyRevenue - totalExpenses;
    const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;

    // Quanto precisa vender para sair do vermelho
    const breakEven = netProfit < 0 ? Math.abs(netProfit) : 0;

    return {
      revenue: monthlyRevenue,
      expenses: totalExpenses,
      netProfit,
      profitMargin,
      breakEven,
      expenseBreakdown: {
        direct: monthlyExpenses,
        recurring: recurringExpenses,
        installments: monthlyInstallments,
      }
    };
  };

  const monthlyData = getMonthlyFinancials();

  // Lista de meses
  const months = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#AF6138] mx-auto"></div>
          <p className="mt-4 text-[#814923]">Carregando dados financeiros...</p>
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
        <h1 className="text-3xl font-bold text-[#2C1810]">Balanço Financeiro</h1>
        <p className="text-[#814923] mt-2">Controle seus investimentos, despesas e lucros</p>
      </div>

      {/* Seletor de Mês/Ano */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-[#2C1810]">Período:</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-[#B49959] rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-[#B49959] rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Resumo Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Receita */}
        <div className="bg-gradient-to-br from-[#22452B] to-[#1A3521] rounded-lg shadow-md p-6 text-white">
          <h3 className="text-sm font-medium text-[#B49959]">Receita do Mês</h3>
          <p className="text-3xl font-bold mt-2">R$ {monthlyData.revenue.toFixed(2)}</p>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-[#AF6138]">
          <h3 className="text-sm font-medium text-[#814923]">Despesas do Mês</h3>
          <p className="text-3xl font-bold text-[#AF6138] mt-2">R$ {monthlyData.expenses.toFixed(2)}</p>
        </div>

        {/* Lucro Líquido */}
        <div className={`rounded-lg shadow-md p-6 border-2 ${monthlyData.netProfit >= 0 ? 'bg-[#EEF2E8] border-[#22452B]' : 'bg-[#FFEDD5] border-[#AF6138]'}`}>
          <h3 className="text-sm font-medium text-[#814923]">Lucro Líquido</h3>
          <p className={`text-3xl font-bold mt-2 ${monthlyData.netProfit >= 0 ? 'text-[#22452B]' : 'text-[#AF6138]'}`}>
            R$ {monthlyData.netProfit.toFixed(2)}
          </p>
          <p className="text-xs text-[#814923] mt-1">
            Margem: {monthlyData.profitMargin.toFixed(1)}%
          </p>
        </div>

        {/* Meta para Sair do Vermelho */}
        {monthlyData.breakEven > 0 && (
          <div className="bg-[#FFF9F0] rounded-lg shadow-md p-6 border-2 border-[#B49959]">
            <h3 className="text-sm font-medium text-[#814923]">Falta Vender</h3>
            <p className="text-3xl font-bold text-[#B49959] mt-2">R$ {monthlyData.breakEven.toFixed(2)}</p>
            <p className="text-xs text-[#814923] mt-1">Para sair do vermelho</p>
          </div>
        )}
      </div>

      {/* Detalhamento de Despesas */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Composição das Despesas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F5EFE7] rounded-lg">
            <p className="text-sm text-[#814923]">Despesas Diretas</p>
            <p className="text-2xl font-bold text-[#2C1810]">R$ {monthlyData.expenseBreakdown.direct.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-[#EEF2E8] rounded-lg">
            <p className="text-sm text-[#814923]">Despesas Recorrentes</p>
            <p className="text-2xl font-bold text-[#2C1810]">R$ {monthlyData.expenseBreakdown.recurring.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-[#FFF9F0] rounded-lg">
            <p className="text-sm text-[#814923]">Parcelas do Mês</p>
            <p className="text-2xl font-bold text-[#2C1810]">R$ {monthlyData.expenseBreakdown.installments.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            resetExpenseForm();
            setShowExpenseModal(true);
          }}
          className="bg-[#AF6138] text-white px-6 py-3 rounded-lg hover:bg-[#814923] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nova Despesa
        </button>
        <button
          onClick={() => {
            resetInstallmentForm();
            setShowInstallmentModal(true);
          }}
          className="bg-[#B49959] text-white px-6 py-3 rounded-lg hover:bg-[#814923] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Novo Parcelamento
        </button>
      </div>

      {/* Tabelas de Despesas e Parcelamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Despesas Recentes</h2>
          {expenses.length === 0 ? (
            <p className="text-center text-[#814923] py-8">Nenhuma despesa registrada</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {expenses.slice().reverse().slice(0, 10).map(expense => (
                <div key={expense.id} className="p-4 bg-[#F5EFE7] rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#2C1810]">{expense.description}</h3>
                      <p className="text-sm text-[#814923]">{getCategoryLabel(expense.category)}</p>
                      <p className="text-xs text-[#814923] mt-1">
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </p>
                      {expense.isRecurring && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-[#B49959] text-white rounded">
                          Recorrente
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#AF6138]">R$ {expense.amount.toFixed(2)}</p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="text-[#5D663D] hover:text-[#22452B] text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-[#AF6138] hover:text-[#814923] text-xs"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Parcelamentos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#2C1810] mb-4">Parcelamentos Ativos</h2>
          {installments.length === 0 ? (
            <p className="text-center text-[#814923] py-8">Nenhum parcelamento registrado</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {installments.map(installment => {
                const paidCount = installment.paymentStatus?.filter(ps => ps.isPaid).length || 0;
                return (
                  <div key={installment.id} className="p-4 bg-[#EEF2E8] rounded-lg">
                    <div className="mb-2">
                      <h3 className="font-semibold text-[#2C1810]">{installment.description}</h3>
                      <p className="text-sm text-[#814923]">{getCategoryLabel(installment.category)}</p>
                      <p className="text-xs text-[#814923] mt-1">
                        {paidCount}/{installment.installments} parcelas pagas
                      </p>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-[#814923]">
                        {installment.installments}x de R$ {installment.installmentAmount.toFixed(2)}
                      </p>
                      <p className="text-lg font-bold text-[#22452B]">
                        Total: R$ {installment.totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Array.from({ length: installment.installments }, (_, index) => {
                        const installmentNumber = index + 1;
                        const status = installment.paymentStatus?.find(ps => ps.installmentNumber === installmentNumber);
                        const paid = status?.isPaid || false;
                        
                        // Verifica se pode marcar (todas anteriores estão pagas)
                        let canMark = !paid;
                        if (installmentNumber > 1) {
                          for (let i = 1; i < installmentNumber; i++) {
                            const prevStatus = installment.paymentStatus?.find(ps => ps.installmentNumber === i);
                            if (!prevStatus?.isPaid) {
                              canMark = false;
                              break;
                            }
                          }
                        }
                        
                        // Verifica se pode desmarcar (é a última paga)
                        let lastPaidNumber = 0;
                        installment.paymentStatus?.forEach(ps => {
                          if (ps.isPaid && ps.installmentNumber > lastPaidNumber) {
                            lastPaidNumber = ps.installmentNumber;
                          }
                        });
                        const canUnmark = paid && (lastPaidNumber === installmentNumber);
                        
                        // Determina se está habilitado
                        const isEnabled = canMark || canUnmark;
                        
                        return (
                          <button
                            key={installmentNumber}
                            onClick={() => toggleInstallmentPaid(installment.id, installmentNumber)}
                            disabled={!isEnabled}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                              paid 
                                ? canUnmark
                                  ? 'bg-[#22452B] text-white hover:bg-[#AF6138] cursor-pointer'
                                  : 'bg-[#22452B] text-white opacity-60 cursor-not-allowed'
                                : canMark
                                  ? 'bg-[#FFF9F0] text-[#814923] hover:bg-[#B49959] hover:text-white cursor-pointer'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                            }`}
                            title={
                              paid 
                                ? canUnmark 
                                  ? 'Clique para desmarcar' 
                                  : 'Desmarque as parcelas anteriores primeiro'
                                : canMark
                                  ? 'Clique para marcar como paga'
                                  : 'Marque as parcelas anteriores primeiro'
                            }
                          >
                            {installmentNumber}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => handleDeleteInstallment(installment.id)}
                      className="text-[#AF6138] hover:text-[#814923] text-xs"
                    >
                      Excluir Parcelamento
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nova Despesa */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#2C1810] mb-6">
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </h2>
            <form onSubmit={handleSubmitExpense}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria *
                    </label>
                    <select
                      required
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as Expense['category'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    >
                      <option value="Production">Produção (materiais, insumos)</option>
                      <option value="Investment">Investimento (aplicações no negócio)</option>
                      <option value="FixedCost">Custo Fixo (MEI, aluguel, internet)</option>
                      <option value="VariableCost">Custo Variável (luz, água)</option>
                      <option value="Other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={expenseForm.isRecurring}
                    onChange={(e) => setExpenseForm({ ...expenseForm, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-[#22452B] border-gray-300 rounded focus:ring-[#22452B]"
                  />
                  <label htmlFor="recurring" className="text-sm text-gray-700">
                    Despesa recorrente mensal
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseModal(false);
                    resetExpenseForm();
                  }}
                  className="px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#AF6138] text-white rounded-lg hover:bg-[#814923] transition-colors"
                >
                  {editingExpense ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Parcelamento */}
      {showInstallmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#2C1810] mb-6">
              {editingInstallment ? 'Editar Parcelamento' : 'Novo Parcelamento'}
            </h2>
            <form onSubmit={handleSubmitInstallment}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={installmentForm.description}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor Total *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={installmentForm.totalAmount}
                      onChange={(e) => setInstallmentForm({ ...installmentForm, totalAmount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Parcelas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={installmentForm.installments}
                      onChange={(e) => setInstallmentForm({ ...installmentForm, installments: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>
                </div>

                {installmentForm.totalAmount && installmentForm.installments && (
                  <div className="p-3 bg-[#EEF2E8] rounded-lg">
                    <p className="text-sm text-[#814923]">
                      Valor de cada parcela: 
                      <span className="font-bold text-[#22452B] ml-2">
                        R$ {(parseFloat(installmentForm.totalAmount) / parseInt(installmentForm.installments)).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria *
                    </label>
                    <select
                      required
                      value={installmentForm.category}
                      onChange={(e) => setInstallmentForm({ ...installmentForm, category: e.target.value as InstallmentPayment['category'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    >
                      <option value="Production">Produção (materiais)</option>
                      <option value="Investment">Investimento (negócio)</option>
                      <option value="Equipment">Equipamento (máquinas)</option>
                      <option value="Other">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      required
                      value={installmentForm.startDate}
                      onChange={(e) => setInstallmentForm({ ...installmentForm, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={installmentForm.notes}
                    onChange={(e) => setInstallmentForm({ ...installmentForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22452B] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowInstallmentModal(false);
                    resetInstallmentForm();
                  }}
                  className="px-6 py-2 border border-[#814923] rounded-lg text-[#814923] hover:bg-[#F5EFE7] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#B49959] text-white rounded-lg hover:bg-[#814923] transition-colors"
                >
                  {editingInstallment ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
