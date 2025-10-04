-- Add large expenses functionality
-- This allows users to enter large one-time expenses that get spread across the year

-- Add column to categories table to distinguish large expense categories
ALTER TABLE categories ADD COLUMN is_large_expense_only BOOLEAN DEFAULT false;

-- Create large_expenses table
CREATE TABLE large_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL, -- total_amount / 12
  note TEXT,
  day_of_month INTEGER DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policy for large_expenses
CREATE POLICY "Allow all operations on large_expenses" ON large_expenses FOR ALL USING (true);

-- Create function to generate monthly expenses from large expenses for all 12 months
CREATE OR REPLACE FUNCTION generate_large_expenses()
RETURNS void AS $$
BEGIN
  -- Generate expenses for all 12 months for each active large expense
  INSERT INTO expenses (user_id, category_id, amount, note, created_at)
  SELECT 
    le.user_id,
    le.category_id,
    le.monthly_amount,
    COALESCE(le.note, 'Large expense') || ' (Monthly portion)',
    -- Create timestamp for the specific day of the month for each of the 12 months
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * (month_offset) + INTERVAL '1 day' * (le.day_of_month - 1) + INTERVAL '12 hours'
  FROM large_expenses le
  CROSS JOIN generate_series(0, 11) AS month_offset
  WHERE le.is_active = true
    -- Only generate for months that haven't been created yet
    AND NOT EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.user_id = le.user_id 
        AND e.category_id = le.category_id
        AND e.amount = le.monthly_amount
        AND e.note LIKE '%Monthly portion%'
        AND DATE_TRUNC('month', e.created_at) = DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * (month_offset)
    );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_large_expenses_updated_at 
    BEFORE UPDATE ON large_expenses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();










