require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ── Connect to Supabase ───────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────

app.get('/expenses', async function (req, res) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    console.log('GET /expenses —', data.length, 'rows');
    res.json(data);
  } catch (err) {
    console.error('GET /expenses error:', err.message);
    res.status(500).json({ error: err.message });
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
    console.log('POST /expenses — saved:', name, '$' + amount);
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('POST /expenses error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
    if (err.message.includes('unique')) {
      return res.status(400).json({ error: 'Category already exists.' });
    }
    console.error('POST /categories error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
// START
// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('');
  console.log('🚀 Server running on port', PORT);
  console.log('✅ Supabase connected — data saves permanently!');
  console.log('👉 Test: http://localhost:' + PORT + '/test');
  console.log('');
});