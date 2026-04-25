require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// EXPENSES ENDPOINTS
// ─────────────────────────────────────────────────────────────

app.get('/expenses', async function (req, res) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/expenses', async function (req, res) {
  try {
    const { name, amount, category, date } = req.body;
    if (!name || !amount || !category || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ name, amount: parseFloat(amount), category, date }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/expenses/:id', async function (req, res) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CATEGORIES ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET all categories
app.get('/categories', async function (req, res) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST — add a new category
app.post('/categories', async function (req, res) {
  try {
    const { name, color } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required.' });
    }
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: name.trim(), color }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    // Handle duplicate category name gracefully
    if (error.message.includes('unique')) {
      return res.status(400).json({ error: 'Category already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE a category
app.delete('/categories/:id', async function (req, res) {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TEST
app.get('/test', function (req, res) {
  res.json({ message: 'Server running — Supabase connected! 🚀' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('🚀 Server running on port', PORT);
});