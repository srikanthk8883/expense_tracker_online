// ── Import Supabase client ────────────────────────────────────
import { supabase } from './supabase-client.js';

// ── Backend URL ───────────────────────────────────────────────
const API_URL = 'https://expense-tracker-online-gdhv.onrender.com';

// ── App state ─────────────────────────────────────────────────
let categories    = [];
let spendingChart = null;
let currentUser   = null;
let currentFamily = null;

// ─────────────────────────────────────────────────────────────
// TAB SWITCHING
// ─────────────────────────────────────────────────────────────

window.showTab = function (tab) {
  document.getElementById('expenses-tab').style.display = 'none';
  document.getElementById('settings-tab').style.display = 'none';
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tab + '-tab').style.display   = 'block';
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'settings') loadFamilySettings();
};

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

document.getElementById('btn-google-login').addEventListener('click', async function () {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options:  { redirectTo: window.location.href }
  });
  if (error) {
    console.error('Login error:', error.message);
    alert('Login failed. Please try again.');
  }
});

document.getElementById('btn-signout').addEventListener('click', async function () {
  await supabase.auth.signOut();
  showLoginScreen();
});

supabase.auth.onAuthStateChange(async function (event, session) {
  console.log('Auth event:', event);
  if (session && session.user) {
    currentUser = session.user;
    showAppScreen();
    await init();
  } else {
    currentUser = null;
    showLoginScreen();
  }
});

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display   = 'none';
}

function showAppScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display   = 'block';

  const profile = currentUser.user_metadata;
  document.getElementById('user-name').textContent =
    profile.full_name || profile.name || 'User';

  const avatar = document.getElementById('user-avatar');
  if (profile.avatar_url || profile.picture) {
    avatar.src            = profile.avatar_url || profile.picture;
    avatar.style.display  = 'block';
  } else {
    avatar.style.display  = 'none';
  }
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

async function init() {
  document.getElementById('exp-date').valueAsDate = new Date();
  await loadCategories();
  await loadExpenses();
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

async function loadCategories() {
  try {
    const res = await fetch(API_URL + '/categories');
    if (!res.ok) throw new Error('Status ' + res.status);
    categories = await res.json();
    renderCategoryChips();
    renderCategoryDropdown();
  } catch (err) {
    console.error('loadCategories failed:', err.message);
  }
}

function renderCategoryChips() {
  const container = document.getElementById('cat-chips');
  if (categories.length === 0) {
    container.innerHTML =
      '<span style="color:#aaa;font-size:13px;">No categories yet</span>';
    return;
  }
  container.innerHTML = categories.map(cat => `
    <div class="cat-chip" style="background:${cat.color}">
      ${cat.name}
      <button
        class="cat-chip-remove"
        onclick="deleteCategory(${cat.id}, '${cat.name}')"
      >✕</button>
    </div>
  `).join('');
}

function renderCategoryDropdown() {
  const select = document.getElementById('exp-category');
  if (categories.length === 0) {
    select.innerHTML = '<option value="">No categories available</option>';
    return;
  }
  select.innerHTML = categories.map(cat =>
    `<option value="${cat.name}">${cat.name}</option>`
  ).join('');
}

document.getElementById('btn-add-cat').addEventListener('click', async function () {
  const name  = document.getElementById('new-cat-name').value.trim();
  const color = document.getElementById('new-cat-color').value;

  if (!name) { alert('Please enter a category name.'); return; }

  const exists = categories.some(c =>
    c.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) { alert('That category already exists!'); return; }

  const btn       = document.getElementById('btn-add-cat');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    const res = await fetch(API_URL + '/categories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, color })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    document.getElementById('new-cat-name').value = '';
    await loadCategories();
    await loadExpenses();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.textContent = '+ Add';
    btn.disabled    = false;
  }
});

window.deleteCategory = async function (id, name) {
  if (!confirm(`Remove "${name}"?`)) return;
  await fetch(API_URL + '/categories/' + id, { method: 'DELETE' });
  await loadCategories();
  await loadExpenses();
};

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────

async function loadExpenses() {
  try {
    const res = await fetch(API_URL + '/expenses?user_id=' + currentUser.id);
    if (!res.ok) throw new Error('Status ' + res.status);
    const expenses = await res.json();
    renderAll(expenses);
  } catch (err) {
    console.error('loadExpenses failed:', err.message);
    document.getElementById('expense-list').innerHTML =
      '<div class="empty-state">⚠️ Could not load expenses.</div>';
  }
}

document.getElementById('btn-add').addEventListener('click', async function () {
  const name     = document.getElementById('exp-name').value.trim();
  const amount   = parseFloat(document.getElementById('exp-amount').value);
  const category = document.getElementById('exp-category').value;
  const date     = document.getElementById('exp-date').value;

  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount.');
    return;
  }
  if (!category) {
    alert('Please select a category.');
    return;
  }

  const btn       = document.getElementById('btn-add');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    const res = await fetch(API_URL + '/expenses', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name, amount, category, date,
        user_id: currentUser.id
      })
    });
    if (!res.ok) throw new Error('Failed to save');
    document.getElementById('exp-name').value   = '';
    document.getElementById('exp-amount').value = '';
    await loadExpenses();
  } catch (err) {
    console.error('addExpense failed:', err.message);
    alert('Could not save. Please try again.');
  } finally {
    btn.textContent = '+ Add Expense';
    btn.disabled    = false;
  }
});

