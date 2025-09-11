-- Update all category colors to be unique
-- This script assigns distinct colors to all categories

-- Categories with #6366f1 (indigo) - assign unique colors
UPDATE categories SET color = '#FF6B6B' WHERE name = 'Healthcare';        -- Coral red
UPDATE categories SET color = '#4ECDC4' WHERE name = 'Lax Plus';          -- Teal
UPDATE categories SET color = '#45B7D1' WHERE name = 'Ski Pass';          -- Sky blue
UPDATE categories SET color = '#96CEB4' WHERE name = 'Entertainment';     -- Mint green
UPDATE categories SET color = '#FFEAA7' WHERE name = 'Home Fixes';        -- Yellow
UPDATE categories SET color = '#DDA0DD' WHERE name = 'Heat & Electricity'; -- Plum
UPDATE categories SET color = '#98D8C8' WHERE name = 'Gas';               -- Seafoam green (duplicate name)
UPDATE categories SET color = '#FFB347' WHERE name = 'Summer Camp';       -- Peach
UPDATE categories SET color = '#87CEEB' WHERE name = 'Sophia Life';       -- Sky blue
UPDATE categories SET color = '#D8BFD8' WHERE name = 'Tech Software';     -- Thistle
UPDATE categories SET color = '#F0E68C' WHERE name = 'Brock Life';        -- Khaki
UPDATE categories SET color = '#FFA07A' WHERE name = 'Household Goods';   -- Light salmon
UPDATE categories SET color = '#20B2AA' WHERE name = 'Alyssa Life';       -- Light sea green
UPDATE categories SET color = '#FF69B4' WHERE name = 'Mosquito Joe';      -- Hot pink
UPDATE categories SET color = '#9370DB' WHERE name = 'Clothes';           -- Medium purple

-- Keep existing unique colors
-- Tech: #F97316 (orange-red) - keep
-- College Debt: #3B82F6 (blue) - keep  
-- TV: #84CC16 (lime) - keep
-- Dining: #EC4899 (pink) - keep
-- Phone: #EF4444 (red) - keep
-- Mortgage: #6B7280 (gray) - keep
-- School: #06B6D4 (cyan) - keep
-- Car Insurance: #10B981 (emerald) - keep
-- Food: #8B5CF6 (purple) - keep
-- Gas (original): #F59E0B (amber) - keep
