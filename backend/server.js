// ── Import our tools ──────────────────────────────────────────
// 'require' is how Node.js loads tools — like 'import' in other languages
const express = require('express');
const cors    = require('cors');

// ── Create the Express app ────────────────────────────────────
// Think of 'app' as our restaurant — we'll add menu items (routes) to it
const app = express();

// ── Middleware: tools that run on EVERY request ───────────────
app.use(cors());              // Allow frontend to talk to this server
app.use(express.json());      // Understand JSON data sent from frontend

// ── Temporary data store (memory only — replaced by Firebase in Phase 4) ──
// Just like Phase 1 frontend, we start with an array
// This resets every time the server restarts — that's okay for now
let expenses = [];
let nextId   = 1;   // simple counter for unique IDs

// ────────────────────────────────────────────────────────────────
// API ENDPOINTS — these are the "menu items" your frontend can order
// ────────────────────────────────────────────────────────────────

// ── GET /expenses — return all expenses ──────────────────────
// When frontend asks "give me all expenses", this runs
app.get('/expenses', function (req, res) {
  console.log('📋 GET /expenses — sending', expenses.length, 'expenses');
  res.json(expenses);   // send the array back as JSON
});

// ── POST /expenses — save a new expense ──────────────────────
// When frontend sends a new expense, this runs
app.post('/expenses', function (req, res) {
  const { name, amount, category, date } = req.body;  // unpack the data sent

  // Validate — make sure required fields exist
  if (!name || !amount || !category || !date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Build the new expense object
  const newExpense = {
    id:       nextId++,              // increment our counter
    name:     name,
    amount:   parseFloat(amount),
    category: category,
    date:     date
  };

  expenses.push(newExpense);  // add to our in-memory store

  console.log('✅ POST /expenses — saved:', newExpense.name, '$' + newExpense.amount);
  res.status(201).json(newExpense);  // 201 = "Created successfully"
});

// ── DELETE /expenses/:id — remove one expense ─────────────────
// The :id part is a variable — it changes based on which expense to delete
app.delete('/expenses/:id', function (req, res) {
  const id = parseInt(req.params.id);  // grab the id from the URL

  const before = expenses.length;
  expenses = expenses.filter(function (exp) {
    return exp.id !== id;
  });

  if (expenses.length === before) {
    // Nothing was deleted — id not found
    return res.status(404).json({ error: 'Expense not found.' });
  }

  console.log('🗑️  DELETE /expenses/' + id);
  res.json({ message: 'Deleted successfully.' });
});

// ── TEST endpoint — just to confirm the server works ─────────
app.get('/test', function (req, res) {
  res.json({ message: 'Server is running! 🚀' });
});

// ── Start the server and listen for requests ──────────────────
// Port 3000 is the "door" requests come through on your computer
const PORT = 3000;
app.listen(PORT, function () {
  console.log('');
  console.log('🚀 Expense Tracker server running!');
  console.log('👉 Test it: http://localhost:' + PORT + '/test');
  console.log('');
});