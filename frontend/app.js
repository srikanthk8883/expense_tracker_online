// ── Import Supabase client ────────────────────────────────────
import { supabase } from './supabase-client.js';

// ── Backend URL (Node.js for categories + expenses) ───────────
const API_URL = 'https://expense-tracker-online-gdhv.onrender.com';

// ── App state ─────────────────────────────────────────────────
let categories    = [];
let spendingChart = null;
let currentUser   = null;   // stores the logged-in user object

// ─────────────────────────────────────────────────────────────
// AUTH — handle login, logout, session
// ─────────────────────────────────────────────────────────────

// Sign in with Google — opens a popup
document.getElementById('btn-google-login').addEventListener('click', async function () {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href
    }
  });
  if (error) {
    console.error('Login error:', error.message);
    alert('Login failed. Please try again.');
  }
});

// Sign out
document.getElementById('btn-signout').addEventListener('click', async function () {
  await supabase.auth.signOut();
  showLoginScreen();
});

// ── Listen for auth state changes ─────────────────────────────
// This runs whenever login/logout happens
// It's the heart of the auth system
supabase.auth.onAuthStateChange(async function (event, session) {
  console.log('Auth event:', event);

  if (session && session.user) {
    // User is logged in
    currentUser = session.user;
    showAppScreen();
    await init();
  } else {
    // User is logged out
    currentUser = null;
    showLoginScreen();
  }
});

// ── Show / hide screens ───────────────────────────────────────
function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display   = 'none';
}

function showAppScreen() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display   = 'block';

  // Show user name and avatar in header
  const profile = currentUser.user_metadata;
  document.getElementById('user-name').textContent = profile.full_name || profile.name || 'User';

  const avatar = document.getElementById('user-avatar');
  if (profile.avatar_url || profile.picture) {
    avatar.src = profile.avatar_url || profile.picture;
    avatar.style.display = 'block';
  } else {
    avatar.style.display = 'none';
  }
}

// ─────────────────────────────────────────────────────────────
// INIT — runs after successful login
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
    container.innerHTML = '<span style="color:#aaa;font-size:13px;">No categories yet</span>';
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
  select.innerHTML = categories.map(cat =>
    `<option value="${cat.name}">${cat.name}</option>`
  ).join('');
}

document.getElementById('btn-add-cat').addEventListener('click', async function () {
  const name  = document.getElementById('new-cat-name').value.trim();
  const color = document.getElementById('new-cat-color').value;
  if (!name) { alert('Please enter a category name.'); return; }

  const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase());
  if (exists) { alert('That category already exists!'); return; }

  const btn = document.getElementById('btn-add-cat');
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
// EXPENSES — now filtered by logged-in user
// ─────────────────────────────────────────────────────────────

async function loadExpenses() {
  try {
    // Pass the user's ID so backend only returns their expenses
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

  const btn = document.getElementById('btn-add');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    const res = await fetch(API_URL + '/expenses', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name, amount, category, date,
        user_id: currentUser.id  // tag expense with who added it
      })
    });
    if (!res.ok) throw new Error('Failed to save');
    document.getElementById('exp-name').value   = '';
    document.getElementById('exp-amount').value = '';
    await loadExpenses();
  } catch (err) {
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
  document.getElementById('total-amount').textContent = '$' + total.toFixed(2);
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
    list.innerHTML = '<div class="empty-state">No expenses yet. Add one above!</div>';
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
    expenses.filter(e => e.category === cat.name)
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
          data: amounts, backgroundColor: colors,
          borderWidth: 3, borderColor: '#ffffff', hoverOffset: 8
        }]
      },
      options: {
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' $' + ctx.parsed.toFixed(2) } }
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