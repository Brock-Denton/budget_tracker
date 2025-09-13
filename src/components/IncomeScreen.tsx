import React, { useState, useEffect } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { supabase, Income, User, RecurringIncome } from '../lib/supabase';
import './IncomeScreen.css';

interface IncomeScreenProps {
  userId: string;
  currentUser: User;
}

const IncomeScreen: React.FC<IncomeScreenProps> = ({ userId, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(userId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingIncome, setEditingIncome] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [recentIncome, setRecentIncome] = useState<Income[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);

  useEffect(() => {
    fetchUsers();
    fetchRecentIncome();
    fetchMonthlyTotal();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRecentIncome = async () => {
    try {
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentIncome(data || []);
    } catch (error) {
      console.error('Error fetching recent income:', error);
    }
  };

  const fetchMonthlyTotal = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('income')
        .select('amount')
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;
      
      const total = (data || []).reduce((sum, income) => sum + income.amount, 0);
      setMonthlyTotal(total);
    } catch (error) {
      console.error('Error fetching monthly total:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    setLoading(true);

    try {
      // Convert bi-weekly amount to monthly for storage
      const biWeeklyAmount = parseFloat(amount);
      const monthlyAmount = biWeeklyAmount * 2; // Bi-weekly * 2 = monthly
      
      const { error } = await supabase
        .from('income')
        .insert([{
          user_id: selectedUserId,
          amount: monthlyAmount, // Store as monthly amount
          note: note.trim() || `Bi-weekly: $${biWeeklyAmount.toFixed(2)}`
        }]);

      if (error) throw error;

      // Show success message
      setShowSuccess(true);
      
      // Reset form
      setAmount('');
      setNote('');

      // Refresh data
      await fetchRecentIncome();
      await fetchMonthlyTotal();

      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error('Error adding income:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income.id);
    // Convert monthly amount back to bi-weekly for editing
    const biWeeklyAmount = income.amount / 2;
    setEditAmount(biWeeklyAmount.toString());
    setEditNote(income.note || '');
  };

  const handleSaveEdit = async (incomeId: string) => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      // Convert bi-weekly amount to monthly for storage
      const biWeeklyAmount = parseFloat(editAmount);
      const monthlyAmount = biWeeklyAmount * 2;
      
      const { error } = await supabase
        .from('income')
        .update({
          amount: monthlyAmount,
          note: editNote.trim() || `Bi-weekly: $${biWeeklyAmount.toFixed(2)}`
        })
        .eq('id', incomeId);

      if (error) throw error;

      // Refresh data
      await fetchRecentIncome();
      await fetchMonthlyTotal();

      // Reset editing state
      setEditingIncome(null);
      setEditAmount('');
      setEditNote('');

    } catch (error) {
      console.error('Error updating income:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingIncome(null);
    setEditAmount('');
    setEditNote('');
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!window.confirm('Are you sure you want to delete this income entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', incomeId);

      if (error) throw error;

      // Refresh data
      await fetchRecentIncome();
      await fetchMonthlyTotal();

    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  const getUserColor = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.color || '#888';
  };

  const calculateIncomePercentages = () => {
    const totalIncome = recentIncome.reduce((sum, income) => sum + income.amount, 0);
    const userIncomeMap = new Map<string, number>();
    
    recentIncome.forEach(income => {
      const current = userIncomeMap.get(income.user_id) || 0;
      userIncomeMap.set(income.user_id, current + income.amount);
    });

    return Array.from(userIncomeMap.entries()).map(([userId, amount]) => ({
      userId,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      userName: getUserName(userId),
      userColor: getUserColor(userId)
    })).sort((a, b) => b.amount - a.amount);
  };

  return (
    <div className="income-screen">
      <h2>Income</h2>
      
      <div className="monthly-total">
        <div className="total-label">This Month</div>
        <div className="total-amount">${monthlyTotal.toFixed(2)}</div>
      </div>

      {showSuccess && (
        <div className="success-message">
          Income saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="income-form">
        <div className="form-group">
          <label htmlFor="user">User</label>
          <select
            id="user"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            required
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Bi-weekly Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <small className="input-help">This will be calculated as monthly income (bi-weekly × 2)</small>
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
          {loading ? 'Saving...' : 'Save Income'}
        </button>
      </form>

      {recentIncome.length > 0 && (
        <div className="recent-income">
          <h3>Income by User</h3>
          <div className="income-percentages">
            {calculateIncomePercentages().map(({ userId, amount, percentage, userName, userColor }) => (
              <div key={userId} className="income-percentage-item">
                <div 
                  className="income-user-color"
                  style={{ backgroundColor: userColor }}
                />
                <span className="income-user-name">{userName}</span>
                <span className="income-percentage-amount">${amount.toFixed(2)} ({percentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
          
          <h3>Recent Income</h3>
          <div className="income-list">
            {recentIncome.map((income) => (
              <div key={income.id} className="income-item">
                {editingIncome === income.id ? (
                  <div className="income-edit-form">
                    <div className="form-group">
                      <label>Bi-weekly Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Note</label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                      />
                    </div>
                    <div className="edit-actions">
                      <button className="save-btn" onClick={() => handleSaveEdit(income.id)}>
                        Save
                      </button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="income-details">
                    <div className="income-header">
                      <div 
                        className="income-user-color" 
                        style={{ backgroundColor: getUserColor(income.user_id) }}
                      />
                      <div className="income-user-name">{getUserName(income.user_id)}</div>
                      <div className="income-amount">${income.amount.toFixed(2)}</div>
                      <div className="income-actions">
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditIncome(income)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteIncome(income.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="income-date">{formatDate(income.created_at)}</div>
                    {income.note && (
                      <div className="income-note">{income.note}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeScreen;
