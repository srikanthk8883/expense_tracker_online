// ── Data store ────────────────────────────────────────────────
let expenses = [];

// Category colors
const CATEGORY_COLORS = {
  Food:      '#1D9E75',
  Transport: '#534AB7',
  Shopping:  '#BA7517',
  Health:    '#E24B4A',
  Other:     '#888780'
};

// ── Chart instance (we keep one chart and update it) ──────────
// Think of this like a TV — we don't buy a new TV for each show,
// we just change the channel (update the data)
let spendingChart = null;

// ── Set today's date as default ───────────────────────────────
document.getElementById('exp-date').valueAsDate = new Date();

// ── ADD EXPENSE ───────────────────────────────────────────────
document.getElementById('btn-add').addEventListener('click', function () {

  const name     = document.getElementById('exp-name').value.trim();
  const amount   = parseFloat(document.getElementById('exp-amount').value);
  const category = document.getElementById('exp-category').value;
  const date     = document.getElementById('exp-date').value;

  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid name and amount.');
    return;
  }

  const expense = {
    id:       Date.now(),
    name:     name,
    amount:   amount,
    category: category,
    date:     date
  };

  expenses.push(expense);

  document.getElementById('exp-name').value   = '';
  document.getElementById('exp-amount').value = '';

  render();
});

// ── DELETE EXPENSE ────────────────────────────────────────────
function deleteExpense(id) {
  expenses = expenses.filter(function (exp) {
    return exp.id !== id;
  });
  render();
}

// ── RENDER: updates ALL parts of the page ────────────────────
function render() {
  renderTotal();
  renderSummaryCards();
  renderExpenseList();
  renderChart();        // NEW: update chart too
}

// ── RENDER TOTAL ──────────────────────────────────────────────
function renderTotal() {
  const total = expenses.reduce(function (sum, exp) {
    return sum + exp.amount;
  }, 0);
  document.getElementById('total-amount').textContent =
    '$' + total.toFixed(2);
}

// ── RENDER SUMMARY CARDS ──────────────────────────────────────
function renderSummaryCards() {
  const container = document.getElementById('summary-cards');
  const categories = ['Food', 'Transport', 'Shopping', 'Health', 'Other'];
  let html = '';

  categories.forEach(function (cat) {
    const catExpenses = expenses.filter(function (exp) {
      return exp.category === cat;
    });
    if (catExpenses.length === 0) return;

    const catTotal = catExpenses.reduce(function (sum, exp) {
      return sum + exp.amount;
    }, 0);

    html += `
      <div class="summary-card">
        <div class="label">${cat}</div>
        <div class="amount">$${catTotal.toFixed(2)}</div>
        <div class="count">${catExpenses.length} expense${catExpenses.length > 1 ? 's' : ''}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ── RENDER EXPENSE LIST ───────────────────────────────────────
function renderExpenseList() {
  const list = document.getElementById('expense-list');

  if (expenses.length === 0) {
    list.innerHTML = '<div class="empty-state">No expenses yet. Add one above!</div>';
    return;
  }

  const sorted = [...expenses].reverse();

  list.innerHTML = sorted.map(function (exp) {
    const color = CATEGORY_COLORS[exp.category] || '#888';
    return `
      <div class="expense-item">
        <div class="exp-left">
          <div class="exp-dot" style="background: ${color}"></div>
          <div>
            <div class="exp-name">${exp.name}</div>
            <div class="exp-meta">${exp.category} · ${exp.date}</div>
          </div>
        </div>
        <div class="exp-right">
          <div class="exp-amount">$${exp.amount.toFixed(2)}</div>
          <div class="exp-delete" onclick="deleteExpense(${exp.id})">✕</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── RENDER CHART ──────────────────────────────────────────────
function renderChart() {
  const section = document.getElementById('chart-section');
  const categories = ['Food', 'Transport', 'Shopping', 'Health', 'Other'];

  // Calculate total per category
  const totals = categories.map(function (cat) {
    return expenses
      .filter(function (exp) { return exp.category === cat; })
      .reduce(function (sum, exp) { return sum + exp.amount; }, 0);
  });

  // Only keep categories that have spending
  const activeCategories = categories.filter(function (_, i) {
    return totals[i] > 0;
  });
  const activeAmounts = totals.filter(function (t) { return t > 0; });
  const activeColors  = activeCategories.map(function (cat) {
    return CATEGORY_COLORS[cat];
  });

  // Hide the chart section if no expenses exist
  if (activeCategories.length === 0) {
    section.style.display = 'none';
    return;
  }

  // Show the chart section
  section.style.display = 'block';

  const canvas = document.getElementById('spending-chart');

  if (spendingChart) {
    // ── UPDATE existing chart (don't create a new one) ────────
    spendingChart.data.labels                        = activeCategories;
    spendingChart.data.datasets[0].data              = activeAmounts;
    spendingChart.data.datasets[0].backgroundColor   = activeColors;
    spendingChart.update();
  } else {
    // ── CREATE chart for the first time ───────────────────────
    spendingChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: activeCategories,
        datasets: [{
          data:            activeAmounts,
          backgroundColor: activeColors,
          borderWidth:     3,
          borderColor:     '#ffffff',
          hoverOffset:     8
        }]
      },
      options: {
        cutout: '68%',
        animation: { animateRotate: true, duration: 700 },
        plugins: {
          legend: { display: false },   // we draw our own legend below
          tooltip: {
            callbacks: {
              // Format tooltip to show dollar amounts
              label: function (context) {
                return ' $' + context.parsed.toFixed(2);
              }
            }
          }
        }
      }
    });
  }

  // ── Build the legend below the chart ─────────────────────
  const legendEl = document.getElementById('chart-legend');
  legendEl.innerHTML = activeCategories.map(function (cat, i) {
    return `
      <div class="legend-item">
        <div class="legend-dot" style="background:${activeColors[i]}"></div>
        <span class="legend-label">${cat}</span>
        <span class="legend-val">$${activeAmounts[i].toFixed(2)}</span>
      </div>
    `;
  }).join('');
}

// ── Initial render ────────────────────────────────────────────
render();