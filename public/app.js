const form = document.getElementById('logForm');
const message = document.getElementById('message');

const LIMITS = { Exercise: [0, 600], Sleep: [0, 24], Water: [0, 30], Meditation: [0, 300], Mood: [1, 10] };

// Escape text so it cannot inject HTML into the page
function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showMessage(text, isError) {
  message.textContent = text;
  message.className = isError ? 'message error' : 'message success';
}

function applyLimits() {
  const sel = document.getElementById('category');
  const name = sel.options[sel.selectedIndex]?.text.split(' (')[0];
  const [min, max] = LIMITS[name] || [0, 1000];
  const amt = document.getElementById('amount');
  amt.min = min;
  amt.max = max;
  amt.title = `Enter a value from ${min} to ${max}`;
}

async function loadCategories() {
  const res = await fetch('/api/categories');
  const categories = await res.json();

  document.getElementById('category').innerHTML = categories
    .map(c => `<option value="${c.category_id}">${esc(c.name)} (${esc(c.unit)})</option>`)
    .join('');

  document.getElementById('filterCategory').innerHTML =
    '<option value="">All categories</option>' +
    categories.map(c => `<option value="${c.category_id}">${esc(c.name)}</option>`).join('');

  document.getElementById('weeklyCategory').innerHTML = categories
    .map(c => `<option value="${c.category_id}">${esc(c.name)}</option>`)
    .join('');
}

async function loadSummary() {
  const res = await fetch('/api/summary');
  const data = await res.json();

  let totalEntries = 0;
  document.getElementById('summaryCards').innerHTML = data.map(s => {
    totalEntries += Number(s.entries);
    const hasData = Number(s.entries) > 0;
    const isMood = s.name === 'Mood';
    const value = isMood ? s.average : s.total;
    const label = isMood ? 'average score' : 'total ' + s.unit;
    return `
      <div class="card stat">
        <h3>${esc(s.name)}</h3>
        <p class="stat-value">${hasData ? esc(Number(value).toFixed(1)) : '-'}</p>
        <p class="stat-label">${hasData ? esc(label) : 'No data yet'}</p>
        <p class="stat-small">${esc(s.entries)} entries</p>
      </div>`;
  }).join('');

  document.getElementById('totalEntries').textContent = totalEntries;
  loadInsights();
  loadToday();
  loadWeekly();
}

const ICONS = { Exercise: '🏃', Sleep: '😴', Water: '💧', Meditation: '🧘', Mood: '😊' };
const BADGES = { good: 'On track', warning: 'Needs attention', info: 'No data yet' };

async function loadInsights() {
  const res = await fetch('/api/insights');
  const items = await res.json();

  document.getElementById('insights').innerHTML = items.map(i => {
    const pct = i.avg === null ? 0 : Math.min(100, Math.round((i.avg / i.target) * 100));
    const value = i.avg === null ? '-' : i.avg.toFixed(1);
    return `
      <div class="insight-card ${esc(i.status)}">
        <div class="insight-head">
          <span class="insight-icon">${ICONS[i.name] || '⭐'}</span>
          <div>
            <h4>${esc(i.name)}</h4>
            <span class="badge">${BADGES[i.status]}</span>
          </div>
        </div>
        <p class="insight-value">${value} <small>${esc(i.unit)} / day</small></p>
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
        <p class="insight-goal">Goal: ${esc(i.target)} ${esc(i.unit)} · ${pct}% reached</p>
        ${i.tip ? `<p class="insight-tip">💡 ${esc(i.tip)}</p>` : ''}
      </div>`;
        showMotivation(items);
  }).join('');
}

const DAILY_TIPS = [
  'Drink a glass of water as soon as you wake up.',
  'Take a 10-minute walk after a meal.',
  'Keep the same bedtime every night, even on weekends.',
  'Stretch your shoulders and neck every hour while studying.',
  'Take 5 slow, deep breaths when you feel stressed.',
  'Put your phone away 30 minutes before sleep.',
  'Spend a few minutes outside in daylight today.',
  'Write down one thing you are grateful for.',
  'Choose the stairs instead of the lift today.',
  'Take short breaks from your screen to rest your eyes.'
];

