-- Test if recurring expenses and categories exist
SELECT 'Categories (including recurring-only):' as test_type, count(*) as count FROM categories;
SELECT 'Recurring-only categories:' as test_type, count(*) as count FROM categories WHERE is_recurring_only = true;
SELECT 'Recurring expenses:' as test_type, count(*) as count FROM recurring_expenses;
SELECT 'Generated expenses from recurring:' as test_type, count(*) as count FROM expenses WHERE note LIKE '%Recurring%';

-- Show actual data
SELECT 'All categories:' as test_type, id, name, is_recurring_only, color FROM categories ORDER BY name;
SELECT 'Recurring expenses:' as test_type, id, user_id, category_id, amount, day_of_month, is_active FROM recurring_expenses;
SELECT 'Recent expenses:' as test_type, id, user_id, category_id, amount, note, created_at FROM expenses ORDER BY created_at DESC LIMIT 10;
