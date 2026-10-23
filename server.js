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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));