import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { supabase, Category } from '../lib/supabase';
import { User } from '../lib/supabase';
import BottomNavigation from './BottomNavigation';
import './CategoriesScreen.css';

interface CategoriesScreenProps {
  userId: string;
  currentUser: User;
}

const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ userId, currentUser }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  const colors = [
    '#F59E0B', '#8B5CF6', '#6B7280', '#EC4899', '#06B6D4', 
    '#84CC16', '#F97316', '#EF4444', '#10B981', '#3B82F6'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      // Get existing colors
      const existingColors = categories.map(cat => cat.color);
      
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

  const handleCategoryClick = (categoryId: string) => {
    // Navigate to add amount screen with category pre-selected
    navigate(`/app/${userId}?category=${categoryId}&tab=expense`);
  };

  const handleTabChange = (tab: 'home' | 'summary' | 'income') => {
    if (tab === 'home') {
      // Already on home, do nothing
      return;
    } else if (tab === 'summary') {
      navigate(`/app/${userId}?tab=summary`);
    } else if (tab === 'income') {
      navigate(`/app/${userId}?tab=income`);
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

  if (loading) {
    return <div className="loading">Loading categories...</div>;
  }

  return (
    <div className="categories-screen">
      <div className="categories-header">
        <h2>Categories</h2>
        <button 
          className="add-category-btn"
          onClick={() => setShowAddCategory(true)}
        >
          <Plus size={20} />
        </button>
      </div>

      {showAddCategory && (
        <div className="add-category-modal">
          <div className="modal-content">
            <h3>Add Category</h3>
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowAddCategory(false)}>Cancel</button>
              <button onClick={handleAddCategory}>Add</button>
            </div>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>No categories yet. Add one to get started!</p>
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map((category) => (
            <div key={category.id} className="category-item">
              <button
                className="category-button"
                style={{ backgroundColor: category.color }}
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.name}
              </button>
              <button
                className="delete-category-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(category.id);
                }}
                disabled={deletingCategory === category.id}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <BottomNavigation activeTab="home" onTabChange={handleTabChange} />
    </div>
  );
};

export default CategoriesScreen;
