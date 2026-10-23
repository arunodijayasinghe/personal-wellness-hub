CREATE DATABASE IF NOT EXISTS wellness_hub;
USE wellness_hub;

CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  unit VARCHAR(20) NOT NULL
);

CREATE TABLE wellness_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  amount DECIMAL(6,2) NOT NULL CHECK (amount >= 0),
  notes TEXT,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
  
  SELECT * FROM categories;
