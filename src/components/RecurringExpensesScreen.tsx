import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Trash2, Calendar } from 'lucide-react';
import { supabase, Category, RecurringExpense, User } from '../lib/supabase';
import BottomNavigation from './BottomNavigation';
import './RecurringExpensesScreen.css';

interface RecurringExpensesScreenProps {
  userId: string;
  currentUser: { id: string; name: string; color: string };
}

const RecurringExpensesScreen: React.FC<RecurringExpensesScreenProps> = ({ userId, currentUser }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [newCategoryNameInput, setNewCategoryNameInput] = useState('');
  const [editUserId, setEditUserId] = useState('');
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all categories (regular + recurring + large) so users can share categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch recurring expenses from all users
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_expenses')
        .select(`
          *,
          users!inner(name, color)
        `)
        .eq('is_active', true)
        .order('day_of_month');

      if (recurringError) throw recurringError;

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (usersError) throw usersError;

      setCategories(categoriesData || []);
      setRecurringExpenses(recurringData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let categoryName: string;
    if (editingExpense) {
      // When editing, use the existing category name
      const expense = recurringExpenses.find(e => e.id === editingExpense);
      categoryName = expense ? getCategoryName(expense.category_id) : '';
    } else {
      // When creating new, use the selected category name
      categoryName = selectedCategoryName === "__new__" ? newCategoryName : selectedCategoryName;
    }
    
    if (!categoryName.trim() || !amount || !dayOfMonth) {
      alert('Please fill in all required fields.');
      return;
    }

    const dayNum = parseInt(dayOfMonth);
    if (dayNum < 1 || dayNum > 31) {
      alert('Day of month must be between 1 and 31.');
      return;
    }

    setLoading(true);

    try {
      let categoryId = '';
      
      if (editingExpense) {
        // For editing, check if category was changed or use existing
        const expense = recurringExpenses.find(e => e.id === editingExpense);
        const currentCategoryName = expense ? getCategoryName(expense.category_id) : '';
        
        if (selectedCategoryName !== currentCategoryName) {
          // Category was changed, find the new category
          const existingCategory = categories.find(cat => cat.name.toLowerCase() === selectedCategoryName.toLowerCase());
          
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category for the changed selection
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
                name: selectedCategoryName.trim(), 
                color: selectedColor
              }])
              .select()
              .single();

            if (categoryError) throw categoryError;
            categoryId = categoryData.id;
          }
        } else {
          // Category wasn't changed, use existing
          categoryId = expense?.category_id || '';
        }
      } else {
        // Check if category already exists (by name)
        const existingCategory = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
        
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // Create new recurring category
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
              color: selectedColor
            }])
            .select()
            .single();

          if (categoryError) throw categoryError;
          categoryId = categoryData.id;
        }
      }

      if (editingExpense) {
        // Update existing recurring expense
        const updateData: any = {
          amount: parseFloat(amount),
          note: note.trim() || null,
          day_of_month: dayNum,
          updated_at: new Date().toISOString()
        };
        
        // Include category_id if it was changed
        if (categoryId) {
          updateData.category_id = categoryId;
        }
        
        const { error } = await supabase
          .from('recurring_expenses')
          .update(updateData)
          .eq('id', editingExpense);

        if (error) throw error;
        
        // Clean up any existing generated expenses for this recurring expense
        // (they will be regenerated with the new date)
        await supabase
          .from('expenses')
          .delete()
          .eq('note', 'Recurring expense (Auto-generated)')
          .eq('user_id', userId)
          .eq('category_id', categoryId);
      } else {
        // Create new recurring expense
        const { error } = await supabase
          .from('recurring_expenses')
          .insert([{
            user_id: userId,
            category_id: categoryId,
            amount: parseFloat(amount),
            note: note.trim() || null,
            day_of_month: dayNum
          }]);

        if (error) throw error;
      }

      // Reset form
      setNewCategoryName('');
      setSelectedCategoryName('');
      setAmount('');
      setNote('');
      setDayOfMonth('');
      setShowAddForm(false);
      setEditingExpense(null);

      // Refresh data
      await fetchData();
      
      // Generate recurring expenses to create the actual expense entry
      try {
        console.log('Calling generate_recurring_expenses function...');
        const { error } = await supabase.rpc('generate_recurring_expenses');
        if (error) {
          console.error('Error generating recurring expenses:', error);
        } else {
          console.log('Recurring expenses generated successfully');
        }
      } catch (error) {
        console.error('Error calling generate_recurring_expenses function:', error);
      }

    } catch (error) {
      console.error('Error saving recurring expense:', error);
      alert('Error saving recurring expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense.id);
    const categoryName = getCategoryName(expense.category_id);
    setSelectedCategoryName(categoryName);
    setNewCategoryName(categoryName);
    setAmount(expense.amount.toString());
    setNote(expense.note || '');
    setDayOfMonth(expense.day_of_month.toString());
    setShowAddForm(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to delete this recurring expense?')) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active: false })
        .eq('id', expenseId);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      console.error('Error deleting recurring expense:', error);
      alert('Error deleting recurring expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (categoryName: string) => {
    setEditingCategory(categoryName);
    setEditCategoryName(categoryName);
    setNewCategoryNameInput('');
    
    // Find the first expense in this category to get the current user
    const categoryExpenses = recurringExpenses.filter(expense => 
      getCategoryName(expense.category_id) === categoryName
    );
    if (categoryExpenses.length > 0) {
      setEditUserId(categoryExpenses[0].user_id);
    }
  };

  const handleSaveCategoryEdit = async (oldCategoryName: string) => {
    try {
      let newCategoryName = editCategoryName;
      
      // If creating a new category, use the input value
      if (editCategoryName === "__new__") {
        newCategoryName = newCategoryNameInput.trim();
        if (!newCategoryName) {
          alert('Please enter a new category name');
          return;
        }
      }
      
      if (!newCategoryName) {
        alert('Please select a category or create a new one');
        return;
      }

      if (newCategoryName === oldCategoryName) {
        setEditingCategory(null);
        setEditCategoryName('');
        setNewCategoryNameInput('');
        return;
      }

      // Get all expenses in this category
      const categoryExpenses = recurringExpenses.filter(expense => 
        getCategoryName(expense.category_id) === oldCategoryName
      );

      // Find or create the new category
      let newCategory = categories.find(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase());
      
      if (!newCategory) {
        // Create new category
        const colors = [
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

        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .insert([{ 
            name: newCategoryName, 
            color: selectedColor
          }])
          .select();

        if (categoryError) throw categoryError;
        newCategory = categoryData[0];
      }

      if (!newCategory) {
        throw new Error('Failed to create or find category');
      }

      // Update all expenses in this category to use the new category
      const expenseIds = categoryExpenses.map(expense => expense.id);
      
      const { error: updateError } = await supabase
        .from('recurring_expenses')
        .update({ category_id: newCategory.id, user_id: editUserId })
        .in('id', expenseIds);

      if (updateError) throw updateError;

      // Also update any existing auto-generated expenses from these recurring expenses
      // to use the new category_id and user_id
      for (const expense of categoryExpenses) {
        await supabase
          .from('expenses')
          .update({ category_id: newCategory.id, user_id: editUserId })
          .eq('user_id', expense.user_id)
          .eq('amount', expense.amount)
          .eq('note', expense.note + ' (Auto-generated)');
      }

      // Update local state
      const updatedExpenses = recurringExpenses.map(expense => {
        if (expenseIds.includes(expense.id)) {
          return { ...expense, category_id: newCategory!.id, user_id: editUserId };
        }
        return expense;
      });

      setRecurringExpenses(updatedExpenses);
      
      // Update categories list if we created a new one
      if (!categories.find(cat => cat.id === newCategory!.id)) {
        setCategories([...categories, newCategory!]);
      }

      setEditingCategory(null);
      setEditCategoryName('');
      setNewCategoryNameInput('');
      
      alert(`Successfully updated ${expenseIds.length} recurring expense(s) to category "${newCategoryName}"`);
      
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category. Please try again.');
    }
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategory(null);
    setEditCategoryName('');
    setNewCategoryNameInput('');
    setEditUserId('');
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingExpense(null);
    setNewCategoryName('');
    setSelectedCategoryName('');
    setAmount('');
    setNote('');
    setDayOfMonth('');
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
    console.log('🔴 RecurringExpensesScreen handleTabChange called with:', tab);
    console.log('🔴 Current userId:', userId);
    console.log('🔴 Function is executing!');
    
    if (tab === 'home') {
      console.log('🔴 Navigating to home (/)');
      navigate('/');
    } else {
      // For summary/income, go back to categories first, then navigate to the tab
      console.log('🔴 Going back to categories first, then to:', tab);
      console.log('🔴 Step 1: Navigating to /');
      navigate('/');
      // Use setTimeout to ensure the navigation completes before the next one
      setTimeout(() => {
        console.log('🔴 Step 2: Navigating to /app/${userId}?tab=${tab}');
        navigate(`/app/${userId}?tab=${tab}`);
      }, 100);
    }
  };

  if (loading) {
    return <div className="loading">Loading recurring expenses...</div>;
  }

  return (
    <div className="recurring-expenses-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Categories
        </button>
        <h2>Recurring Expenses</h2>
        <button 
          className="add-btn"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={20} />
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>{editingExpense ? 'Edit Recurring Expense' : 'Add Recurring Expense'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Category *</label>
              <div className="category-selection">
                <select
                  value={selectedCategoryName}
                  onChange={(e) => setSelectedCategoryName(e.target.value)}
                  required
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
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Day of Month *</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                placeholder="15"
                required
              />
              <small>Expense will be automatically created on this day each month</small>
            </div>

            <div className="form-group">
              <label>Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Phone bill"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancel}>Cancel</button>
              <button type="submit">{editingExpense ? 'Update' : 'Add'} Recurring Expense</button>
            </div>
          </form>
        </div>
      )}

      <div className="recurring-expenses-list">
        <h3>Active Recurring Expenses</h3>
        {recurringExpenses.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>No recurring expenses set up yet.</p>
            <p>Add one to automatically create expenses each month!</p>
          </div>
        ) : (
          <div className="categories-container">
            {(() => {
              // Group recurring expenses by category name
              const groupedExpenses = recurringExpenses.reduce((acc, expense) => {
                const categoryName = getCategoryName(expense.category_id);
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(expense);
                return acc;
              }, {} as Record<string, RecurringExpense[]>);

              return Object.entries(groupedExpenses).map(([categoryName, categoryExpenses]) => {
                const totalAmount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                const firstExpense = categoryExpenses[0];
                const categoryColor = getCategoryColor(firstExpense.category_id);
                
                return (
                  <div key={categoryName} className="category-group">
                    <div className="category-header">
                      {editingCategory === categoryName ? (
                        <div className="category-edit-form">
                          <select
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="category-edit-select"
                          >
                            <option value="">Select or create category...</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>
                                {cat.name} (existing)
                              </option>
                            ))}
                            <option value="__new__">+ Create new category</option>
                          </select>
                          
                          {editCategoryName === "__new__" && (
                            <input
                              type="text"
                              value={newCategoryNameInput}
                              onChange={(e) => setNewCategoryNameInput(e.target.value)}
                              className="category-edit-input"
                              placeholder="New category name"
                              autoFocus
                            />
                          )}
                          
                          <select
                            value={editUserId}
                            onChange={(e) => setEditUserId(e.target.value)}
                            className="category-edit-select"
                          >
                            <option value="">Select user...</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                          
                          <div className="category-edit-actions">
                            <button 
                              onClick={() => handleSaveCategoryEdit(categoryName)}
                              className="save-category-btn"
                            >
                              Save
                            </button>
                            <button 
                              onClick={handleCancelCategoryEdit}
                              className="cancel-category-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div 
                            className="category-indicator"
                            style={{ backgroundColor: categoryColor }}
                          >
                            {categoryName}
                          </div>
                          <div className="category-total">
                            Total: ${totalAmount.toFixed(2)}/month
                          </div>
                          <button 
                            className="edit-category-btn"
                            onClick={() => handleEditCategory(categoryName)}
                            title="Edit category name"
                          >
                            <Edit3 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className="expenses-grid">
                      {categoryExpenses.map((expense) => (
                        <div key={expense.id} className="expense-card">
                          <div className="expense-header">
                            <div className="expense-amount">${expense.amount.toFixed(2)}</div>
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
                            <div className="day-info">
                              <Calendar size={16} />
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

    </div>
  );
};

export default RecurringExpensesScreen;
