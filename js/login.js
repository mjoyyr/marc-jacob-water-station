/* LOGIN PAGE: already logged in? go straight to your dashboard. Otherwise check the form. */
const existing = currentUser();
if (existing) location.replace(dashboardFor(existing.role));

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const user = login(document.getElementById('identifier').value, document.getElementById('password').value);
  const error = document.getElementById('login-error');
  if (!user) { error.hidden = false; error.textContent = 'Wrong email or password. Please try again.'; return; }
  location.href = dashboardFor(user.role);   // admin -> admin dashboard, customer -> home
});
