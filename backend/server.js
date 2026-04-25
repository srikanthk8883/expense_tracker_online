// ── Load environment variables ────────────────────────────────
require('dotenv').config();

// ── Import tools ──────────────────────────────────────────────
const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ── Connect to Supabase ───────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Create Express app ────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────

// GET /expenses — return expenses for a specific user
app.get('/expenses', async function (req, res) {
  try {
    const user_id = req.query.user_id;

    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // If user_id is provided, filter to only that user's expenses
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    console.log('GET /expenses —', data.length, 'rows for user:', user_id || 'all');
    res.json(data);

  } catch (err) {
    console.error('GET /expenses error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /expenses — save a new expense with user_id
app.post('/expenses', async function (req, res) {
  try {
    const { name, amount, category, date, user_id } = req.body;

    if (!name || !amount || !category || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        name,
        amount:  parseFloat(amount),
        category,
        date,
        user_id: user_id || null
      }])
      .select();

    if (error) throw error;

    console.log('POST /expenses — saved:', name, '$' + amount, 'for user:', user_id);
    res.status(201).json(data[0]);

  } catch (err) {
    console.error('POST /expenses error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /expenses/:id — delete one expense
app.delete('/expenses/:id', async function (req, res) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    console.log('DELETE /expenses/' + req.params.id);
    res.json({ message: 'Deleted successfully.' });

  } catch (err) {
    console.error('DELETE /expenses error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

// GET /categories — return all categories
app.get('/categories', async function (req, res) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    console.log('GET /categories —', data.length, 'rows');
    res.json(data);

  } catch (err) {
    console.error('GET /categories error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /categories — add a new category
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

    console.log('POST /categories — saved:', name, color);
    res.status(201).json(data[0]);

  } catch (err) {
    // Handle duplicate category name
    if (err.message.includes('unique')) {
      return res.status(400).json({ error: 'Category already exists.' });
    }
    console.error('POST /categories error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /categories/:id — remove a category
app.delete('/categories/:id', async function (req, res) {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    console.log('DELETE /categories/' + req.params.id);
    res.json({ message: 'Category deleted.' });

  } catch (err) {
    console.error('DELETE /categories error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// TEST
// ─────────────────────────────────────────────────────────────

app.get('/test', function (req, res) {
  res.json({ message: 'Server running — Supabase connected! 🚀' });
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('');
  console.log('🚀 Server running on port', PORT);
  console.log('✅ Supabase connected — data saves permanently!');
  console.log('👉 Test: http://localhost:' + PORT + '/test');
  console.log('');
});