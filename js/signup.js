/* SIGN UP PAGE: validate, create the account, then go straight to the customer home page. */
const already = currentUser();
if (already) location.replace(dashboardFor(already.role));

document.getElementById('signup-form').addEventListener('submit', e => {
  e.preventDefault();
  const val = id => document.getElementById(id).value.trim();
  const error = document.getElementById('signup-error');
  const fail = message => { error.hidden = false; error.textContent = message; };

  const data = { name: val('s-name'), contact: val('s-contact'), address: val('s-address'), email: val('s-email'), password: document.getElementById('s-password').value };
  if (!data.name || !data.contact || !data.address || !data.email) return fail('Please fill in every field.');
  if (!/^\S+@\S+\.\S+$/.test(data.email)) return fail('Please enter a valid email address.');
  if (data.password.length < 6) return fail('Your password needs at least 6 characters.');
  if (data.password !== document.getElementById('s-confirm').value) return fail('The two passwords do not match.');

  const result = signup(data);
  if (result.error) return fail(result.error);
  location.href = dashboardFor(result.user.role);
});
