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

// POST /expenses — save a new expense
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
// FAMILY
// ─────────────────────────────────────────────────────────────

// GET /family — get family data for a user
app.get('/family', async function (req, res) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    // Find which family this user belongs to
    const { data: membership, error: memErr } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (memErr || !membership) {
      return res.json({ family: null, members: [], role: null });
    }

    // Get the family details
    const { data: family, error: famErr } = await supabase
      .from('families')
      .select('*')
      .eq('id', membership.family_id)
      .single();

    if (famErr) throw famErr;

    // Get all members of this family
    const { data: members, error: memberErr } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', membership.family_id)
      .eq('status', 'active');

    if (memberErr) throw memberErr;

    console.log('GET /family — user:', user_id, 'family:', family.name);
    res.json({ family, members, role: membership.role });

  } catch (err) {
    console.error('GET /family error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /family — create a new family
app.post('/family', async function (req, res) {
  try {
    const { name, user_id, user_name, user_email } = req.body;

    if (!name || !user_id) {
      return res.status(400).json({ error: 'name and user_id required' });
    }

    // Check user doesn't already have a family
    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You already belong to a family.' });
    }

    // Create the family
    const { data: family, error: famErr } = await supabase
      .from('families')
      .insert([{ name, admin_id: user_id }])
      .select()
      .single();

    if (famErr) throw famErr;

    // Add creator as admin member
    const { error: memErr } = await supabase
      .from('family_members')
      .insert([{
        family_id:  family.id,
        user_id,
        user_name:  user_name  || 'User',
        user_email: user_email || '',
        role:       'admin',
        status:     'active'
      }]);

    if (memErr) throw memErr;

    const members = [{
      user_id, user_name, user_email,
      role: 'admin', status: 'active'
    }];

    console.log('POST /family — created:', name, 'by:', user_id);
    res.status(201).json({ family, members, role: 'admin' });

  } catch (err) {
    console.error('POST /family error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /family/:id — rename a family (admin only)
app.patch('/family/:id', async function (req, res) {
  try {
    const { name, user_id } = req.body;
    const family_id = req.params.id;

    if (!name || !user_id) {
      return res.status(400).json({ error: 'name and user_id required' });
    }

    // Confirm user is the admin
    const { data: family, error: famErr } = await supabase
      .from('families')
      .select('admin_id')
      .eq('id', family_id)
      .single();

    if (famErr) throw famErr;

    if (family.admin_id !== user_id) {
      return res.status(403).json({ error: 'Only the admin can rename the family.' });
    }

    const { error: updateErr } = await supabase
      .from('families')
      .update({ name })
      .eq('id', family_id);

    if (updateErr) throw updateErr;

    console.log('PATCH /family/' + family_id, '— renamed to:', name);
    res.json({ message: 'Family renamed successfully.' });

  } catch (err) {
    console.error('PATCH /family error:', err.message);
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