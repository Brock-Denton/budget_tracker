-- Test if the generate_recurring_expenses function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'generate_recurring_expenses';

-- Test if the recurring_expenses table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'recurring_expenses';

-- Test if the is_recurring_only column exists in categories
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'categories' AND column_name = 'is_recurring_only';