// The day of the month picks one tip, so it changes every day
function showDailyTip() {
  const tip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length];
  document.getElementById('dailyTip').innerHTML = `<strong>💡 Tip of the day:</strong> ${esc(tip)}`;
}

async function loadToday() {
  const res = await fetch('/api/today');
  const data = await res.json();
  document.getElementById('todayCount').textContent = data.count;
}

function showMotivation(items) {
  const box = document.getElementById('motivation');
  const good = items.filter(i => i.status === 'good').length;
  const warnings = items.filter(i => i.status === 'warning').length;

  let text, type;
  if (good === 0 && warnings === 0) {
    text = 'Welcome! Add your first logs to start tracking your progress.';
    type = 'info';
  } else if (warnings === 0 && good === items.length) {
    text = 'Great job! All your goals are on track. Keep it up!';
    type = 'good';
  } else if (warnings === 0) {
    text = 'Good start! Keep logging the other categories to complete your picture.';
    type = 'good';
  } else {
    text = 'You are making progress. Focus on the orange cards to improve this week.';
    type = 'warning';
  }
  box.className = 'motivation ' + type;
  box.textContent = text;
}

async function loadWeekly() {
  const select = document.getElementById('weeklyCategory');
  if (!select.value) return;

  const res = await fetch('/api/weekly?category=' + select.value);
  const data = await res.json();
  if (!res.ok) {
    document.getElementById('weeklySummary').textContent = 'Error: ' + data.error;
    return;
  }

  const isMood = data.category === 'Mood';
  const values = data.days.map(d => d.value).filter(v => v !== null);
  const max = isMood ? 10 : Math.max(1, ...values);
  const total = values.reduce((sum, v) => sum + v, 0);

  document.getElementById('weeklySummary').textContent = values.length === 0
    ? 'No entries in the last 7 days.'
    : isMood
      ? `Average score: ${(total / values.length).toFixed(1)} over ${values.length} of 7 days.`
      : `Total: ${total.toFixed(1)} ${data.unit}. Average on logged days: ${(total / values.length).toFixed(1)}. Days logged: ${values.length} of 7.`;

  document.getElementById('weeklyChart').innerHTML = data.days.map(d => {
    const date = new Date(d.date + 'T00:00:00');
    const label = date.toLocaleDateString('en-GB', { weekday: 'short' });
    const day = date.getDate();
    const pct = d.value === null ? 0 : Math.max(4, Math.round((d.value / max) * 100));
    return `
      <div class="bar-col">
        <span class="bar-value">${d.value === null ? '-' : esc(d.value.toFixed(1))}</span>
        <div class="bar-area"><div class="bar" style="height:${pct}%"></div></div>
        <span class="bar-label">${esc(label)} ${day}</span>
      </div>`;
  }).join('');
}

