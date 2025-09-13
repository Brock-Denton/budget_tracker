import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Repeat, Calculator } from 'lucide-react';
import { supabase, User, Category } from '../lib/supabase';
import BottomNavigation from './BottomNavigation';
import './UserSelection.css';

const UserSelection: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResult, categoriesResult] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('categories').select('*').eq('is_recurring_only', false).eq('is_large_expense_only', false).order('name')
      ]);

      if (usersResult.error) throw usersResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setUsers(usersResult.data || []);
      setCategories(categoriesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  const handleCategorySelect = (categoryId: string) => {
    if (selectedUser) {
      navigate(`/app/${selectedUser.id}?category=${categoryId}&tab=expense`);
    }
  };

  const handleTabChange = (tab: 'home' | 'summary' | 'income') => {
    if (tab === 'home') {
      // Already on home/user selection, do nothing
      return;
    } else if (tab === 'summary') {
      // Navigate to summary for the last selected user or first user
      const userId = localStorage.getItem('lastSelectedUser') || users[0]?.id;
      if (userId) {
        navigate(`/app/${userId}?tab=summary`);
      }
    } else if (tab === 'income') {
      // Navigate to income for the last selected user or first user
      const userId = localStorage.getItem('lastSelectedUser') || users[0]?.id;
      if (userId) {
        navigate(`/app/${userId}?tab=income`);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      // Get existing colors
      const existingColors = categories.map(cat => cat.color);
      const colors = [
        '#F59E0B', '#8B5CF6', '#6B7280', '#EC4899', '#06B6D4', 
        '#84CC16', '#F97316', '#EF4444', '#10B981', '#3B82F6',
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#FFB347', '#87CEEB', '#D8BFD8',
        '#F0E68C', '#FFA07A', '#20B2AA', '#FF69B4', '#9370DB'
      ];
      
      // Find a color that's not already used
      let selectedColor = colors[Math.floor(Math.random() * colors.length)];
      let attempts = 0;
      while (existingColors.includes(selectedColor) && attempts < 50) {
        selectedColor = colors[Math.floor(Math.random() * colors.length)];
        attempts++;
      }
      
      // If we still have a conflict, generate a unique color
      if (existingColors.includes(selectedColor)) {
        // Generate a random HSL color
        const hue = Math.floor(Math.random() * 360);
        const saturation = 70 + Math.floor(Math.random() * 30); // 70-100%
        const lightness = 50 + Math.floor(Math.random() * 20); // 50-70%
        selectedColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        
        // If this generated color is still a conflict, try again with different values
        let retryAttempts = 0;
        while (existingColors.includes(selectedColor) && retryAttempts < 10) {
          const newHue = Math.floor(Math.random() * 360);
          const newSaturation = 70 + Math.floor(Math.random() * 30);
          const newLightness = 50 + Math.floor(Math.random() * 20);
          selectedColor = `hsl(${newHue}, ${newSaturation}%, ${newLightness}%)`;
          retryAttempts++;
        }
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

  if (loading) {
    return (
      <div className="user-selection">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="user-selection">
        <h1 className="app-title">Budget Tracker</h1>
        <div className="users-grid">
          {users.map((user) => (
            <button
              key={user.id}
              className="user-button"
              style={{ backgroundColor: user.color }}
              onClick={() => handleUserSelect(user)}
            >
              {user.name}
            </button>
          ))}
        </div>
        <BottomNavigation activeTab="home" onTabChange={handleTabChange} />
      </div>
    );
  }

  return (
    <div className="user-selection">
      <div className="category-header">
        <button className="back-btn" onClick={() => setSelectedUser(null)}>
          ← Back
        </button>
        <h1 className="app-title">Select Category</h1>
        <div className="category-actions">
          <button 
            className="add-category-btn"
            onClick={() => setShowAddCategory(true)}
          >
            <Plus size={20} />
          </button>
          <button 
            className={`delete-mode-btn ${deleteMode ? 'active' : ''}`}
            onClick={() => setDeleteMode(!deleteMode)}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="selected-user-info">
        <div 
          className="user-color-indicator"
          style={{ backgroundColor: selectedUser.color }}
        />
        <span className="user-name">{selectedUser.name}</span>
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
      
      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category.id} className="category-item">
            <button
              className="category-button"
              style={{ backgroundColor: category.color }}
              onClick={() => !deleteMode && handleCategorySelect(category.id)}
            >
              {category.name}
            </button>
            {deleteMode && (
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
            )}
          </div>
        ))}
      </div>
      
      <div className="special-expenses-section">
        <button 
          className="recurring-expenses-btn"
          onClick={() => navigate(`/app/${selectedUser.id}?tab=recurring`)}
        >
          <Repeat size={20} />
          Recurring Expenses
        </button>
        
        <button 
          className="large-expenses-btn"
          onClick={() => navigate(`/app/${selectedUser.id}?tab=large`)}
        >
          <Calculator size={20} />
          Large Expenses
        </button>
      </div>
      
      <BottomNavigation activeTab="home" onTabChange={handleTabChange} />
    </div>
  );
};

export default UserSelection;
