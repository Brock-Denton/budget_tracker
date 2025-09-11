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
