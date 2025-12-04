import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, User } from '../lib/supabase';
import CategoriesScreen from './CategoriesScreen';
import AddAmountScreen from './AddAmountScreen';
import SummaryScreen from './SummaryScreen';
import IncomeScreen from './IncomeScreen';
import RecurringExpensesScreen from './RecurringExpensesScreen';
import LargeExpensesScreen from './LargeExpensesScreen';
import AnalyticsScreen from './AnalyticsScreen';
import BottomNavigation from './BottomNavigation';
import './MainApp.css';

const MainApp: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'summary' | 'income' | 'analytics'>('home');
  const [loading, setLoading] = useState(true);
  const [lastSelectedUser, setLastSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
      generateRecurringExpenses(); // Generate recurring expenses when app loads
      generateRecurringIncome(); // Generate recurring income when app loads
      
      // Load last selected user from localStorage
      loadLastSelectedUser();
    }
  }, [userId]);

  const loadLastSelectedUser = async () => {
    try {
      const lastSelectedUserId = localStorage.getItem('lastSelectedUserId');
      if (lastSelectedUserId && lastSelectedUserId !== userId) {
        // Fetch the last selected user's data
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', lastSelectedUserId)
          .single();

        if (error) throw error;
        setLastSelectedUser(data);
      } else {
        // If no last selected user or same as current, use current user
        setLastSelectedUser(null);
      }
    } catch (error) {
      console.error('Error loading last selected user:', error);
      setLastSelectedUser(null);
    }
  };

  useEffect(() => {
    // Handle URL parameters for tab and category selection
    const tab = searchParams.get('tab');
    if (tab === 'recurring') {
      setActiveTab('home'); // Recurring expenses is part of the home section
    } else if (tab && ['home', 'summary', 'income', 'analytics'].includes(tab)) {
      setActiveTab(tab as 'home' | 'summary' | 'income' | 'analytics');
    }
  }, [searchParams]);

  const fetchUser = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurrentUser(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecurringExpenses = async () => {
    try {
      // Call the Supabase function to generate recurring expenses
      const { error } = await supabase.rpc('generate_recurring_expenses');
      if (error) {
        console.error('Error generating recurring expenses:', error);
      }
    } catch (error) {
      console.error('Error calling generate_recurring_expenses function:', error);
    }
  };

  const generateRecurringIncome = async () => {
    try {
      // Call the Supabase function to generate recurring income
      const { error } = await supabase.rpc('generate_recurring_income');
      if (error) {
        console.error('Error generating recurring income:', error);
      }
    } catch (error) {
      console.error('Error calling generate_recurring_income function:', error);
    }
  };

  const handleTabChange = (tab: 'home' | 'summary' | 'income' | 'analytics') => {
    console.log('🔵 MainApp handleTabChange called with:', tab);
    if (tab === 'home') {
      // Reset to user selection screen
      console.log('🔵 MainApp navigating to home (/)');
      navigate('/');
    } else {
      console.log('🔵 MainApp setting activeTab to:', tab);
      setActiveTab(tab);
      // Update URL to remove tab=recurring and set the new tab
      console.log('🔵 MainApp updating URL to:', `/app/${userId}?tab=${tab}`);
      navigate(`/app/${userId}?tab=${tab}`);
    }
  };

  if (loading) {
    return (
      <div className="main-app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="main-app">
        <div className="error">User not found</div>
      </div>
    );
  }

  const renderActiveScreen = () => {
    const categoryId = searchParams.get('category');
    const tab = searchParams.get('tab');
    
    // If we have a category and tab=expense, show the expense form
    if (categoryId && tab === 'expense') {
      return <AddAmountScreen userId={userId!} currentUser={currentUser} />;
    }
    
    // If tab=recurring, show recurring expenses screen
    if (tab === 'recurring') {
      return <RecurringExpensesScreen userId={userId!} currentUser={currentUser} />;
    }
    
    // If tab=large, show large expenses screen
    if (tab === 'large') {
      return <LargeExpensesScreen userId={userId!} currentUser={currentUser} />;
    }
    
    // Otherwise show the selected tab
    switch (activeTab) {
      case 'home':
        return <CategoriesScreen userId={userId!} currentUser={currentUser} />;
      case 'summary':
        return <SummaryScreen userId={userId!} currentUser={currentUser} />;
      case 'analytics':
        return <AnalyticsScreen userId={userId!} currentUser={currentUser} />;
      case 'income':
        return <IncomeScreen userId={userId!} currentUser={currentUser} />;
      default:
        return <CategoriesScreen userId={userId!} currentUser={currentUser} />;
    }
  };

  return (
    <>
      <div className="main-app">
        <header className="app-header">
          <h1 className="user-welcome">Welcome, {lastSelectedUser?.name || currentUser.name}</h1>
        </header>
        
        <main className="app-content">
          {renderActiveScreen()}
          <div className="bottom-spacer" />
        </main>
      </div>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  );
};

export default MainApp;
