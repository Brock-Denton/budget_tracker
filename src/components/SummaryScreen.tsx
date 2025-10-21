import React, { useState, useEffect, useCallback } from 'react';
import { Edit3, ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { supabase, Category, Expense, Income } from '../lib/supabase';
import { User } from '../lib/supabase';
import './SummaryScreen.css';

interface SummaryScreenProps {
  userId: string;
  currentUser: User;
}

type Period = 'day' | 'week' | 'month' | 'year';

interface UserExpense {
  userId: string;
  userName: string;
  userColor: string;
  amount: number;
}

interface CategorySummary {
  category: Category;
  spent: number;
  budget?: number | null;
  remaining?: number;
  percentage?: number;
  userExpenses: UserExpense[];
}

const SummaryScreen: React.FC<SummaryScreenProps> = ({ userId, currentUser }) => {
  const [period, setPeriod] = useState<Period>('month');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseNote, setEditExpenseNote] = useState('');
  const [editExpenseUserId, setEditExpenseUserId] = useState('');
  const [editExpenseCategoryId, setEditExpenseCategoryId] = useState('');
  const [deletableCategories, setDeletableCategories] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(period, currentMonth);
      const endDate = getEndDate(period, currentMonth);
      
      console.log('SummaryScreen fetchData - period:', period, 'currentMonth:', currentMonth);
      console.log('SummaryScreen fetchData - startDate:', startDate.toISOString(), 'endDate:', endDate.toISOString());
      
      // Fetch categories (including recurring-only categories)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (usersError) throw usersError;

      // Fetch expenses (from all users) - filter by date range
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (expensesError) throw expensesError;

      
      console.log('SummaryScreen fetchData - expenses found:', expensesData?.length || 0);
      console.log('SummaryScreen fetchData - expenses:', expensesData);

      // Fetch income (from all users) - use most recent income entries for current month
      // Income should be available for the current month regardless of when it was entered
      let { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // If no income found for this specific month, use the most recent income entries
      if (!incomeData || incomeData.length === 0) {
        const { data: recentIncomeData, error: recentIncomeError } = await supabase
          .from('income')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (recentIncomeError) throw recentIncomeError;
        incomeData = recentIncomeData;
      }

      if (incomeError) throw incomeError;

      setCategories(categoriesData || []);
      setExpenses(expensesData || []);
      setIncome(incomeData || []);
      setUsers(usersData || []);

      // Calculate category summaries
      const summaries = calculateCategorySummaries(categoriesData || [], expensesData || [], usersData || []);
      setCategorySummaries(summaries);

      // Check which categories can be deleted (no expenses at all)
      const deletable = new Set<string>();
      for (const category of categoriesData || []) {
        const hasExpenses = await hasAnyExpenses(category.id);
        if (!hasExpenses) {
          deletable.add(category.id);
        }
      }
      setDeletableCategories(deletable);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [period, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStartDate = (period: Period, month?: Date): Date => {
    const baseDate = month || new Date();
    switch (period) {
      case 'day':
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
      case 'week':
        const weekStart = new Date(baseDate);
        weekStart.setDate(baseDate.getDate() - baseDate.getDay());
        return weekStart;
      case 'month':
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      case 'year':
        return new Date(baseDate.getFullYear(), 0, 1);
      default:
        return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    }
  };

  const getEndDate = (period: Period, month?: Date): Date => {
    const baseDate = month || new Date();
    switch (period) {
      case 'day':
        const dayEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        dayEnd.setHours(23, 59, 59, 999);
        return dayEnd;
      case 'week':
        const weekEnd = new Date(baseDate);
        weekEnd.setDate(baseDate.getDate() - baseDate.getDay() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd;
      case 'month':
        const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return monthEnd;
      case 'year':
        const yearEnd = new Date(baseDate.getFullYear(), 11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        return yearEnd;
      default:
        const defaultEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
        defaultEnd.setHours(23, 59, 59, 999);
        return defaultEnd;
    }
  };

  const calculateCategorySummaries = (categories: Category[], expenses: Expense[], users: User[]): CategorySummary[] => {
    // Group categories by name to handle related categories (same name from different expense types)
    const categoryGroups = new Map<string, Category[]>();
    
    categories.forEach(category => {
      const categoryName = category.name.toLowerCase();
      if (!categoryGroups.has(categoryName)) {
        categoryGroups.set(categoryName, []);
      }
      categoryGroups.get(categoryName)!.push(category);
    });

    // Create summaries for each category group
    const summaries: CategorySummary[] = [];
    
    categoryGroups.forEach((categoryGroup, categoryName) => {
      // Combine expenses from all categories with the same name
      const allCategoryIds = categoryGroup.map(cat => cat.id);
        const categoryExpenses = expenses.filter(expense => allCategoryIds.includes(expense.category_id));
      
      // Calculate total spent
      const spent = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate user expense breakdown
      const userExpenseMap = new Map<string, number>();
      categoryExpenses.forEach(expense => {
        const current = userExpenseMap.get(expense.user_id) || 0;
        userExpenseMap.set(expense.user_id, current + expense.amount);
      });

      const userExpenses: UserExpense[] = Array.from(userExpenseMap.entries()).map(([userId, amount]) => {
        const user = users.find(u => u.id === userId);
        return {
          userId,
          userName: user?.name || 'Unknown',
          userColor: user?.color || '#888',
          amount
        };
      }).sort((a, b) => b.amount - a.amount); // Sort by amount descending
      
      // Use the first category as the primary category (for color, budget, etc.)
      const primaryCategory = categoryGroup[0];
      
      let remaining: number | undefined;
      let percentage: number | undefined;
      let adjustedBudget: number | null | undefined;
      
      if (primaryCategory.budget) {
        // Calculate budget based on period
        switch (period) {
          case 'day':
            adjustedBudget = primaryCategory.budget / 30; // Monthly budget divided by 30 days
            break;
          case 'week':
            adjustedBudget = primaryCategory.budget / 4; // Monthly budget divided by 4 weeks
            break;
          case 'month':
            adjustedBudget = primaryCategory.budget; // Monthly budget as is
            break;
          case 'year':
            adjustedBudget = primaryCategory.budget * 12; // Monthly budget multiplied by 12
            break;
          default:
            adjustedBudget = primaryCategory.budget;
        }
        
        if (adjustedBudget !== null && adjustedBudget !== undefined) {
          remaining = adjustedBudget - spent;
          percentage = Math.max(0, (remaining / adjustedBudget) * 100);
        }
      }

      summaries.push({
        category: primaryCategory,
        spent,
        budget: adjustedBudget,
        remaining,
        percentage,
        userExpenses
      });
    });

    return summaries.filter(summary => summary.spent > 0 || summary.budget)
      .sort((a, b) => {
        // First sort by spent amount (largest to smallest)
        if (a.spent !== b.spent) {
          return b.spent - a.spent;
        }
        // If spent amounts are equal (including both 0), sort by budget (largest to smallest)
        const aBudget = a.budget || 0;
        const bBudget = b.budget || 0;
        return bBudget - aBudget;
      });
  };

  const handleEditBudget = (categoryId: string, currentBudget?: number) => {
    setEditingBudget(categoryId);
    // Always show the monthly budget amount for editing (convert from adjusted budget back to monthly)
    let monthlyBudget = currentBudget;
    if (currentBudget && period !== 'month') {
      switch (period) {
        case 'day':
          monthlyBudget = currentBudget * 30; // Convert daily back to monthly
          break;
        case 'week':
          monthlyBudget = currentBudget * 4; // Convert weekly back to monthly
          break;
        case 'year':
          monthlyBudget = currentBudget / 12; // Convert yearly back to monthly
          break;
      }
    }
    setBudgetValue(monthlyBudget?.toString() || '');
  };

  const handleSaveBudget = async (categoryId: string) => {
    try {
      const budgetAmount = budgetValue ? parseFloat(budgetValue) : null;
      
      const { error } = await supabase
        .from('categories')
        .update({ budget: budgetAmount })
        .eq('id', categoryId);

      if (error) throw error;

      // Update local state
      setCategories(categories.map(cat => 
        cat.id === categoryId ? { ...cat, budget: budgetAmount || undefined } : cat
      ));

      setEditingBudget(null);
      setBudgetValue('');
      
      // Recalculate summaries
      const summaries = calculateCategorySummaries(
        categories.map(cat => 
          cat.id === categoryId ? { ...cat, budget: budgetAmount || undefined } : cat
        ), 
        expenses,
        users
      );
      setCategorySummaries(summaries);

    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingBudget(null);
    setBudgetValue('');
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense.id);
    setEditExpenseAmount(expense.amount.toString());
    setEditExpenseNote(expense.note || '');
    setEditExpenseUserId(expense.user_id);
    setEditExpenseCategoryId(expense.category_id);
  };

  const handleSaveExpense = async (expenseId: string) => {
    try {
      const amount = parseFloat(editExpenseAmount);
      
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
      }

      const updateData = {
        amount: amount,
        note: editExpenseNote.trim() || null,
        user_id: editExpenseUserId,
        category_id: editExpenseCategoryId
      };
      
      console.log('Updating expense:', expenseId, 'with data:', updateData);
      
      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', expenseId);

      if (error) throw error;

      // Update local state
      const updatedExpenses = expenses.map(expense => 
        expense.id === expenseId 
          ? { ...expense, amount: amount, note: editExpenseNote.trim() || undefined, user_id: editExpenseUserId, category_id: editExpenseCategoryId }
          : expense
      );
      setExpenses(updatedExpenses);

      // Recalculate summaries
      const summaries = calculateCategorySummaries(categories, updatedExpenses, users);
      setCategorySummaries(summaries);

      // Clear editing state
      setEditingExpense(null);
      setEditExpenseAmount('');
      setEditExpenseNote('');

    } catch (error) {
      console.error('Error updating expense:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update expense: ${errorMessage}. Please try again.`);
    }
  };

  const handleCancelExpenseEdit = () => {
    setEditingExpense(null);
    setEditExpenseAmount('');
    setEditExpenseNote('');
    setEditExpenseUserId('');
    setEditExpenseCategoryId('');
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // Remove from local state
      setExpenses(expenses.filter(expense => expense.id !== expenseId));

      // Recalculate summaries
      const summaries = calculateCategorySummaries(categories, expenses.filter(expense => expense.id !== expenseId), users);
      setCategorySummaries(summaries);

    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const hasAnyExpenses = async (categoryId: string): Promise<boolean> => {
    try {
      // Check if there are any expenses in the expenses table for this category
      const { data: regularExpenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('category_id', categoryId)
        .limit(1);

      if (regularExpenses && regularExpenses.length > 0) {
        return true;
      }

      // Check if there are any ACTIVE recurring expenses for this category
      const { data: recurringExpenses } = await supabase
        .from('recurring_expenses')
        .select('id')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .limit(1);

      if (recurringExpenses && recurringExpenses.length > 0) {
        return true;
      }

      // Check if there are any ACTIVE large expenses for this category
      const { data: largeExpenses } = await supabase
        .from('large_expenses')
        .select('id')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .limit(1);

      if (largeExpenses && largeExpenses.length > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for expenses:', error);
      // If there's an error, assume there are expenses to be safe
      return true;
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      // Check if there are any expenses using this category (single source of truth)
      const { data: categoryExpenses } = await supabase
        .from('expenses')
        .select('id')
        .eq('category_id', categoryId);

      const hasExpenses = categoryExpenses && categoryExpenses.length > 0;

      if (!window.confirm(`Are you sure you want to delete the category "${categoryName}"?${hasExpenses ? ' This will also delete all associated expenses.' : ''}`)) {
        return;
      }

      // Delete expenses first (due to foreign key constraint)
      if (hasExpenses) {
        const { error: expensesError } = await supabase
          .from('expenses')
          .delete()
          .eq('category_id', categoryId);

        if (expensesError) throw expensesError;
      }

      // Delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;

      // Update local state
      setCategories(categories.filter(category => category.id !== categoryId));
      const summaries = calculateCategorySummaries(
        categories.filter(category => category.id !== categoryId), 
        expenses, 
        users
      );
      setCategorySummaries(summaries);
      
      // Remove from deletable categories
      const newDeletable = new Set(deletableCategories);
      newDeletable.delete(categoryId);
      setDeletableCategories(newDeletable);
      
      // Clear selected category if it was the deleted one
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
      
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Calculate total budgeted amount based on period
  let totalBudgeted = 0;
  switch (period) {
    case 'day':
      totalBudgeted = categories.reduce((sum, cat) => sum + ((cat.budget || 0) / 30), 0); // Monthly / 30 days
      break;
    case 'week':
      totalBudgeted = categories.reduce((sum, cat) => sum + ((cat.budget || 0) / 4), 0); // Monthly / 4 weeks
      break;
    case 'month':
      totalBudgeted = categories.reduce((sum, cat) => sum + (cat.budget || 0), 0); // Direct monthly
      break;
    case 'year':
      totalBudgeted = categories.reduce((sum, cat) => sum + ((cat.budget || 0) * 12), 0); // Monthly * 12
      break;
    default:
      totalBudgeted = categories.reduce((sum, cat) => sum + (cat.budget || 0), 0);
  }
  
  // Calculate income based on period (income is stored as monthly amounts)
  let totalIncome = 0;
  switch (period) {
    case 'day':
      totalIncome = income.reduce((sum, inc) => sum + (inc.amount / 30), 0); // Monthly / 30 days
      break;
    case 'week':
      totalIncome = income.reduce((sum, inc) => sum + (inc.amount / 4), 0); // Monthly / 4 weeks
      break;
    case 'month':
      totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0); // Direct monthly
      break;
    case 'year':
      totalIncome = income.reduce((sum, inc) => sum + (inc.amount * 12), 0); // Monthly * 12
      break;
    default:
      totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  }
  
  const netIncome = totalIncome - totalExpenses;
  const anticipatedNet = totalIncome - totalBudgeted;

  if (loading) {
    return <div className="loading">Loading summary...</div>;
  }

  return (
    <div className="summary-screen">
      <h2>Summary</h2>
      
      <div className="month-navigation">
        <button className="nav-btn" onClick={handlePreviousMonth}>
          <ChevronLeft size={20} />
        </button>
        <button className="month-display" onClick={handleCurrentMonth}>
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </button>
        <button className="nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="period-selector">
        {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
          <button
            key={p}
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="totals-section">
        <div className="total-item">
          <span className="total-label">Expenses</span>
          <span className="total-value expense">${totalExpenses.toFixed(2)}</span>
        </div>
        <div className="total-item">
          <span className="total-label">Budgeted Expenses</span>
          <span className="total-value budgeted">${totalBudgeted.toFixed(2)}</span>
        </div>
        <div className="divider"></div>
        <div className="total-item">
          <span className="total-label">Income</span>
          <span className="total-value income">${totalIncome.toFixed(2)}</span>
        </div>
        <div className="total-item">
          <span className="total-label">Anticipated Net</span>
          <span className="total-value budgeted">
            ${anticipatedNet.toFixed(2)}
          </span>
        </div>
        <div className="total-item">
          <span className="total-label">Net</span>
          <span className={`total-value ${netIncome >= 0 ? 'positive' : 'negative'}`}>
            ${netIncome.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="categories-section">
        <h3>Categories</h3>
        {categorySummaries.length === 0 ? (
          <div className="empty-state">
            <p>No expenses this {period} yet.</p>
          </div>
        ) : (
          <div className="category-list">
            {categorySummaries.map(({ category, spent, budget, remaining, percentage, userExpenses }) => (
              <div key={category.id} className="category-item">
                <div className="category-header">
                  <div 
                    className="category-color" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="category-name">{category.name}</span>
                  <div className="category-actions">
                    <span className="category-amount">
                      ${spent.toFixed(2)}
                      {budget && ` / $${budget.toFixed(2)}`}
                    </span>
                    <button 
                      className="edit-budget-btn"
                      onClick={() => handleEditBudget(category.id, budget || undefined)}
                      title="Edit budget"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
                
                {editingBudget === category.id ? (
                  <div className="budget-edit">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Monthly budget amount"
                      value={budgetValue}
                      onChange={(e) => setBudgetValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveBudget(category.id)}
                    />
                    <div className="budget-edit-actions">
                      <button onClick={() => handleSaveBudget(category.id)}>Save</button>
                      <button onClick={handleCancelEdit}>Cancel</button>
                      {spent === 0 && deletableCategories.has(category.id) && (
                        <button onClick={() => handleDeleteCategory(category.id, category.name)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {budget && (
                      <div 
                        className="progress-bar"
                        onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {userExpenses.map((userExpense, index) => {
                          const userPercentage = (userExpense.amount / spent) * 100;
                          // Calculate width based on budget percentage, not total spent
                          const budgetPercentage = Math.min((spent / budget) * 100, 100);
                          const userWidth = (userExpense.amount / spent) * budgetPercentage;
                          const leftPosition = index === 0 ? '0%' : `${userExpenses.slice(0, index).reduce((sum, ue) => sum + (ue.amount / spent) * budgetPercentage, 0)}%`;
                          
                          return (
                            <div
                              key={userExpense.userId}
                              className="progress-segment"
                              style={{
                                width: `${userWidth}%`,
                                backgroundColor: userExpense.userColor,
                                left: leftPosition
                              }}
                              title={`${userExpense.userName}: $${userExpense.amount.toFixed(2)} (${userPercentage.toFixed(1)}% of total)`}
                            />
                          );
                        })}
                      </div>
                    )}
                    {budget && (
                      <div className="category-footer">
                        <span className="remaining-text">
                          {remaining && remaining > 0 
                            ? `${percentage?.toFixed(0)}% left this ${period}`
                            : remaining === 0
                            ? `Budget used this ${period}`
                            : `Over budget by $${Math.abs(remaining || 0).toFixed(2)} (${(Math.abs(remaining || 0) / (budget || 1) * 100).toFixed(2)}% over)`
                          }
                        </span>
                      </div>
                    )}
                    
                    {selectedCategory === category.id && userExpenses.length > 0 && (
                      <div className="user-expenses-detail">
                        <h4>Expenses by User</h4>
                        {userExpenses.map((userExpense) => {
                          const userPercentage = (userExpense.amount / spent) * 100;
                          return (
                            <div key={userExpense.userId} className="user-expense-item">
                              <div 
                                className="user-color-indicator"
                                style={{ backgroundColor: userExpense.userColor }}
                              />
                              <span className="user-name">{userExpense.userName}</span>
                              <span 
                                className="user-amount"
                                style={{ color: userExpense.userColor }}
                              >
                                ${userExpense.amount.toFixed(2)} ({userPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          );
                        })}
                        
                        <h4>Recent Transactions</h4>
                        <div className="transactions-list">
                          {(() => {
                            // Get regular expenses for this category
                            const categoryExpenses = expenses.filter(expense => expense.category_id === category.id);
                            
                            return categoryExpenses
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .slice(0, 10)
                              .map((expense) => {
                              const user = users.find(u => u.id === expense.user_id);
                              return (
                                <div key={expense.id} className="transaction-item">
                                  <div 
                                    className="transaction-user-color"
                                    style={{ backgroundColor: user?.color || '#888' }}
                                  />
                                  <div className="transaction-details">
                                    {editingExpense === expense.id ? (
                                      <div className="expense-edit-form">
                                        <div className="expense-edit-header">
                                          <span className="transaction-user">{user?.name || 'Unknown'}</span>
                                        </div>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="Amount"
                                          value={editExpenseAmount}
                                          onChange={(e) => setEditExpenseAmount(e.target.value)}
                                          className="expense-edit-amount"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Note (optional)"
                                          value={editExpenseNote}
                                          onChange={(e) => setEditExpenseNote(e.target.value)}
                                          className="expense-edit-note"
                                        />
                                        <select
                                          value={editExpenseUserId}
                                          onChange={(e) => setEditExpenseUserId(e.target.value)}
                                          className="expense-edit-user"
                                        >
                                          <option value="">Select user...</option>
                                          {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                              {user.name}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          value={editExpenseCategoryId}
                                          onChange={(e) => setEditExpenseCategoryId(e.target.value)}
                                          className="expense-edit-category"
                                        >
                                          <option value="">Select category...</option>
                                          {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                              {category.name}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="expense-edit-actions">
                                          <button 
                                            onClick={() => handleSaveExpense(expense.id)}
                                            className="save-expense-btn"
                                          >
                                            Save
                                          </button>
                                          <button 
                                            onClick={handleCancelExpenseEdit}
                                            className="cancel-expense-btn"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="transaction-header">
                                          <span className="transaction-user">{user?.name || 'Unknown'}</span>
                                          <div className="transaction-actions">
                                            <span 
                                              className="transaction-amount"
                                              style={{ color: user?.color || '#ef4444' }}
                                            >
                                              ${expense.amount.toFixed(2)}
                                            </span>
                                            <button 
                                              className="edit-expense-btn"
                                              onClick={() => handleEditExpense(expense)}
                                              title="Edit expense"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button 
                                              className="delete-expense-btn"
                                              onClick={() => handleDeleteExpense(expense.id)}
                                              title="Delete expense"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="transaction-meta">
                                          <span className="transaction-date">
                                            {new Date(expense.created_at).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                          {expense.note && (
                                            <span className="transaction-note">{expense.note}</span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryScreen;
