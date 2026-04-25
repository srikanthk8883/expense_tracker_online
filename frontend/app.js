// ── YOUR RENDER BACKEND URL ───────────────────────────────────
// Replace the URL below with YOUR actual Render URL
const API_URL = 'https://expense-tracker-online-gdhv.onrender.com';

// ── Category colors ───────────────────────────────────────────
const CATEGORY_COLORS = {
  Food:      '#1D9E75',
  Transport: '#534AB7',
  Shopping:  '#BA7517',
  Health:    '#E24B4A',
  Other:     '#888780'
};

// ── Chart instance ────────────────────────────────────────────
let spendingChart = null;

// ── Set today's date as default in the form ───────────────────
document.getElementById('exp-date').valueAsDate = new Date();

// ─────────────────────────────────────────────────────────────
// LOAD — fetch all expenses from backend when page opens
// This replaces our old "let expenses = []"
// Now data comes from Supabase via your backend
// ─────────────────────────────────────────────────────────────
async function loadExpenses() {
  try {
    const response = await fetch(API_URL + '/expenses');

    if (!response.ok) {
      throw new Error('Server returned ' + response.status);
    }

    const expenses = await response.json();
    renderAll(expenses);

  } catch (error) {
    console.error('Failed to load expenses:', error);
    document.getElementById('expense-list').innerHTML =
      '<div class="empty-state">Could not connect to server. Is it running?</div>';
  }
}

// ─────────────────────────────────────────────────────────────
// ADD — send new expense to backend when button is clicked
// ─────────────────────────────────────────────────────────────
document.getElementById('btn-add').addEventListener('click', async function () {

  // 1. Read form values
  const name     = document.getElementById('exp-name').value.trim();
  const amount   = parseFloat(document.getElementById('exp-amount').value);
  const category = document.getElementById('exp-category').value;
  const date     = document.getElementById('exp-date').value;

  // 2. Validate
  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount.');
    return;
  }

  // 3. Disable button while saving (prevents double clicks)
  const btn = document.getElementById('btn-add');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    // 4. Send to backend via POST request
    const response = await fetch(API_URL + '/expenses', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, amount, category, date })
    });

    if (!response.ok) {
      throw new Error('Server returned ' + response.status);
    }

    // 5. Clear the form fields
    document.getElementById('exp-name').value   = '';
    document.getElementById('exp-amount').value = '';

    // 6. Reload all expenses from backend
    await loadExpenses();

  } catch (error) {
    console.error('Failed to add expense:', error);
    alert('Could not save expense. Please try again.');

  } finally {
    // 7. Re-enable button no matter what happened
    btn.textContent = '+ Add Expense';
    btn.disabled = false;
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE — tell backend to remove this expense
// ─────────────────────────────────────────────────────────────
async function deleteExpense(id) {
  try {
    const response = await fetch(API_URL + '/expenses/' + id, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Server returned ' + response.status);
    }

    // Reload after deleting
    await loadExpenses();

  } catch (error) {
    console.error('Failed to delete expense:', error);
    alert('Could not delete expense. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER ALL — updates every visual part of the page
// Called after every load, add, or delete
// ─────────────────────────────────────────────────────────────
function renderAll(expenses) {
  renderTotal(expenses);
  renderSummaryCards(expenses);
  renderExpenseList(expenses);
  renderChart(expenses);
}

// ── RENDER TOTAL ──────────────────────────────────────────────
function renderTotal(expenses) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  document.getElementById('total-amount').textContent =
    '$' + total.toFixed(2);
}

// ── RENDER SUMMARY CARDS ──────────────────────────────────────
function renderSummaryCards(expenses) {
  const container  = document.getElementById('summary-cards');
  const categories = ['Food', 'Transport', 'Shopping', 'Health', 'Other'];
  let html = '';

  categories.forEach(function (cat) {
    const catExpenses = expenses.filter(exp => exp.category === cat);
    if (catExpenses.length === 0) return;

    const catTotal = catExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    html += `
      <div class="summary-card">
        <div class="label">${cat}</div>
        <div class="amount">$${catTotal.toFixed(2)}</div>
        <div class="count">${catExpenses.length} expense${catExpenses.length > 1 ? 's' : ''}</div>
      </div>`;
  });

  container.innerHTML = html;
}

// ── RENDER EXPENSE LIST ───────────────────────────────────────
function renderExpenseList(expenses) {
  const list = document.getElementById('expense-list');

  if (expenses.length === 0) {
    list.innerHTML = '<div class="empty-state">No expenses yet. Add one above!</div>';
    return;
  }

  list.innerHTML = expenses.map(function (exp) {
    const color = CATEGORY_COLORS[exp.category] || '#888';
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

// ── RENDER CHART ──────────────────────────────────────────────
function renderChart(expenses) {
  const section    = document.getElementById('chart-section');
  const categories = ['Food', 'Transport', 'Shopping', 'Health', 'Other'];

  const totals = categories.map(cat =>
    expenses
      .filter(exp => exp.category === cat)
      .reduce((sum, exp) => sum + exp.amount, 0)
  );

  const activeCategories = categories.filter((_, i) => totals[i] > 0);
  const activeAmounts    = totals.filter(t => t > 0);
  const activeColors     = activeCategories.map(cat => CATEGORY_COLORS[cat]);

  if (activeCategories.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  const canvas = document.getElementById('spending-chart');

  if (spendingChart) {
    spendingChart.data.labels                      = activeCategories;
    spendingChart.data.datasets[0].data            = activeAmounts;
    spendingChart.data.datasets[0].backgroundColor = activeColors;
    spendingChart.update();
  } else {
    spendingChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels:   activeCategories,
        datasets: [{
          data:            activeAmounts,
          backgroundColor: activeColors,
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
        <div class="legend-dot" style="background:${activeColors[i]}"></div>
        <span class="legend-label">${cat}</span>
        <span class="legend-val">$${activeAmounts[i].toFixed(2)}</span>
      </div>`
    ).join('');
}

// ── Start: load expenses when page first opens ────────────────
loadExpenses();