async function loadLogs() {
  const [sort, order] = document.getElementById('sortBy').value.split(':');
  const params = new URLSearchParams({
    search: document.getElementById('search').value,
    category: document.getElementById('filterCategory').value,
    sort,
    order
  });

  const res = await fetch('/api/logs?' + params.toString());
  const logs = await res.json();
  const tbody = document.getElementById('logTable');

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No logs found.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td data-label="Date">${esc(l.log_date)}</td>
      <td data-label="Category">${esc(l.category)}</td>
      <td data-label="Title">${esc(l.title)}</td>
      <td data-label="Amount">${esc(l.amount)} ${esc(l.unit)}</td>
      <td data-label="Actions">
        <button type="button" class="btn-small btn-secondary" onclick="viewLog(${l.log_id})">View</button>
        <button type="button" class="btn-small" onclick="editLog(${l.log_id})">Edit</button>
        <button type="button" class="btn-small btn-danger" onclick="deleteLog(${l.log_id})">Delete</button>
      </td>
    </tr>`).join('');
}

async function viewLog(id) {
  const res = await fetch('/api/logs/' + id);
  const log = await res.json();
  const box = document.getElementById('details');

  if (!res.ok) {
    box.innerHTML = '<p>' + esc(log.error) + '</p>';
  } else {
    box.innerHTML = `
      <h3>${esc(log.title)}</h3>
      <p><b>Category:</b> ${esc(log.category)}</p>
      <p><b>Amount:</b> ${esc(log.amount)} ${esc(log.unit)}</p>
      <p><b>Date:</b> ${esc(log.log_date)}</p>
      <p><b>Notes:</b> ${esc(log.notes) || 'None'}</p>
      <p><b>Created:</b> ${esc(log.created_at)}</p>
      <button type="button" class="btn-small btn-secondary"
        onclick="document.getElementById('details').style.display='none'">Close</button>`;
  }
  box.style.display = 'block';
}

function resetForm() {
  form.reset();
  document.getElementById('log_id').value = '';
  document.getElementById('formTitle').textContent = 'Add Wellness Log';
  document.getElementById('submitBtn').textContent = 'Save Log';
  document.getElementById('cancelBtn').style.display = 'none';
  applyLimits();
}

async function editLog(id) {
  const res = await fetch('/api/logs/' + id);
  const log = await res.json();
  if (!res.ok) {
    showMessage('Error: ' + log.error, true);
    return;
  }

  document.getElementById('log_id').value = log.log_id;
  document.getElementById('category').value = log.category_id;
  applyLimits();
  document.getElementById('title').value = log.title;
  document.getElementById('amount').value = log.amount;
  document.getElementById('log_date').value = log.log_date;
  document.getElementById('notes').value = log.notes || '';

  document.getElementById('formTitle').textContent = 'Edit Wellness Log';
  document.getElementById('submitBtn').textContent = 'Update Log';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  showMessage('', false);
  document.getElementById('add').scrollIntoView({ behavior: 'smooth' });
}

async function deleteLog(id) {
  if (!confirm('Delete this log? This cannot be undone.')) return;

  const res = await fetch('/api/logs/' + id, { method: 'DELETE' });
  const result = await res.json();
  showMessage(res.ok ? result.message : 'Error: ' + result.error, !res.ok);
  document.getElementById('details').style.display = 'none';

  if (document.getElementById('log_id').value == id) resetForm();
  loadLogs();
  loadSummary();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('log_id').value;
  const data = {
    category_id: document.getElementById('category').value,
    title: document.getElementById('title').value,
    amount: document.getElementById('amount').value,
    log_date: document.getElementById('log_date').value,
    notes: document.getElementById('notes').value
  };

  const res = await fetch(id ? '/api/logs/' + id : '/api/logs', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const result = await res.json();

  if (res.ok) {
    showMessage(result.message, false);
    resetForm();
    loadLogs();
    loadSummary();
  } else {
    showMessage('Error: ' + result.error, true);
  }
});

document.getElementById('cancelBtn').addEventListener('click', () => {
  resetForm();
  showMessage('', false);
});
document.getElementById('category').addEventListener('change', applyLimits);
document.getElementById('search').addEventListener('input', loadLogs);
document.getElementById('filterCategory').addEventListener('change', loadLogs);
document.getElementById('sortBy').addEventListener('change', loadLogs);
document.getElementById('weeklyCategory').addEventListener('change', loadWeekly);
document.getElementById('log_date').max = new Date().toLocaleDateString('en-CA');
document.getElementById('title').minLength = 2;

loadCategories().then(() => {
  applyLimits();
  loadLogs();
  loadSummary();
  showDailyTip();
  document.getElementById('weeklyCategory').innerHTML = categories
  .map(c => `<option value="${c.category_id}">${esc(c.name)}</option>`)
  .join('');
});