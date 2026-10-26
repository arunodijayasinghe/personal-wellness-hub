require('dotenv').config();
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Get all categories (for the dropdown)
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load categories' });
  }
});

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const LIMITS = {
  Exercise: [0, 600],
  Sleep: [0, 24],
  Water: [0, 30],
  Meditation: [0, 300],
  Mood: [1, 10]
};

// Returns an error message, or null if the data is valid
async function validateLog(body) {
  const { category_id, title, amount, log_date, notes } = body;

  if (!category_id || !title || amount === '' || amount === undefined || !log_date) {
    return 'Category, title, amount and date are required';
  }
  if (title.trim().length < 2 || title.trim().length > 100) {
    return 'Title must be 2 to 100 characters';
  }
  const num = Number(amount);
  if (Number.isNaN(num)) {
    return 'Amount must be a number';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log_date) || Number.isNaN(Date.parse(log_date))) {
    return 'Date is not valid';
  }
  if (log_date > todayString()) {
    return 'Date cannot be in the future';
  }
  if (notes && notes.length > 500) {
    return 'Notes must be 500 characters or fewer';
  }

  const [cats] = await pool.query('SELECT name FROM categories WHERE category_id = ?', [category_id]);
  if (cats.length === 0) {
    return 'Selected category does not exist';
  }
  const [min, max] = LIMITS[cats[0].name] || [0, 1000];
  if (num < min || num > max) {
    return `${cats[0].name} amount must be between ${min} and ${max}`;
  }
  return null;
}

// CREATE a new wellness log
app.post('/api/logs', async (req, res) => {
  const { category_id, title, amount, notes, log_date } = req.body;

    const problem = await validateLog(req.body);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO wellness_logs (category_id, title, amount, notes, log_date) VALUES (?, ?, ?, ?, ?)',
      [category_id, title.trim(), amount, notes || null, log_date]
    );
    res.status(201).json({ message: 'Log added successfully', log_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save the log' });
  }
});

// READ: list logs with search, filter and sort
app.get('/api/logs', async (req, res) => {
  const { search = '', category = '', sort = 'log_date', order = 'desc' } = req.query;

  const sortColumns = {
    log_date: 'l.log_date',
    title: 'l.title',
    amount: 'l.amount',
    category: 'c.name'
  };
  const sortBy = sortColumns[sort] || 'l.log_date';
  const direction = order === 'asc' ? 'ASC' : 'DESC';

  let sql = `SELECT l.log_id, l.title, l.amount, l.log_date,
                    c.category_id, c.name AS category, c.unit
             FROM wellness_logs l
             JOIN categories c ON l.category_id = c.category_id
             WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ' AND (l.title LIKE ? OR l.notes LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND l.category_id = ?';
    params.push(category);
  }
  sql += ` ORDER BY ${sortBy} ${direction}, l.log_id DESC`;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load logs' });
  }
});

// READ: details of one log
app.get('/api/logs/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.log_id, l.category_id, l.title, l.amount, l.notes, l.log_date, l.created_at,
              c.name AS category, c.unit
       FROM wellness_logs l
       JOIN categories c ON l.category_id = c.category_id
       WHERE l.log_id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load the log' });
  }
});

// UPDATE an existing log
app.put('/api/logs/:id', async (req, res) => {
  const { category_id, title, amount, notes, log_date } = req.body;

    const problem = await validateLog(req.body);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  try {
    const [result] = await pool.query(
      `UPDATE wellness_logs
       SET category_id = ?, title = ?, amount = ?, notes = ?, log_date = ?
       WHERE log_id = ?`,
      [category_id, title.trim(), amount, notes || null, log_date, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ message: 'Log updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update the log' });
  }
});

// DELETE a log
app.delete('/api/logs/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM wellness_logs WHERE log_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json({ message: 'Log deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete the log' });
  }
});

// DASHBOARD: totals per category
app.get('/api/summary', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.category_id, c.name, c.unit,
              COUNT(l.log_id) AS entries,
              COALESCE(SUM(l.amount), 0) AS total,
              COALESCE(AVG(l.amount), 0) AS average
       FROM categories c
       LEFT JOIN wellness_logs l ON l.category_id = c.category_id
       GROUP BY c.category_id, c.name, c.unit
       ORDER BY c.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load the summary' });
  }
});

const TIPS = {
  Exercise: 'Try a short walk or a stretching session today.',
  Sleep: 'Keep a regular bedtime and avoid screens before sleep.',
  Water: 'Keep a water bottle nearby and drink a glass with each meal.',
  Meditation: 'Even 5 minutes of slow breathing can help you relax.',
  Mood: 'Take a break outdoors or talk to someone you trust. If you feel low for a long time, consider speaking to a doctor or counsellor.'
};

// INSIGHTS: compare the last 7 days with the daily goals
app.get('/api/insights', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.name, c.unit, g.target_amount,
              COUNT(d.day) AS days_logged,
              AVG(d.value) AS avg_value
       FROM categories c
       JOIN goals g ON g.category_id = c.category_id AND g.period = 'daily'
       LEFT JOIN (
         SELECT l.category_id, l.log_date AS day,
                CASE WHEN c2.name = 'Mood' THEN AVG(l.amount) ELSE SUM(l.amount) END AS value
         FROM wellness_logs l
         JOIN categories c2 ON c2.category_id = l.category_id
         WHERE l.log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY l.category_id, l.log_date, c2.name
       ) d ON d.category_id = c.category_id
       GROUP BY c.category_id, c.name, c.unit, g.target_amount
       ORDER BY c.name`
    );

        const insights = rows.map(r => {
      const target = Number(r.target_amount);
      const base = { name: r.name, unit: r.unit, target };
      if (Number(r.days_logged) === 0) {
        return { ...base, status: 'info', avg: null, tip: TIPS[r.name] || '' };
      }
      const avg = Number(r.avg_value);
      if (avg < target) {
        return { ...base, status: 'warning', avg, tip: TIPS[r.name] || '' };
      }
      return { ...base, status: 'good', avg, tip: '' };
    });

    res.json(insights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load insights' });
  }
});

// TODAY: how many logs have today's date
app.get('/api/today', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM wellness_logs WHERE log_date = CURDATE()'
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load today summary' });
  }
});

// WEEKLY: last 7 days for one category
app.get('/api/weekly', async (req, res) => {
  const categoryId = req.query.category;
  if (!categoryId) {
    return res.status(400).json({ error: 'Category is required' });
  }

  try {
    const [cats] = await pool.query('SELECT name, unit FROM categories WHERE category_id = ?', [categoryId]);
    if (cats.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Build the last 7 dates, oldest first
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    // Mood is an average score, the other categories are daily totals
    const isMood = cats[0].name === 'Mood';
    const [rows] = await pool.query(
      `SELECT log_date, ${isMood ? 'AVG(amount)' : 'SUM(amount)'} AS value
       FROM wellness_logs
       WHERE category_id = ? AND log_date BETWEEN ? AND ?
       GROUP BY log_date`,
      [categoryId, days[0], days[6]]
    );

    const byDate = {};
    rows.forEach(r => { byDate[r.log_date] = Number(r.value); });

    res.json({
      category: cats[0].name,
      unit: cats[0].unit,
      days: days.map(d => ({ date: d, value: byDate[d] ?? null }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load the weekly report' });
  }
});

// Handles unexpected errors, such as broken JSON, without crashing the server
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: 'Invalid request data' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));