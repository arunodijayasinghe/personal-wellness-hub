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

// CREATE a new wellness log
app.post('/api/logs', async (req, res) => {
  const { category_id, title, amount, notes, log_date } = req.body;

  if (!category_id || !title || amount === '' || amount === undefined || !log_date) {
    return res.status(400).json({ error: 'Category, title, amount and date are required' });
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
      `SELECT l.log_id, l.title, l.amount, l.notes, l.log_date, l.created_at,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));