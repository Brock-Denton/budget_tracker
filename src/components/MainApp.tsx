import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, User } from '../lib/supabase';
import CategoriesScreen from './CategoriesScreen';
import AddAmountScreen from './AddAmountScreen';
import SummaryScreen from './SummaryScreen';
import IncomeScreen from './IncomeScreen';
import BottomNavigation from './BottomNavigation';
import './MainApp.css';

const MainApp: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'summary' | 'income'>('home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUser(userId);
    }
  }, [userId]);

  useEffect(() => {
    // Handle URL parameters for tab and category selection
    const tab = searchParams.get('tab');
    if (tab && ['home', 'summary', 'income'].includes(tab)) {
      setActiveTab(tab as 'home' | 'summary' | 'income');
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

  const handleTabChange = (tab: 'home' | 'summary' | 'income') => {
    if (tab === 'home') {
      // Reset to user selection screen
      navigate('/');
    } else {
      setActiveTab(tab);
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
    
    // Otherwise show the selected tab
    switch (activeTab) {
      case 'home':
        return <CategoriesScreen userId={userId!} currentUser={currentUser} />;
      case 'summary':
        return <SummaryScreen userId={userId!} currentUser={currentUser} />;
      case 'income':
        return <IncomeScreen userId={userId!} currentUser={currentUser} />;
      default:
        return <CategoriesScreen userId={userId!} currentUser={currentUser} />;
    }
  };

  return (
    <div className="main-app">
      <header className="app-header">
        <h1 className="user-welcome">Welcome, {currentUser.name}</h1>
      </header>
      
      <main className="app-content">
        {renderActiveScreen()}
      </main>
      
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default MainApp;
