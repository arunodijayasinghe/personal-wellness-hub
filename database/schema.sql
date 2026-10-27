CREATE DATABASE IF NOT EXISTS wellness_hub;
USE wellness_hub;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  unit VARCHAR(20) NOT NULL
);

CREATE TABLE wellness_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  amount DECIMAL(6,2) NOT NULL CHECK (amount >= 0),
  notes TEXT,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE goals (
  goal_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  target_amount DECIMAL(6,2) NOT NULL CHECK (target_amount > 0),
  period ENUM('daily','weekly') NOT NULL DEFAULT 'daily',
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO categories (name, unit) VALUES
  ('Exercise', 'minutes'),
  ('Sleep', 'hours'),
  ('Water', 'glasses'),
  ('Meditation', 'minutes'),
  ('Mood', 'score 1-10');

INSERT INTO goals (category_id, target_amount, period) VALUES
  ((SELECT category_id FROM categories WHERE name = 'Exercise'), 30, 'daily'),
  ((SELECT category_id FROM categories WHERE name = 'Sleep'), 7, 'daily'),
  ((SELECT category_id FROM categories WHERE name = 'Water'), 8, 'daily'),
  ((SELECT category_id FROM categories WHERE name = 'Meditation'), 10, 'daily'),
  ((SELECT category_id FROM categories WHERE name = 'Mood'), 6, 'daily');