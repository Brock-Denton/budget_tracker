-- Update the generate_large_expenses function to generate expenses for all 12 months
-- This file only contains the function update, not the column addition

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
