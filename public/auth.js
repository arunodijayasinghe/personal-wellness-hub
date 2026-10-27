const form = document.getElementById('authForm');
const message = document.getElementById('authMessage');
let isRegister = false;

// Switches the same form between "Log in" and "Create account"
function setMode(register) {
  isRegister = register;
  document.getElementById('authTitle').textContent = register ? 'Create account' : 'Log in';
  document.getElementById('authSubtitle').textContent = register
    ? 'Create an account to keep your own wellness logs. Password must be at least 8 characters.'
    : 'Welcome back. Log in to see your wellness logs.';
  document.getElementById('nameRow').hidden = !register;
  document.getElementById('name').required = register;
  document.getElementById('password').minLength = register ? 8 : 0;
  document.getElementById('password').autocomplete = register ? 'new-password' : 'current-password';
  document.getElementById('authBtn').textContent = register ? 'Create account' : 'Log in';
  document.getElementById('switchText').textContent = register ? 'Already have an account?' : 'New here?';
  document.getElementById('switchLink').textContent = register ? 'Log in' : 'Create an account';
  message.textContent = '';
}

document.getElementById('switchLink').addEventListener('click', (e) => {
  e.preventDefault();
  setMode(!isRegister);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  };
  if (isRegister) data.name = document.getElementById('name').value;

  try {
    const res = await fetch(isRegister ? '/api/register' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (res.ok) {
      window.location.href = '/';
    } else {
      message.textContent = 'Error: ' + result.error;
      message.className = 'message error';
    }
  } catch (err) {
    message.textContent = 'Error: could not reach the server.';
    message.className = 'message error';
  }
});

// If the user is already logged in, skip this page
fetch('/api/me').then(res => { if (res.ok) window.location.href = '/'; });