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
// INVITATIONS
// ─────────────────────────────────────────────────────────────

// GET /invitations — get all invitations for a family
app.get('/invitations', async function (req, res) {
  try {
    const { family_id, user_id } = req.query;
    if (!family_id) return res.status(400).json({ error: 'family_id required' });

    // Get ALL invitations for this family
    const { data: all, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('family_id', family_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Separate pending ones for admin view
    const pending = all.filter(inv => inv.status === 'pending');

    console.log('GET /invitations — family:', family_id,
      '| all:', all.length, '| pending:', pending.length);

    res.json({ all, pending });

  } catch (err) {
    console.error('GET /invitations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /invitations — send a new invitation
app.post('/invitations', async function (req, res) {
  try {
    const {
      family_id,
      invited_by_id,
      invited_by_name,
      invited_email,
      admin_id
    } = req.body;

    if (!family_id || !invited_by_id || !invited_email) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Check if this email is already a member
    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', family_id)
      .eq('user_email', invited_email)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'This person is already a member of your family.'
      });
    }

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('family_id', family_id)
      .eq('invited_email', invited_email)
      .single();

    if (existingInvite && existingInvite.status === 'pending') {
      return res.status(400).json({
        error: 'An invitation is already pending for this email.'
      });
    }

    // ── Key logic: admin invites = auto accepted ──────────────
    const isAdmin      = invited_by_id === admin_id;
    const status       = isAdmin ? 'accepted' : 'pending';
    const auto_accepted = isAdmin;

    // Save the invitation
    const { data: invitation, error: invErr } = await supabase
      .from('invitations')
      .insert([{
        family_id,
        invited_by_id,
        invited_by_name: invited_by_name || 'A member',
        invited_email,
        status
      }])
      .select()
      .single();

    if (invErr) throw invErr;

    // If auto-accepted (admin invite) — add to family_members immediately
    if (auto_accepted) {
      await supabase
        .from('family_members')
        .insert([{
          family_id,
          user_id:    invited_email,  // placeholder until they sign in
          user_email: invited_email,
          user_name:  invited_email.split('@')[0],
          role:       'member',
          status:     'active'
        }]);
    }

    console.log('POST /invitations — invited:', invited_email,
      '| status:', status, '| auto_accepted:', auto_accepted);

    res.status(201).json({ invitation, auto_accepted });

  } catch (err) {
    console.error('POST /invitations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /invitations/:id — accept or decline (admin only)
app.patch('/invitations/:id', async function (req, res) {
  try {
    const { status, user_id, family_id } = req.body;
    const invite_id = req.params.id;

    if (!status || !user_id) {
      return res.status(400).json({ error: 'status and user_id required' });
    }

    // Confirm user is the admin
    const { data: family, error: famErr } = await supabase
      .from('families')
      .select('admin_id')
      .eq('id', family_id)
      .single();

    if (famErr) throw famErr;

    if (family.admin_id !== user_id) {
      return res.status(403).json({
        error: 'Only the admin can accept or decline invitations.'
      });
    }

    // Get the invitation details
    const { data: invite, error: invErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invite_id)
      .single();

    if (invErr) throw invErr;

    // Update invitation status
    const { error: updateErr } = await supabase
      .from('invitations')
      .update({ status })
      .eq('id', invite_id);

    if (updateErr) throw updateErr;

    // If accepted — add to family_members
    if (status === 'accepted') {
      await supabase
        .from('family_members')
        .insert([{
          family_id:  invite.family_id,
          user_id:    invite.invited_email,  // placeholder until they sign in
          user_email: invite.invited_email,
          user_name:  invite.invited_email.split('@')[0],
          role:       'member',
          status:     'active'
        }]);
    }

    console.log('PATCH /invitations/' + invite_id, '— status:', status);
    res.json({ message: 'Invitation ' + status + '.' });

  } catch (err) {
    console.error('PATCH /invitations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /family/join — auto-join family when invited user signs in
app.post('/family/join', async function (req, res) {
  try {
    const { user_id, user_email, user_name } = req.body;

    if (!user_id || !user_email) {
      return res.status(400).json({ error: 'user_id and user_email required' });
    }

    // Check if this user already belongs to a family
    const { data: existing } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (existing) {
      return res.json({ joined: false, message: 'Already in a family.' });
    }

    // Check if this email has an accepted invitation
    const { data: invite, error: invErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('invited_email', user_email.toLowerCase())
      .eq('status', 'accepted')
      .single();

    if (invErr || !invite) {
      return res.json({ joined: false, message: 'No accepted invitation found.' });
    }

    // Update the placeholder family_member row with real user_id
    const { error: updateErr } = await supabase
      .from('family_members')
      .update({
        user_id,
        user_name:  user_name  || user_email.split('@')[0],
        user_email: user_email
      })
      .eq('family_id',  invite.family_id)
      .eq('user_email', user_email.toLowerCase());

    if (updateErr) {
      // If update fails try inserting fresh
      const { error: insertErr } = await supabase
        .from('family_members')
        .insert([{
          family_id:  invite.family_id,
          user_id,
          user_name:  user_name  || user_email.split('@')[0],
          user_email: user_email,
          role:       'member',
          status:     'active'
        }]);

      if (insertErr) throw insertErr;
    }

    console.log('POST /family/join — user:', user_email,
      'joined family:', invite.family_id);

    res.json({ joined: true, family_id: invite.family_id });

  } catch (err) {
    console.error('POST /family/join error:', err.message);
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