import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface User {
  id: string
  name: string
  color: string
}

export interface Category {
  id: string
  name: string
  color: string
  budget?: number | null
  is_recurring_only?: boolean
}

export interface Expense {
  id: string
  user_id: string
  category_id: string
  amount: number
  note?: string
  created_at: string
}

export interface Income {
  id: string
  user_id: string
  amount: number
  note?: string
  created_at: string
}

export interface RecurringIncome {
  id: string
  user_id: string
  amount: number
  note?: string
  frequency: 'bi-weekly' | 'monthly' | 'yearly'
  day_of_month?: number
  last_generated_date?: string
  created_at: string
  updated_at: string
}

export interface RecurringExpense {
  id: string
  user_id: string
  category_id: string
  amount: number
  note?: string
  day_of_month: number
  is_active: boolean
  last_generated_date: string | null
  created_at: string
  updated_at: string
}

export interface LargeExpense {
  id: string
  user_id: string
  category_id: string
  total_amount: number
  monthly_amount: number
  note?: string
  day_of_month: number
  is_active: boolean
  created_at: string
  updated_at: string
}
