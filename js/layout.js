/* SHARED UI: formatting helpers, customer top bar, admin sidebar, toast. */
const peso = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso, long) => new Date(iso).toLocaleString('en-US',
  long ? { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = iso => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const badge = status => `<span class="badge ${status.toLowerCase().replace(/ /g, '-')}">${status}</span>`;
const brand = '<a class="brand" href="index.html"><img src="images/logo.svg" alt=""><span>Marc Jacob<br>Water Station</span></a>';

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = message; el.setAttribute('role', 'status');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* Customer pages: top bar with nav links. `active` = the data-page value of the current page. */
function renderCustomerHeader(active) {
  const cartCount = getCart().reduce((sum, i) => sum + i.qty, 0);
  const links = [['home', 'Home', 'home.html'], ['order', cartCount ? `Order (${cartCount})` : 'Order', 'order.html'],
                 ['status', 'Order Status', 'order-status.html'], ['track', 'Track Order', 'track-order.html'], ['profile', 'Profile', 'profile.html']];
  document.getElementById('app-header').innerHTML = `
    <header class="topbar"><div class="container topbar-inner">
      ${brand}
      <nav class="nav-links" aria-label="Main">
        ${links.map(([key, text, href]) => `<a href="${href}" class="${key === active ? 'active' : ''}">${text}</a>`).join('')}
      </nav>
      <button class="btn btn-sm" id="logout-btn">Logout</button>
      <button class="menu-btn" aria-label="Menu">☰</button>
    </div></header>`;
  const bar = document.querySelector('.topbar');
  bar.querySelector('.menu-btn').onclick = () => bar.classList.toggle('open');
  document.getElementById('logout-btn').onclick = logout;
}

/* Admin pages: sidebar + title bar. The title comes from <body data-title data-sub>. */
function renderAdminShell(active) {
  const links = [['dashboard', 'Dashboard', 'admin-dashboard.html'], ['customers', 'Customer Records', 'admin-customers.html'],
                 ['payments', 'Payment Records', 'admin-payments.html'], ['sales', 'Sales Report', 'admin-sales.html']];
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `${brand}
    <nav class="side-nav">${links.map(([key, text, href]) => `<a href="${href}" class="${key === active ? 'active' : ''}">${text}</a>`).join('')}</nav>
    <button class="logout" id="logout-btn">Logout</button>`;
  const d = document.body.dataset;
  const extra = active === 'dashboard' ? `<span class="date-chip">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>`
              : active === 'sales' ? '<button class="btn btn-primary" onclick="window.print()">Download Report</button>' : '';
  document.getElementById('admin-topbar').innerHTML = `
    <div><button class="menu-btn" aria-label="Menu" id="side-toggle">☰</button><h1>${d.title}</h1><p>${d.sub}</p></div>
    <div class="top-right">${extra}<span class="avatar">A</span><strong>Admin</strong></div>`;
  document.getElementById('side-toggle').onclick = () => sidebar.classList.toggle('open');
  document.getElementById('logout-btn').onclick = logout;
}

/* Table paging helper: returns the rows for one page and draws Previous / Next buttons. */
function paginate(rows, page, pagerEl, rerender) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  page = Math.min(page, pages);
  pagerEl.innerHTML = `<button class="btn btn-sm" ${page <= 1 ? 'disabled' : ''}>Previous</button><button class="btn btn-primary btn-sm" ${page >= pages ? 'disabled' : ''}>Next</button>`;
  const [prev, next] = pagerEl.querySelectorAll('button');
  prev.onclick = () => rerender(page - 1);
  next.onclick = () => rerender(page + 1);
  return rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}

function downloadCSV(filename, rows) {
  const text = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = filename; a.click();
}
