// ── Backend URL ───────────────────────────────────────────────
// For local testing:  'http://localhost:3000'
// For production:     'https://your-actual-render-url.onrender.com'
const API_URL = 'http://localhost:3000';

// ── App state ─────────────────────────────────────────────────
let categories    = [];
let spendingChart = null;

// ── Set today's date in form ──────────────────────────────────
document.getElementById('exp-date').valueAsDate = new Date();

// ─────────────────────────────────────────────────────────────
// INIT — runs when page loads
// loads categories first so dropdown is ready before expenses
// ─────────────────────────────────────────────────────────────
async function init() {
  console.log('App starting — API_URL:', API_URL);
  await loadCategories();
  await loadExpenses();
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

async function loadCategories() {
  try {
    console.log('Fetching categories...');
    const res = await fetch(API_URL + '/categories');
    if (!res.ok) throw new Error('Status ' + res.status);
    categories = await res.json();
    console.log('Categories loaded:', categories.length);
    renderCategoryChips();
    renderCategoryDropdown();
  } catch (err) {
    console.error('loadCategories failed:', err.message);
    document.getElementById('exp-category').innerHTML =
      '<option value="">Could not load categories</option>';
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
        title="Remove ${cat.name}"
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

  if (!name) {
    alert('Please enter a category name.');
    return;
  }

  const exists = categories.some(c =>
    c.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    alert('That category already exists!');
    return;
  }

  const btn       = document.getElementById('btn-add-cat');
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
    document.getElementById('new-cat-name').value = '';
    await loadCategories();
    await loadExpenses();
  } catch (err) {
    console.error('addCategory failed:', err.message);
    alert(err.message);
  } finally {
    btn.textContent = '+ Add';
    btn.disabled    = false;
  }
});

async function deleteCategory(id, name) {
  if (!confirm(`Remove "${name}"? Expenses using it will keep the name.`)) return;
  try {
    await fetch(API_URL + '/categories/' + id, { method: 'DELETE' });
    await loadCategories();
    await loadExpenses();
  } catch (err) {
    console.error('deleteCategory failed:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────

async function loadExpenses() {
  try {
    console.log('Fetching expenses...');
    const res = await fetch(API_URL + '/expenses');
    if (!res.ok) throw new Error('Status ' + res.status);
    const expenses = await res.json();
    console.log('Expenses loaded:', expenses.length);
    renderAll(expenses);
  } catch (err) {
    console.error('loadExpenses failed:', err.message);
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
      body:    JSON.stringify({ name, amount, category, date })
    });
    if (!res.ok) throw new Error('Status ' + res.status);
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

async function deleteExpense(id) {
  try {
    await fetch(API_URL + '/expenses/' + id, { method: 'DELETE' });
    await loadExpenses();
  } catch (err) {
    console.error('deleteExpense failed:', err.message);
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

// ── Start ─────────────────────────────────────────────────────
init();