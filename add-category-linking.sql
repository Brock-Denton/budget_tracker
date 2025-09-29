-- Add column to categories table to track which categories are linked to Normal Expenses
-- This allows categories from Recurring and Large expenses to be reused in Normal Expenses

ALTER TABLE categories ADD COLUMN is_linked_to_normal BOOLEAN DEFAULT false;
