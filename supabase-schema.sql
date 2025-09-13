-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  budget DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create income table
CREATE TABLE income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recurring income table
CREATE TABLE recurring_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('bi-weekly', 'monthly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  last_generated_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users
INSERT INTO users (name, color) VALUES 
  ('Brock', '#3B82F6'),
  ('Alyssa', '#EF4444'),
  ('Sophia', '#10B981');

-- Insert default categories
INSERT INTO categories (name, color) VALUES 
  ('Gas', '#F59E0B'),
  ('Food', '#8B5CF6'),
  ('Mortgage', '#6B7280'),
  ('Dining', '#EC4899'),
  ('School', '#06B6D4'),
  ('TV', '#84CC16'),
  ('Tech', '#F97316');

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_income ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - adjust based on your security needs)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations on expenses" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on income" ON income FOR ALL USING (true);
CREATE POLICY "Allow all operations on recurring_income" ON recurring_income FOR ALL USING (true);

-- Create function to automatically generate recurring income
CREATE OR REPLACE FUNCTION generate_recurring_income()
RETURNS void AS $$
BEGIN
  -- Insert income for recurring income that hasn't been generated this month
  INSERT INTO income (user_id, amount, note, created_at)
  SELECT 
    ri.user_id,
    CASE 
      WHEN ri.frequency = 'bi-weekly' THEN ri.amount * 2  -- Convert bi-weekly to monthly
      WHEN ri.frequency = 'monthly' THEN ri.amount        -- Already monthly
      WHEN ri.frequency = 'yearly' THEN ri.amount / 12     -- Convert yearly to monthly
    END,
    COALESCE(ri.note, 'Recurring income') || ' (' || ri.frequency || ' - Auto-generated)',
    -- Create timestamp for the specific day of the month in the current month
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day' * (COALESCE(ri.day_of_month, 1) - 1) + INTERVAL '12 hours'
  FROM recurring_income ri
  WHERE (
    ri.last_generated_date IS NULL 
    OR ri.last_generated_date < DATE_TRUNC('month', CURRENT_DATE)
  )
  AND EXTRACT(DAY FROM CURRENT_DATE) >= COALESCE(ri.day_of_month, 1)
  -- Prevent duplicate generation by checking if income already exists for this month
  AND NOT EXISTS (
    SELECT 1 FROM income i 
    WHERE i.user_id = ri.user_id 
      AND i.note LIKE '%(' || ri.frequency || ' - Auto-generated)'
      AND DATE_TRUNC('month', i.created_at::date) = DATE_TRUNC('month', CURRENT_DATE)
  );
    
  -- Update last_generated_date for processed recurring income
  UPDATE recurring_income 
  SET last_generated_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE (
    last_generated_date IS NULL 
    OR last_generated_date < DATE_TRUNC('month', CURRENT_DATE)
  )
  AND EXTRACT(DAY FROM CURRENT_DATE) >= COALESCE(day_of_month, 1);
END;
$$ LANGUAGE plpgsql;

