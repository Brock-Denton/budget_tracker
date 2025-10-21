import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Calendar } from 'lucide-react';
import { supabase, User, Category, Expense, Income } from '../lib/supabase';
import BottomNavigation from './BottomNavigation';
import './AnalyticsScreen.css';

interface AnalyticsScreenProps {
  userId: string;
  currentUser: { id: string; name: string; color: string };
}

interface MonthlyData {
  month: string;
  year: number;
  monthNumber: number;
  income: number;
  expenses: number;
  netIncome: number;
  userExpenses: { [userId: string]: number };
  categoryExpenses: { [categoryId: string]: { amount: number; name: string; color: string } };
  overBudgetCategories: string[];
}

interface AnalyticsData {
  monthlyData: MonthlyData[];
  totalIncome: number;
  totalExpenses: number;
  totalNetIncome: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  averageMonthlyNet: number;
  topSpendingUsers: { user: User; totalSpent: number; percentage: number }[];
  topCategories: { category: Category; totalSpent: number; percentage: number }[];
  overBudgetCount: number;
  startDate: string;
}

const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ userId, currentUser }) => {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all users and categories
      const [usersResult, categoriesResult] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('categories').select('*').order('name')
      ]);

      if (usersResult.error) throw usersResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setUsers(usersResult.data || []);
      setCategories(categoriesResult.data || []);

      // Get the earliest transaction date to determine start month
      const { data: earliestExpense } = await supabase
        .from('expenses')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      const { data: earliestIncome } = await supabase
        .from('income')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      const startDate = earliestExpense?.[0]?.created_at || earliestIncome?.[0]?.created_at || new Date().toISOString();
      const startMonth = new Date(startDate);
      const currentDate = new Date();

      // Generate monthly data for the selected year
      const monthlyData: MonthlyData[] = [];
      const currentYear = selectedYear;
      
      for (let monthNum = 0; monthNum < 12; monthNum++) {
        const currentMonth = new Date(currentYear, monthNum, 1);
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

        // Fetch income for this month, or use most recent income if none exists
        let { data: incomeData } = await supabase
          .from('income')
          .select('*')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        // If no income data for this month, use all recent income (for recurring income)
        if (!incomeData || incomeData.length === 0) {
          const { data: recentIncomeData } = await supabase
            .from('income')
            .select('*')
            .order('created_at', { ascending: false });
          incomeData = recentIncomeData;
        }

        // Fetch expenses for this month
        const { data: expenseData } = await supabase
          .from('expenses')
          .select(`
            *,
            users:user_id (id, name, color),
            categories:category_id (id, name, color, budget)
          `)
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        const monthIncome = incomeData?.reduce((sum, income) => sum + income.amount, 0) || 0;
        const monthExpenses = expenseData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
        const netIncome = monthIncome - monthExpenses;

        // Calculate user expenses
        const userExpenses: { [userId: string]: number } = {};
        usersResult.data?.forEach(user => {
          userExpenses[user.id] = expenseData?.filter(e => e.user_id === user.id)
            .reduce((sum, expense) => sum + expense.amount, 0) || 0;
        });

        // Calculate category expenses
        const categoryExpenses: { [categoryId: string]: { amount: number; name: string; color: string } } = {};
        expenseData?.forEach(expense => {
          const categoryId = expense.category_id;
          if (!categoryExpenses[categoryId]) {
            categoryExpenses[categoryId] = {
              amount: 0,
              name: expense.categories?.name || 'Unknown',
              color: expense.categories?.color || '#6B7280'
            };
          }
          categoryExpenses[categoryId].amount += expense.amount;
        });

        // Find over-budget categories
        const overBudgetCategories: string[] = [];
        Object.entries(categoryExpenses).forEach(([categoryId, data]) => {
          const category = categoriesResult.data?.find(c => c.id === categoryId);
          if (category?.budget && data.amount > category.budget) {
            overBudgetCategories.push(categoryId);
          }
        });

        monthlyData.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          year: monthStart.getFullYear(),
          monthNumber: monthStart.getMonth(),
          income: monthIncome,
          expenses: monthExpenses,
          netIncome,
          userExpenses,
          categoryExpenses,
          overBudgetCategories
        });
      }

      // Calculate summary statistics
      const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
      const totalExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0);
      const totalNetIncome = totalIncome - totalExpenses;
      
      // Only include months with logged expenses AND that have passed (not current month)
      const now = new Date();
      const currentMonthNum = now.getMonth();
      const currentYearNum = now.getFullYear();
      
      const monthsWithExpenses = monthlyData.filter(month => {
        const monthHasExpenses = month.expenses > 0;
        const monthHasPassed = month.year < currentYearNum || 
          (month.year === currentYearNum && month.monthNumber < currentMonthNum);
        return monthHasExpenses && monthHasPassed;
      });
      const monthsWithExpensesCount = monthsWithExpenses.length;
      
      const averageMonthlyIncome = monthsWithExpensesCount > 0 ? 
        monthsWithExpenses.reduce((sum, month) => sum + month.income, 0) / monthsWithExpensesCount : 0;
      const averageMonthlyExpenses = monthsWithExpensesCount > 0 ? 
        monthsWithExpenses.reduce((sum, month) => sum + month.expenses, 0) / monthsWithExpensesCount : 0;
      const averageMonthlyNet = averageMonthlyIncome - averageMonthlyExpenses;

      // Calculate top spending users
      const userTotals: { [userId: string]: number } = {};
      monthlyData.forEach(month => {
        Object.entries(month.userExpenses).forEach(([userId, amount]) => {
          userTotals[userId] = (userTotals[userId] || 0) + amount;
        });
      });

      const topSpendingUsers = usersResult.data?.map(user => {
        const totalSpent = userTotals[user.id] || 0;
        const percentage = totalExpenses > 0 ? (totalSpent / totalExpenses) * 100 : 0;
        return { user, totalSpent, percentage };
      }).sort((a, b) => b.totalSpent - a.totalSpent) || [];

      // Calculate top categories
      const categoryTotals: { [categoryId: string]: { amount: number; category: Category } } = {};
      monthlyData.forEach(month => {
        Object.entries(month.categoryExpenses).forEach(([categoryId, data]) => {
          const category = categoriesResult.data?.find(c => c.id === categoryId);
          if (category) {
            if (!categoryTotals[categoryId]) {
              categoryTotals[categoryId] = { amount: 0, category };
            }
            categoryTotals[categoryId].amount += data.amount;
          }
        });
      });

      const topCategories = Object.values(categoryTotals).map(({ amount, category }) => ({
        category,
        totalSpent: amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      })).sort((a, b) => b.totalSpent - a.totalSpent);

      const overBudgetCount = monthlyData.filter(month => month.overBudgetCategories.length > 0).length;

      setAnalyticsData({
        monthlyData,
        totalIncome,
        totalExpenses,
        totalNetIncome,
        averageMonthlyIncome,
        averageMonthlyExpenses,
        averageMonthlyNet,
        topSpendingUsers,
        topCategories,
        overBudgetCount,
        startDate
      });

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      alert('Error loading analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedYear]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Auto-scroll to current month on mobile
  useEffect(() => {
    if (analyticsData?.monthlyData) {
      const currentMonth = new Date().getMonth();
      const currentMonthIndex = analyticsData.monthlyData.findIndex(
        month => month.monthNumber === currentMonth
      );
      
      if (currentMonthIndex !== -1) {
        // Small delay to ensure DOM is rendered
        setTimeout(() => {
          const chartContainer = document.querySelector('.monthly-chart');
          if (chartContainer) {
            const monthBar = chartContainer.children[currentMonthIndex] as HTMLElement;
            if (monthBar) {
              monthBar.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest', 
                inline: 'center' 
              });
            }
          }
        }, 100);
      }
    }
  }, [analyticsData]);

  const handleTabChange = (tab: 'home' | 'summary' | 'income' | 'analytics') => {
    console.log('🔵 AnalyticsScreen handleTabChange called with:', tab);
    if (tab === 'home') {
      console.log('🔵 AnalyticsScreen navigating to home (/)');
      navigate('/');
    } else {
      console.log('🔵 AnalyticsScreen setting activeTab to:', tab);
      navigate(`/app/${userId}?tab=${tab}`);
    }
  };

  const getNetIncomeColor = (netIncome: number) => {
    if (netIncome > 0) return '#10B981'; // Green for profit
    if (netIncome < 0) return '#EF4444'; // Red for loss
    return '#F59E0B'; // Yellow for break-even
  };

  const getNetIncomeIcon = (netIncome: number) => {
    if (netIncome > 0) return <TrendingUp size={20} />;
    if (netIncome < 0) return <TrendingDown size={20} />;
    return <DollarSign size={20} />;
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (!analyticsData) {
    return <div className="error">No analytics data available</div>;
  }

  return (
    <div className="analytics-screen">
      <div className="screen-header">
        <div></div>
        <h1>Analytics</h1>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Total Net</span>
            <span 
              className="stat-value"
              style={{ color: getNetIncomeColor(analyticsData.totalNetIncome) }}
            >
              {getNetIncomeIcon(analyticsData.totalNetIncome)}
              ${Math.abs(analyticsData.totalNetIncome).toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Year Navigation */}
      <div className="year-navigation">
        <button 
          onClick={() => setSelectedYear(selectedYear - 1)}
          className="year-nav-button"
        >
          ← {selectedYear - 1}
        </button>
        <h2 className="current-year">{selectedYear}</h2>
        <button 
          onClick={() => setSelectedYear(selectedYear + 1)}
          className="year-nav-button"
        >
          {selectedYear + 1} →
        </button>
      </div>

      {/* Monthly Overview Chart */}
      <div className="chart-section">
        <h3>Monthly Overview</h3>
        <div className="monthly-chart">
          {analyticsData.monthlyData.map((month, index) => (
            <div 
              key={`${month.year}-${month.monthNumber}`}
              className="month-bar"
              onClick={() => setSelectedMonth(month)}
            >
              <div className="bars-container">
                {/* Income Bar - Always Full Height */}
                <div className="income-bar">
                  <div className="bar-fill income-fill" />
                </div>
                
                {/* Expense Bar - Shows Budget Outline with Expense Segments */}
                <div className="expense-bar">
                  {/* User Expense Segments */}
                  <div className="expense-segments">
                    {users
                      .map(user => ({
                        user,
                        amount: month.userExpenses[user.id] || 0
                      }))
                      .filter(({ amount }) => amount > 0)
                      .sort((a, b) => b.amount - a.amount)
                      .map(({ user, amount }) => {
                        const userPercentage = month.expenses > 0 ? (amount / month.expenses) * 100 : 0;
                        const expensePercentageOfIncome = month.income > 0 ? (month.expenses / month.income) * 100 : 0;
                        const segmentHeight = (userPercentage / 100) * expensePercentageOfIncome;
                        return (
                          <div
                            key={user.id}
                            className="user-expense-segment"
                            style={{
                              height: `${segmentHeight}%`,
                              backgroundColor: user.color
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              </div>
              
              {/* Net Income Indicator */}
              <div 
                className="net-indicator"
                style={{ backgroundColor: getNetIncomeColor(month.netIncome) }}
              >
                {month.netIncome > 0 ? '+' : ''}${month.netIncome.toFixed(0)}
              </div>
              
              {/* Month Label */}
              <div className="month-label">{month.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-title">Avg Monthly Net</div>
            <div 
              className="stat-number"
              style={{ color: getNetIncomeColor(analyticsData.averageMonthlyNet) }}
            >
              ${analyticsData.averageMonthlyNet.toFixed(0)}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-title">Top Spender</div>
            <div className="stat-number">
              {analyticsData.topSpendingUsers[0]?.user.name || 'N/A'}
            </div>
            <div className="stat-subtitle">
              ${analyticsData.topSpendingUsers[0]?.totalSpent.toFixed(0) || '0'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-title">Over Budget</div>
            <div className="stat-number">{analyticsData.overBudgetCount}</div>
            <div className="stat-subtitle">months</div>
          </div>
        </div>
      </div>

      {/* Month Detail Modal */}
      {selectedMonth && (
        <div className="modal-overlay" onClick={() => setSelectedMonth(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMonth.month} {selectedMonth.year} Details</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedMonth(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="month-summary">
                <div className="summary-item">
                  <span className="summary-label">Income:</span>
                  <span className="summary-value income">${selectedMonth.income.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Expenses:</span>
                  <span className="summary-value expense">${selectedMonth.expenses.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Net Income:</span>
                  <span 
                    className="summary-value"
                    style={{ color: getNetIncomeColor(selectedMonth.netIncome) }}
                  >
                    ${selectedMonth.netIncome.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="user-breakdown">
                <h4>Spending by User</h4>
                {users.map(user => {
                  const amount = selectedMonth.userExpenses[user.id] || 0;
                  const percentage = selectedMonth.expenses > 0 ? (amount / selectedMonth.expenses) * 100 : 0;
                  return (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <div 
                          className="user-color"
                          style={{ backgroundColor: user.color }}
                        />
                        <span className="user-name">{user.name}</span>
                      </div>
                      <div className="user-amount">
                        ${amount.toFixed(2)} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedMonth.overBudgetCategories.length > 0 && (
                <div className="over-budget-section">
                  <h4>Over Budget Categories</h4>
                  {selectedMonth.overBudgetCategories.map(categoryId => {
                    const category = categories.find(c => c.id === categoryId);
                    const spent = selectedMonth.categoryExpenses[categoryId]?.amount || 0;
                    return (
                      <div key={categoryId} className="over-budget-item">
                        <div 
                          className="category-color"
                          style={{ backgroundColor: category?.color || '#6B7280' }}
                        />
                        <span className="category-name">{category?.name || 'Unknown'}</span>
                        <span className="over-amount">
                          Over by ${(spent - (category?.budget || 0)).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Income Management Button */}
      <div className="income-management-section">
        <button 
          onClick={() => navigate(`/app/${userId}?tab=income`)}
          className="income-management-button"
        >
          <span className="income-icon">💰</span>
          Manage Income
        </button>
      </div>

      <BottomNavigation 
        activeTab="analytics" 
        onTabChange={handleTabChange} 
      />
    </div>
  );
};

export default AnalyticsScreen;