window.deleteExpense = async function (id) {
  try {
    await fetch(API_URL + '/expenses/' + id, { method: 'DELETE' });
    await loadExpenses();
  } catch (err) {
    console.error('deleteExpense failed:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────

function renderAll(expenses) {
  renderTotal(expenses);
  renderSummaryCards(expenses);
  renderExpenseList(expenses);
  renderChart(expenses);
}

function renderTotal(expenses) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  document.getElementById('total-amount').textContent =
    '$' + total.toFixed(2);
}

function renderSummaryCards(expenses) {
  const container = document.getElementById('summary-cards');
  let html = '';
  categories.forEach(function (cat) {
    const catExp = expenses.filter(e => e.category === cat.name);
    if (catExp.length === 0) return;
    const total = catExp.reduce((sum, e) => sum + e.amount, 0);
    html += `
      <div class="summary-card">
        <div class="label">${cat.name}</div>
        <div class="amount">$${total.toFixed(2)}</div>
        <div class="count">${catExp.length} expense${catExp.length > 1 ? 's' : ''}</div>
      </div>`;
  });
  container.innerHTML = html;
}

function renderExpenseList(expenses) {
  const list = document.getElementById('expense-list');
  if (expenses.length === 0) {
    list.innerHTML =
      '<div class="empty-state">No expenses yet. Add one above!</div>';
    return;
  }
  list.innerHTML = expenses.map(function (exp) {
    const cat   = categories.find(c => c.name === exp.category);
    const color = cat ? cat.color : '#888780';
    return `
      <div class="expense-item">
        <div class="exp-left">
          <div class="exp-dot" style="background:${color}"></div>
          <div>
            <div class="exp-name">${exp.name}</div>
            <div class="exp-meta">${exp.category} · ${exp.date}</div>
          </div>
        </div>
        <div class="exp-right">
          <div class="exp-amount">$${exp.amount.toFixed(2)}</div>
          <div class="exp-delete" onclick="deleteExpense(${exp.id})">✕</div>
        </div>
      </div>`;
  }).join('');
}

function renderChart(expenses) {
  const section = document.getElementById('chart-section');

  const activeCategories = categories.filter(cat =>
    expenses.some(e => e.category === cat.name)
  );

  if (activeCategories.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const labels  = activeCategories.map(c => c.name);
  const amounts = activeCategories.map(cat =>
    expenses
      .filter(e => e.category === cat.name)
      .reduce((sum, e) => sum + e.amount, 0)
  );
  const colors = activeCategories.map(c => c.color);
  const canvas = document.getElementById('spending-chart');

  if (spendingChart) {
    spendingChart.data.labels                      = labels;
    spendingChart.data.datasets[0].data            = amounts;
    spendingChart.data.datasets[0].backgroundColor = colors;
    spendingChart.update();
  } else {
    spendingChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data:            amounts,
          backgroundColor: colors,
          borderWidth:     3,
          borderColor:     '#ffffff',
          hoverOffset:     8
        }]
      },
      options: {
        cutout:  '68%',
        plugins: {
          legend:  { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' $' + ctx.parsed.toFixed(2)
            }
          }
        }
      }
    });
  }

  document.getElementById('chart-legend').innerHTML =
    activeCategories.map((cat, i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${colors[i]}"></div>
        <span class="legend-label">${cat.name}</span>
        <span class="legend-val">$${amounts[i].toFixed(2)}</span>
      </div>`
    ).join('');
}

// ─────────────────────────────────────────────────────────────
// SETTINGS — family management
// ─────────────────────────────────────────────────────────────

async function loadFamilySettings() {
  try {
    const res  = await fetch(API_URL + '/family?user_id=' + currentUser.id);
    const data = await res.json();

    if (data && data.family) {
      currentFamily = data.family;
      showFamilyCard(data.family, data.members, data.role);
    } else {
      showNoFamilyCard();
    }
  } catch (err) {
    console.error('loadFamilySettings failed:', err.message);
  }
}

function showNoFamilyCard() {
  document.getElementById('no-family-card').style.display  = 'block';
  document.getElementById('has-family-card').style.display = 'none';
}

function showFamilyCard(family, members, role) {
  document.getElementById('no-family-card').style.display  = 'none';
  document.getElementById('has-family-card').style.display = 'block';

  document.getElementById('family-display-name').textContent = family.name;
  document.getElementById('app-title').textContent           = family.name;

  if (role === 'admin') {
    document.getElementById('admin-badge').style.display       = 'flex';
    document.getElementById('rename-card').style.display       = 'block';
    document.getElementById('rename-family-input').value       = family.name;
    document.getElementById('pending-invites-card').style.display = 'block';
  } else {
    document.getElementById('admin-badge').style.display       = 'none';
    document.getElementById('rename-card').style.display       = 'none';
    document.getElementById('pending-invites-card').style.display = 'none';
  }

  renderMembers(members);
  loadInvitations(family.id, role);
}

function renderMembers(members) {
  const list = document.getElementById('members-list');

  if (!members || members.length === 0) {
    list.innerHTML = '<div class="empty-state">No members yet.</div>';
    return;
  }

  const colors = ['#1D9E75','#534AB7','#BA7517','#E24B4A','#0077CC'];

  list.innerHTML = members.map(function (m) {
    const initial = (m.user_name || m.user_email || '?')[0].toUpperCase();
    const isYou   = m.user_id === currentUser.id;
    const color   = colors[(initial.charCodeAt(0)) % colors.length];

    return `
      <div class="member-item">
        <div class="member-left">
          <div class="member-avatar" style="background:${color}">
            ${initial}
          </div>
          <div>
            <div class="member-name">
              ${m.user_name || 'Unknown'}${isYou ? ' (You)' : ''}
            </div>
            <div class="member-email">${m.user_email || ''}</div>
          </div>
        </div>
        <span class="member-role-badge
          ${m.role === 'admin' ? 'role-admin' : 'role-member'}">
          ${m.role === 'admin' ? '👑 Admin' : 'Member'}
        </span>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// INVITATIONS
// ─────────────────────────────────────────────────────────────

async function loadInvitations(family_id, role) {
  try {
    const res  = await fetch(
      API_URL + '/invitations?family_id=' + family_id +
      '&user_id=' + currentUser.id
    );
    const data = await res.json();

    renderAllInvites(data.all     || []);
    renderPending(data.pending    || [], role);

  } catch (err) {
    console.error('loadInvitations failed:', err.message);
  }
}

// Render ALL invitations sent (for everyone to see their own)
function renderAllInvites(invites) {
  const list = document.getElementById('all-invites-list');

  if (invites.length === 0) {
    list.innerHTML = '<div class="empty-state">No invitations sent yet.</div>';
    return;
  }

  list.innerHTML = invites.map(function (inv) {
    const statusClass = 'status-' + inv.status;
    return `
      <div class="invite-item">
        <div class="invite-left">
          <div class="invite-email">${inv.invited_email}</div>
          <div class="invite-meta">
            Invited by ${inv.invited_by_name || 'a member'}
          </div>
        </div>
        <span class="invite-status ${statusClass}">
          ${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
        </span>
      </div>`;
  }).join('');
}

// Render PENDING invitations — admin only, with Accept/Decline
function renderPending(pending, role) {
  const list = document.getElementById('pending-invites-list');

  if (pending.length === 0) {
    list.innerHTML = '<div class="empty-state">No pending invitations.</div>';
    return;
  }

  list.innerHTML = pending.map(function (inv) {
    return `
      <div class="invite-item" id="invite-${inv.id}">
        <div class="invite-left">
          <div class="invite-email">${inv.invited_email}</div>
          <div class="invite-meta">
            Invited by ${inv.invited_by_name || 'a member'}
          </div>
        </div>
        <div class="invite-actions">
          <button class="btn-accept"
            onclick="respondToInvite(${inv.id}, 'accepted', ${inv.family_id})">
            ✓ Accept
          </button>
          <button class="btn-decline"
            onclick="respondToInvite(${inv.id}, 'declined', ${inv.family_id})">
            ✕ Decline
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Send invitation ───────────────────────────────────────────
document.getElementById('btn-send-invite').addEventListener('click', async function () {
  const email = document.getElementById('invite-email-input').value.trim().toLowerCase();
  const statusEl = document.getElementById('invite-status');

  if (!email || !email.includes('@')) {
    statusEl.innerHTML = '<span class="invite-msg-error">Please enter a valid email address.</span>';
    return;
  }

  if (!currentFamily) {
    statusEl.innerHTML = '<span class="invite-msg-error">No family found.</span>';
    return;
  }

  const btn       = document.getElementById('btn-send-invite');
  btn.textContent = 'Sending...';
  btn.disabled    = true;
  statusEl.innerHTML = '';

  try {
    const profile = currentUser.user_metadata;
    const res = await fetch(API_URL + '/invitations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        family_id:       currentFamily.id,
        invited_by_id:   currentUser.id,
        invited_by_name: profile.full_name || profile.name || 'A member',
        invited_email:   email,
        admin_id:        currentFamily.admin_id
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send invite');

    document.getElementById('invite-email-input').value = '';

    // Show success message
    if (data.auto_accepted) {
      statusEl.innerHTML =
        '<span class="invite-msg-success">✅ Invited and auto-accepted! They can sign in now.</span>';
    } else {
      statusEl.innerHTML =
        '<span class="invite-msg-success">✅ Invite sent! Waiting for admin approval.</span>';
    }

    // Reload invitations list
    await loadInvitations(currentFamily.id, data.role || 'member');

  } catch (err) {
    console.error('sendInvite failed:', err.message);
    statusEl.innerHTML = `<span class="invite-msg-error">❌ ${err.message}</span>`;
  } finally {
    btn.textContent = 'Invite';
    btn.disabled    = false;
  }
});

// ── Accept or decline invitation (admin only) ─────────────────
window.respondToInvite = async function (invite_id, status, family_id) {
  try {
    const res = await fetch(API_URL + '/invitations/' + invite_id, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        status,
        user_id:   currentUser.id,
        family_id: currentFamily.id
      })
    });

    if (!res.ok) throw new Error('Failed to update invitation');

    // Reload settings to reflect changes
    await loadFamilySettings();

  } catch (err) {
    console.error('respondToInvite failed:', err.message);
    alert('Could not update invitation. Please try again.');
  }
};

// ── Create family ─────────────────────────────────────────────
document.getElementById('btn-create-family').addEventListener('click', async function () {
  const name = document.getElementById('family-name-input').value.trim();
  if (!name) { alert('Please enter a family name.'); return; }

  const btn       = document.getElementById('btn-create-family');
  btn.textContent = 'Creating...';
  btn.disabled    = true;

  try {
    const profile = currentUser.user_metadata;
    const res = await fetch(API_URL + '/family', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name,
        user_id:    currentUser.id,
        user_name:  profile.full_name || profile.name || 'User',
        user_email: currentUser.email
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create family');
    }

    const data = await res.json();
    currentFamily = data.family;
    showFamilyCard(data.family, data.members, 'admin');

  } catch (err) {
    console.error('createFamily failed:', err.message);
    alert(err.message);
  } finally {
    btn.textContent = 'Create';
    btn.disabled    = false;
  }
});

// ── Rename family (admin only) ────────────────────────────────
document.getElementById('btn-rename-family').addEventListener('click', async function () {
  const name = document.getElementById('rename-family-input').value.trim();
  if (!name)        { alert('Please enter a family name.'); return; }
  if (!currentFamily) return;

  const btn       = document.getElementById('btn-rename-family');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    const res = await fetch(API_URL + '/family/' + currentFamily.id, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, user_id: currentUser.id })
    });

    if (!res.ok) throw new Error('Failed to rename');

    currentFamily.name = name;
    document.getElementById('family-display-name').textContent = name;
    document.getElementById('app-title').textContent           = name;
    alert('Family name updated! ✅');

  } catch (err) {
    console.error('renameFamily failed:', err.message);
    alert('Could not rename. Please try again.');
  } finally {
    btn.textContent = 'Save';
    btn.disabled    = false;
  }
});

// ─────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────

init();