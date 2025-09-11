# Budget Tracker

A fast, modern, mobile-friendly budget tracker designed for one household with three users (Brock, Alyssa, Sophia).

## Features

- **User Selection**: Choose between Brock, Alyssa, or Sophia with distinct colors
- **Categories**: Add and manage expense categories with automatic color assignment
- **Expense Tracking**: Quick expense entry with amount and optional notes
- **Income Tracking**: Track bi-weekly income with monthly totals
- **Summary Views**: View spending by day, week, month, or year with progress bars
- **Budget Management**: Set monthly budgets per category
- **Dark Theme**: High contrast, mobile-friendly design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Start the Development Server

```bash
npm start
```

## Database Schema

The app uses the following tables:
- `users`: Brock, Alyssa, Sophia with distinct colors
- `categories`: Expense categories with colors and optional budgets
- `expenses`: Expense entries with user, category, amount, and notes
- `income`: Income entries with user, amount, and notes

## Usage

1. **Select User**: Choose your user from the landing screen
2. **Add Categories**: Use the + button to add new expense categories
3. **Track Expenses**: Tap a category to add an expense
4. **Add Income**: Use the Income tab to track income
5. **View Summary**: Check spending patterns and budget progress

## Tech Stack

- React with TypeScript
- Supabase for backend
- React Router for navigation
- Lucide React for icons
- CSS for styling