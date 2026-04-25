// ── Backend URL — your Render URL ────────────────────────────
const API_URL = 'https://expense-tracker-online-gdhv.onrender.com';

// ── App state ─────────────────────────────────────────────────
// Instead of hardcoded colors, we now load categories from backend
let categories   = [];   // [{id, name, color}, ...]
let spendingChart = null;

// ── Set today's date ──────────────────────────────────────────
document.getElementById('exp-date').valueAsDate = new Date();

// ─────────────────────────────────────────────────────────────
// STARTUP — load categories first, then expenses
// Categories must load first so the dropdown is populated
// ─────────────────────────────────────────────────────────────
async function init() {
  await loadCategories();
  await loadExpenses();
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES — load, render chips, populate dropdown
// ─────────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const res  = await fetch(API_URL + '/categories');
    categories = await res.json();
    renderCategoryChips();
    renderCategoryDropdown();
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

// Draw the colored chips in the Manage Categories section
function renderCategoryChips() {
  const container = document.getElementById('cat-chips');
  container.innerHTML = categories.map(cat => `
    <div class="cat-chip" style="background:${cat.color}">
      ${cat.name}
      <button
        class="cat-chip-remove"
        onclick="deleteCategory(${cat.id}, '${cat.name}')"
        title="Remove ${cat.name}"
      >✕</button>
    </div>
  `).join('');
}

// Fill the dropdown in the Add Expense form
function renderCategoryDropdown() {
  const select = document.getElementById('exp-category');
  select.innerHTML = categories.map(cat =>
    `<option value="${cat.name}">${cat.name}</option>`
  ).join('');
}

// ── ADD CATEGORY ──────────────────────────────────────────────
document.getElementById('btn-add-cat').addEventListener('click', async function () {
  const name  = document.getElementById('new-cat-name').value.trim();
  const color = document.getElementById('new-cat-color').value;

  if (!name) {
    alert('Please enter a category name.');
    return;
  }

  // Check if name already exists (case-insensitive)
  const exists = categories.some(c =>
    c.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    alert('That category already exists!');
    return;
  }

  const btn      = document.getElementById('btn-add-cat');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    const res = await fetch(API_URL + '/categories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, color })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save');
    }

    // Clear the name field, keep color for convenience
    document.getElementById('new-cat-name').value = '';

    // Reload categories so chips and dropdown update
    await loadCategories();

    // Reload expenses so chart updates with new color map
    await loadExpenses();

  } catch (err) {
    console.error('Failed to add category:', err);
    alert(err.message);
  } finally {
    btn.textContent = '+ Add';
    btn.disabled    = false;
  }
});

// ── DELETE CATEGORY ───────────────────────────────────────────
async function deleteCategory(id, name) {
  // Warn if expenses use this category
  if (!confirm(`Remove "${name}" category? Expenses using it will keep the name but lose the color.`)) {
    return;
  }

  try {
    await fetch(API_URL + '/categories/' + id, { method: 'DELETE' });
    await loadCategories();
    await loadExpenses();
  } catch (err) {
    console.error('Failed to delete category:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────
async function loadExpenses() {
  try {
    const res      = await fetch(API_URL + '/expenses');
    const expenses = await res.json();
    renderAll(expenses);
  } catch (err) {
    console.error('Failed to load expenses:', err);
    document.getElementById('expense-list').innerHTML =
      '<div class="empty-state">⚠️ Could not connect to server.</div>';
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

  const btn      = document.getElementById('btn-add');
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  try {
    const res = await fetch(API_URL + '/expenses', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, amount, category, date })
    });
    if (!res.ok) throw new Error('Failed to save');
    document.getElementById('exp-name').value   = '';
    document.getElementById('exp-amount').value = '';
    await loadExpenses();
  } catch (err) {
    console.error('Failed to add expense:', err);
    alert('Could not save. Please try again.');
  } finally {
    btn.textContent = '+ Add Expense';
    btn.disabled    = false;
  }
});

async function deleteExpense(id) {
  try {
    await fetch(API_URL + '/expenses/' + id, { method: 'DELETE' });
    await loadExpenses();
  } catch (err) {
    console.error('Failed to delete:', err);
  }
}

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
    // Look up color from our loaded categories
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

  // Build chart data from real categories + their actual colors
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
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ' $' + ctx.parsed.toFixed(2) }
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

// ── Start the app ─────────────────────────────────────────────
init();