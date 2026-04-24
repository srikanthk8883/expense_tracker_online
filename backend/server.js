// ── Load environment variables ────────────────────────────────
require('dotenv').config();

// ── Import tools ──────────────────────────────────────────────
const express    = require('express');
const cors       = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ── Connect to Supabase ───────────────────────────────────────
// createClient is like dialing a phone number to your database
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ── Create Express app ────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ────────────────────────────────────────────────────────────────

// ── GET /expenses — fetch ALL expenses from Supabase ──────────
app.get('/expenses', async function (req, res) {
  try {
    // Ask Supabase: go to the 'expenses' table, get everything,
    // sorted by created_at newest first
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // If Supabase returns an error, throw it so catch() handles it
    if (error) throw error;

    console.log('📋 GET /expenses —', data.length, 'found');
    res.json(data);

  } catch (error) {
    console.error('❌ GET /expenses error:', error.message);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

// ── POST /expenses — save a NEW expense to Supabase ───────────
app.post('/expenses', async function (req, res) {
  try {
    const { name, amount, category, date } = req.body;

    if (!name || !amount || !category || !date) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newExpense = {
      name:     name,
      amount:   parseFloat(amount),
      category: category,
      date:     date
    };

    // ── Log exactly what we are sending to Supabase ───────────
    console.log('📤 Sending to Supabase:', newExpense);

    const { data, error } = await supabase
      .from('expenses')
      .insert([newExpense])
      .select();

    // ── Log exactly what Supabase sends back ──────────────────
    console.log('📥 Supabase response data:', data);
    console.log('📥 Supabase response error:', error);

    if (error) throw error;

    console.log('✅ POST /expenses — saved:', name, '$' + amount);
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('❌ POST /expenses error:', error.message);
    res.status(500).json({ error: 'Failed to save expense.' });
  }
});

// ── DELETE /expenses/:id — remove one expense ─────────────────
app.delete('/expenses/:id', async function (req, res) {
  try {
    const id = req.params.id;

    // Delete the row where id matches
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);   // .eq means "where id equals this value"

    if (error) throw error;

    console.log('🗑️  DELETE /expenses/' + id);
    res.json({ message: 'Deleted successfully.' });

  } catch (error) {
    console.error('❌ DELETE /expenses error:', error.message);
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

// ── TEST endpoint ─────────────────────────────────────────────
app.get('/test', function (req, res) {
  res.json({ message: 'Server running — Supabase connected! 🚀' });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
  console.log('');
  console.log('🚀 Expense Tracker server running on port', PORT);
  console.log('✅ Supabase connected — data saves permanently!');
  console.log('👉 Test: http://localhost:' + PORT + '/test');
  console.log('');
});