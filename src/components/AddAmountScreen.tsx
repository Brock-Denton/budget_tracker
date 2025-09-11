import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { supabase, Category } from '../lib/supabase';
import { User } from '../lib/supabase';
import './AddAmountScreen.css';

interface AddAmountScreenProps {
  userId: string;
  currentUser: User;
}

const AddAmountScreen: React.FC<AddAmountScreenProps> = ({ userId, currentUser }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Handle pre-selected category from URL
    const categoryId = searchParams.get('category');
    if (categoryId) {
      setSelectedCategory(categoryId);
      setShowCategorySelection(false);
    }
    // Always clear success message when component mounts or URL changes
    setShowSuccess(false);
  }, [searchParams]);

  // Clear success message when category changes
  useEffect(() => {
    setShowSuccess(false);
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setShowCategorySelection(false);
  };

  const handleBackToCategories = () => {
    navigate('/');
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      // Get existing colors
      const existingColors = categories.map(cat => cat.color);
      const colors = [
        '#F59E0B', '#8B5CF6', '#6B7280', '#EC4899', '#06B6D4', 
        '#84CC16', '#F97316', '#EF4444', '#10B981', '#3B82F6'
      ];
      
      // Find a color that's not already used
      let selectedColor = colors[Math.floor(Math.random() * colors.length)];
      let attempts = 0;
      while (existingColors.includes(selectedColor) && attempts < 20) {
        selectedColor = colors[Math.floor(Math.random() * colors.length)];
        attempts++;
      }
      
      // If we still have a conflict, use a fallback color
      if (existingColors.includes(selectedColor)) {
        selectedColor = '#6366f1'; // Fallback color
      }
      
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim(), color: selectedColor }])
        .select()
        .single();

      if (error) throw error;
      
      setCategories([...categories, data]);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all associated expenses.')) {
      return;
    }

    setDeletingCategory(categoryId);

    try {
      // Delete expenses first (due to foreign key constraint)
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('category_id', categoryId);

      if (expensesError) throw expensesError;

      // Delete the category
      const { error: categoryError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (categoryError) throw categoryError;

      // Update local state
      setCategories(categories.filter(cat => cat.id !== categoryId));

    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    } finally {
      setDeletingCategory(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory || !amount || parseFloat(amount) <= 0) {
      alert('Please select a category and enter a valid amount greater than 0.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          user_id: userId,
          category_id: selectedCategory,
          amount: parseFloat(amount),
          note: note.trim() || null
        }]);

      if (error) throw error;

      // Show success message
      setShowSuccess(true);
      
      // Reset form
      setAmount('');
      setNote('');

      // Navigate back to categories after 1.5 seconds
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setLoading(false);
    }
  };

  // This component now only shows the expense form since category selection is handled in UserSelection

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="add-amount-screen">
      <div className="expense-header">
        <button className="back-btn" onClick={handleBackToCategories}>
          ← Back to Categories
        </button>
        <h2>Add Expense</h2>
      </div>
      
      <div className="category-indicator">
        <span className="category-label">Adding to:</span>
        <div className="selected-category" style={{ backgroundColor: selectedCategoryData?.color }}>
          {selectedCategoryData?.name}
        </div>
      </div>
      
      {showSuccess && (
        <div className="success-message">
          Expense saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="expense-form">
        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="note">Note (optional)</label>
          <input
            id="note"
            type="text"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading || !amount || parseFloat(amount) <= 0}
        >
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
};

export default AddAmountScreen;
