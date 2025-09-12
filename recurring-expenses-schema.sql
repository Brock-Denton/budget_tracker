-- Add is_recurring_only field to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_recurring_only BOOLEAN DEFAULT false;

-- Create recurring_expenses table
CREATE TABLE recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Create policy (allow all operations for now - adjust based on your security needs)
CREATE POLICY "Allow all operations on recurring_expenses" ON recurring_expenses FOR ALL USING (true);

-- Create function to automatically generate recurring expenses
CREATE OR REPLACE FUNCTION generate_recurring_expenses()
RETURNS void AS $$
BEGIN
  -- Insert expenses for recurring expenses that haven't been generated this month
  INSERT INTO expenses (user_id, category_id, amount, note, created_at)
  SELECT 
    re.user_id,
    re.category_id,
    re.amount,
    COALESCE(re.note, 'Recurring expense') || ' (Auto-generated)',
    -- Create timestamp for the specific day of the month in the current month
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' * (re.day_of_month - 1) + INTERVAL '12 hours'
  FROM recurring_expenses re
  WHERE re.is_active = true
    AND (
      re.last_generated_date IS NULL 
      OR re.last_generated_date < DATE_TRUNC('month', CURRENT_DATE)
    )
    AND EXTRACT(DAY FROM CURRENT_DATE) >= re.day_of_month
    -- Prevent duplicate generation by checking if expense already exists for this month
    AND NOT EXISTS (
      SELECT 1 FROM expenses e 
      WHERE e.user_id = re.user_id 
        AND e.category_id = re.category_id 
        AND e.amount = re.amount
        AND e.note LIKE '%(Auto-generated)'
        AND DATE_TRUNC('month', e.created_at::date) = DATE_TRUNC('month', CURRENT_DATE)
    );
    
  -- Update last_generated_date for processed recurring expenses
  UPDATE recurring_expenses 
  SET last_generated_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE is_active = true
    AND (
      last_generated_date IS NULL 
      OR last_generated_date < DATE_TRUNC('month', CURRENT_DATE)
    )
    AND EXTRACT(DAY FROM CURRENT_DATE) >= day_of_month;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically call the function daily
-- Note: This would typically be set up as a cron job or scheduled task
-- For now, we'll call it manually when needed

