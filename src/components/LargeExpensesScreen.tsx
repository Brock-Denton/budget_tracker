import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Trash2, Calculator } from 'lucide-react';
import { supabase, Category, LargeExpense } from '../lib/supabase';
import BottomNavigation from './BottomNavigation';
import './LargeExpensesScreen.css';

interface LargeExpensesScreenProps {
  userId: string;
  currentUser: { id: string; name: string; color: string };
}

const LargeExpensesScreen: React.FC<LargeExpensesScreenProps> = ({ userId, currentUser }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [largeExpenses, setLargeExpenses] = useState<LargeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [note, setNote] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch categories (only large expense categories)
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_large_expense_only', true)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch large expenses with user info
      const { data: largeExpensesData, error: largeExpensesError } = await supabase
        .from('large_expenses')
        .select(`
          *,
          users:user_id (
            id,
            name,
            color
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (largeExpensesError) throw largeExpensesError;

      setCategories(categoriesData || []);
      setLargeExpenses(largeExpensesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading large expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let categoryName: string;
    if (editingExpense) {
      // When editing, use the existing category name
      const expense = largeExpenses.find(e => e.id === editingExpense);
      categoryName = expense ? getCategoryName(expense.category_id) : '';
    } else {
      // When creating new, use the selected category name
      categoryName = selectedCategoryName === "__new__" ? newCategoryName : selectedCategoryName;
    }
    
    if (!categoryName.trim() || !totalAmount || !dayOfMonth) {
      alert('Please fill in all required fields.');
      return;
    }

    const totalAmountNum = parseFloat(totalAmount);
    const monthlyAmount = Math.ceil(totalAmountNum / 12);
    const dayNum = parseInt(dayOfMonth);
    
    if (totalAmountNum <= 0) {
      alert('Total amount must be greater than 0.');
      return;
    }
    
    if (dayNum < 1 || dayNum > 31) {
      alert('Day of month must be between 1 and 31.');
      return;
    }

    setLoading(true);

    try {
      let categoryId = '';
      
      if (editingExpense) {
        // For editing, use existing category
        const expense = largeExpenses.find(e => e.id === editingExpense);
        categoryId = expense?.category_id || '';
      } else {
        // Check if category already exists (by name)
        const existingCategory = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
        
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // Create new large expense category
          const colors = [
            '#F59E0B', '#8B5CF6', '#6B7280', '#EC4899', '#06B6D4', 
            '#84CC16', '#F97316', '#EF4444', '#10B981', '#3B82F6',
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#FFB347', '#87CEEB', '#D8BFD8',
            '#F0E68C', '#FFA07A', '#20B2AA', '#FF69B4', '#9370DB'
          ];
          
          const existingColors = categories.map(cat => cat.color);
          let selectedColor = colors[Math.floor(Math.random() * colors.length)];
          let attempts = 0;
          while (existingColors.includes(selectedColor) && attempts < 50) {
            selectedColor = colors[Math.floor(Math.random() * colors.length)];
            attempts++;
          }
          
          if (existingColors.includes(selectedColor)) {
            const hue = Math.floor(Math.random() * 360);
            const saturation = 70 + Math.floor(Math.random() * 30);
            const lightness = 50 + Math.floor(Math.random() * 20);
            selectedColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          }

          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .insert([{ 
              name: categoryName.trim(), 
              color: selectedColor,
              is_large_expense_only: true
            }])
            .select()
            .single();

          if (categoryError) throw categoryError;
          categoryId = categoryData.id;
        }
      }

      if (editingExpense) {
        // Update existing large expense
        const { error } = await supabase
          .from('large_expenses')
          .update({
            total_amount: totalAmountNum,
            monthly_amount: monthlyAmount,
            note: note.trim() || null,
            day_of_month: dayNum,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingExpense);

        if (error) throw error;
        
        // Clean up any existing generated expenses for this large expense
        await supabase
          .from('expenses')
          .delete()
          .eq('note', 'Large expense (Monthly portion)')
          .eq('user_id', userId)
          .eq('category_id', categoryId);
      } else {
        // Create new large expense
        const { error } = await supabase
          .from('large_expenses')
          .insert([{
            user_id: userId,
            category_id: categoryId,
            total_amount: totalAmountNum,
            monthly_amount: monthlyAmount,
            note: note.trim() || null,
            day_of_month: dayNum
          }]);

        if (error) throw error;
      }

      // Reset form
      setNewCategoryName('');
      setSelectedCategoryName('');
      setTotalAmount('');
      setNote('');
      setDayOfMonth('1');
      setShowAddForm(false);
      setEditingExpense(null);

      // Refresh data
      await fetchData();
      
      // Generate large expenses to create the actual expense entry
      const { error: generateError } = await supabase.rpc('generate_large_expenses');
      if (generateError) {
        console.error('Error generating large expenses:', generateError);
      }
    } catch (error) {
      console.error('Error saving large expense:', error);
      alert('Error saving large expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: LargeExpense) => {
    setEditingExpense(expense.id);
    const categoryName = getCategoryName(expense.category_id);
    setSelectedCategoryName(categoryName);
    setNewCategoryName(categoryName);
    setTotalAmount(expense.total_amount.toString());
    setNote(expense.note || '');
    setDayOfMonth(expense.day_of_month.toString());
    setShowAddForm(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this large expense?')) {
      return;
    }

    setLoading(true);

    try {
      // Get the large expense details before deleting
      const expense = largeExpenses.find(e => e.id === expenseId);
      if (!expense) {
        throw new Error('Large expense not found');
      }

      // Delete the large expense
      const { error } = await supabase
        .from('large_expenses')
        .update({ is_active: false })
        .eq('id', expenseId);

      if (error) throw error;

      // Clean up any generated expenses for this large expense
      await supabase
        .from('expenses')
        .delete()
        .eq('note', 'Large expense (Monthly portion)')
        .eq('user_id', expense.user_id)
        .eq('category_id', expense.category_id);

      await fetchData();
    } catch (error) {
      console.error('Error deleting large expense:', error);
      alert('Error deleting large expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingExpense(null);
    setNewCategoryName('');
    setSelectedCategoryName('');
    setTotalAmount('');
    setNote('');
    setDayOfMonth('1');
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6B7280';
  };

  const handleTabChange = (tab: 'home' | 'summary' | 'income' | 'analytics') => {
    console.log('🔵 LargeExpensesScreen handleTabChange called with:', tab);
    if (tab === 'home') {
      console.log('🔵 LargeExpensesScreen navigating to home (/)');
      navigate('/');
    } else {
      console.log('🔵 LargeExpensesScreen setting activeTab to:', tab);
      // Update URL to remove tab=large and set the new tab
      console.log('🔵 LargeExpensesScreen updating URL to:', `/app/${userId}?tab=${tab}`);
      navigate(`/app/${userId}?tab=${tab}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading large expenses...</div>;
  }

  return (
    <div className="large-expenses-screen">
      <div className="screen-header">
        <button 
          className="back-btn"
          onClick={() => navigate('/')}
        >
          ← Back to Categories
        </button>
        <h1>Large Expenses</h1>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={24} />
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>{editingExpense ? 'Edit Large Expense' : 'Add Large Expense'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Category *</label>
              <div className="category-selection">
                <select
                  value={selectedCategoryName}
                  onChange={(e) => setSelectedCategoryName(e.target.value)}
                  required
                  disabled={!!editingExpense}
                >
                  <option value="">Select or create category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name} (existing)
                    </option>
                  ))}
                  <option value="__new__">+ Create new category</option>
                </select>
                {selectedCategoryName === "__new__" && (
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter new category name"
                    required
                  />
                )}
              </div>
              {editingExpense && (
                <small>Category: {getCategoryName(largeExpenses.find(e => e.id === editingExpense)?.category_id || '')}</small>
              )}
            </div>

            <div className="form-group">
              <label>Total Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="1600.00"
                required
              />
              <small>This will be divided by 12 months automatically</small>
            </div>

            <div className="form-group">
              <label>Day of Month *</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="1"
                required
              />
              <small>Monthly expense will be created on this day each month</small>
            </div>

            <div className="form-group">
              <label>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Summer Camp 2025"
              />
            </div>

            {totalAmount && (
              <div className="calculation-preview">
                <Calculator size={20} />
                <span>
                  <strong>${Math.ceil(parseFloat(totalAmount) / 12)}</strong> per month
                </span>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleCancel}>Cancel</button>
              <button type="submit">{editingExpense ? 'Update' : 'Add'} Large Expense</button>
            </div>
          </form>
        </div>
      )}

      <div className="large-expenses-list">
        <h3>Active Large Expenses</h3>
        {largeExpenses.length === 0 ? (
          <div className="empty-state">
            <Calculator size={48} />
            <p>No large expenses set up yet.</p>
            <p>Add one to spread large costs across the year!</p>
          </div>
        ) : (
          <div className="categories-container">
            {(() => {
              // Group large expenses by category name
              const groupedExpenses = largeExpenses.reduce((acc, expense) => {
                const categoryName = getCategoryName(expense.category_id);
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(expense);
                return acc;
              }, {} as Record<string, LargeExpense[]>);

              return Object.entries(groupedExpenses).map(([categoryName, categoryExpenses]) => {
                const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.total_amount, 0);
                const monthlyAmount = categoryExpenses.reduce((sum, expense) => sum + expense.monthly_amount, 0);
                const firstExpense = categoryExpenses[0];
                const categoryColor = getCategoryColor(firstExpense.category_id);
                
                return (
                  <div key={categoryName} className="category-group">
                    <div className="category-header">
                      <div 
                        className="category-indicator"
                        style={{ backgroundColor: categoryColor }}
                      >
                        {categoryName}
                      </div>
                      <div className="category-total">
                        Total: ${totalAmount.toFixed(2)} | Monthly: ${Math.ceil(monthlyAmount)}
                      </div>
                    </div>
                    
                    <div className="expenses-grid">
                      {categoryExpenses.map((expense) => (
                        <div key={expense.id} className="expense-card">
                          <div className="expense-header">
                            <div className="expense-amount">${expense.total_amount.toFixed(2)}</div>
                            <div className="expense-actions">
                              <button 
                                className="edit-btn"
                                onClick={() => handleEdit(expense)}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDelete(expense.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="expense-details">
                            <div className="monthly-info">
                              <Calculator size={16} />
                              <span>${Math.ceil(expense.monthly_amount)}/month</span>
                            </div>
                            <div className="day-info">
                              <span>Day {expense.day_of_month}</span>
                            </div>
                            <div className="user-info">
                              <div 
                                className="user-color-indicator"
                                style={{ backgroundColor: (expense as any).users?.color || '#6B7280' }}
                              />
                              <span className="user-name">{(expense as any).users?.name || 'Unknown User'}</span>
                            </div>
                            {expense.note && (
                              <div className="note">{expense.note}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      <BottomNavigation 
        activeTab="home" 
        onTabChange={handleTabChange} 
      />
    </div>
  );
};

export default LargeExpensesScreen;
