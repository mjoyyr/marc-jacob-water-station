/* ADMIN PAGES: dashboard, customer records, payment records, sales report. */
const $c = () => document.getElementById('content');
const ordersNewestFirst = () => getOrders().sort((a, b) => b.createdAt.localeCompare(a.createdAt));


/* ---- status dropdowns: the admin changes an order here and the customer sees it on Order Status / Track Order ---- */
const slug = s => s.toLowerCase().replace(/ /g, '-');
const selectHTML = (o, field, options) => `<select class="status-select ${slug(o[field])}" data-order="${o.id}" data-field="${field}" aria-label="${field === 'status' ? 'Delivery' : 'Payment'} status of ${o.id}">
  ${options.map(s => `<option ${s === o[field] ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
const statusSelect = o => selectHTML(o, 'status', [...STATUSES, 'Cancelled']);
const paySelect = o => selectHTML(o, 'paymentStatus', ['Pending', 'Paid', 'Cancelled']);

function updateOrder(id, field, value) {
  store.set('mj_orders', getOrders().map(o => {
    if (o.id !== id) return o;
    const changed = { ...o, [field]: value };
    if (field === 'status' && value === 'Cancelled') changed.paymentStatus = 'Cancelled';
    if (field === 'status' && value === 'Delivered' && o.payment === 'Cash on Delivery') changed.paymentStatus = 'Paid';  // cash is collected on delivery
    return changed;
  }));
  toast(`${id} updated to ${value}`);
}

/* ---- charts (plain HTML/SVG, no libraries) ---- */
const money = n => '₱' + (n >= 1000 ? n / 1000 + 'k' : n);
function yAxis(max) { return `<div class="y-axis">${[0, 1, 2, 3, 4].map(i => `<span>${money(max / 4 * i)}</span>`).join('')}</div>`; }
function barChart(labels, values, max) {
  return `<div class="chart-body">${yAxis(max)}<div class="plot-col"><div class="plot">${values.map((v, i) =>
    `<div class="bar ${i === values.length - 1 ? 'last' : ''}" style="height:${v / max * 100}%" title="${peso(v)}"></div>`).join('')}</div>
    <div class="x-labels">${labels.map(l => `<span>${l}</span>`).join('')}</div></div></div>`;
}
function lineChart(labels, values, max) {
  const W = 400, H = 220, step = W / (values.length), xy = values.map((v, i) => [step * i + step / 2, H - v / max * H]);
  return `<div class="chart-body">${yAxis(max)}<div class="plot-col"><div class="plot" style="display:block;padding:0">
    <svg class="line-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="#2563EB" stroke-width="3" points="${xy.map(p => p.join(',')).join(' ')}"/>
    ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#2563EB" stroke-width="3"/>`).join('')}</svg></div>
    <div class="x-labels" style="padding:.4rem 0 0">${labels.map(l => `<span>${l}</span>`).join('')}</div></div></div>`;
}

/* ---------- DASHBOARD ---------- */
function initDashboard() {
  const orders = ordersNewestFirst(), today = new Date().toDateString();
  const todaySales = orders.filter(o => o.status !== 'Cancelled' && new Date(o.createdAt).toDateString() === today).reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const stat = (icon, label, value) => `<div class="card stat"><span class="stat-icon">${icon}</span><div><small>${label}</small><strong>${value}</strong></div></div>`;
  const week = [8200, 9400, 7600, 10100, 11800, 14200, 12400];   // demo numbers for the weekly bar chart
  $c().innerHTML = `
    <div class="stats-4">${stat('👤', 'Total Customers', getCustomers().length)}${stat('📋', 'Total Orders', orders.length)}${stat('₱', "Today's Sales", peso(todaySales))}${stat('🚚', 'Pending Deliveries', pending)}</div>
    <div class="admin-grid">
      <section class="card"><div class="section-head"><h2>Sales This Week</h2><small class="muted">Demo data</small></div>${barChart(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], week, 16000)}</section>
      <section class="card" style="padding:0"><div class="section-head" style="padding:1.2rem 1.5rem 0"><h2>Recent Orders</h2><a href="#" id="view-all" style="color:var(--blue)">View all</a></div>
        <div class="table-wrap" id="recent"></div></section></div>`;
  let showAll = false;
  const drawRecent = () => document.getElementById('recent').innerHTML = `<table><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>
    ${(showAll ? orders : orders.slice(0, 5)).map(o => `<tr><td>#${o.id}</td><td>${o.name}</td><td>${peso(o.total)}</td><td>${statusSelect(o)}</td></tr>`).join('')}</tbody></table>`;
  drawRecent();
  document.getElementById('view-all').onclick = e => { e.preventDefault(); showAll = !showAll; e.target.textContent = showAll ? 'Show less' : 'View all'; drawRecent(); };
}

/* ---------- CUSTOMER RECORDS ---------- */
function initCustomers() {
  $c().innerHTML = `<section class="card"><div class="search-row"><input id="search" type="search" placeholder="Search by name or contact number" aria-label="Search customers">
    <button class="btn btn-primary" id="add-btn">Add Customer</button></div>
    <div class="table-wrap"><table><thead><tr><th>Customer Name</th><th>Contact Number</th><th>Address</th><th>Total Orders</th><th>Actions</th></tr></thead><tbody id="rows"></tbody></table></div>
    <div class="pager" id="pager"></div></section>
    <dialog id="modal"><form id="modal-form"><h2 id="modal-title"></h2>
      <label for="m-name">Customer Name</label><input id="m-name" required>
      <label for="m-contact">Contact Number</label><input id="m-contact" required>
      <label for="m-address">Address</label><textarea id="m-address" required></textarea>
      <div class="actions" style="margin-top:1.2rem;justify-content:flex-end"><button type="button" class="btn" id="m-cancel">Close</button><button class="btn btn-primary" id="m-save">Save</button></div></form></dialog>`;
  const rows = document.getElementById('rows'), modal = document.getElementById('modal'), search = document.getElementById('search');
  let editingId = null;

  function draw(page = 1) {
    const q = search.value.toLowerCase(), orders = getOrders();
    const list = getCustomers().filter(c => c.name.toLowerCase().includes(q) || c.contact.replace(/\s/g, '').includes(q.replace(/\s/g, '')));
    const shown = paginate(list, page, document.getElementById('pager'), draw);
    rows.innerHTML = shown.length ? shown.map(c => `<tr><td>${c.name}</td><td>${c.contact}</td><td>${c.address}</td><td>${orders.filter(o => o.customerId === c.id).length}</td>
      <td><div class="actions"><button class="btn btn-soft btn-sm" data-act="view" data-id="${c.id}">View</button><button class="btn btn-sm" data-act="edit" data-id="${c.id}">Edit</button>
      <button class="btn btn-danger btn-sm" data-act="delete" data-id="${c.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="5" class="empty">No customers found.</td></tr>';
  }
  function openModal(mode, c = {}) {
    editingId = c.id || null;
    document.getElementById('modal-title').textContent = { add: 'Add Customer', edit: 'Edit Customer', view: 'Customer Details' }[mode];
    ['name', 'contact', 'address'].forEach(f => { const el = document.getElementById('m-' + f); el.value = c[f] || ''; el.readOnly = mode === 'view'; });
    document.getElementById('m-save').hidden = mode === 'view';
    modal.showModal();
  }
  search.oninput = () => draw();
  document.getElementById('add-btn').onclick = () => openModal('add');
  document.getElementById('m-cancel').onclick = () => modal.close();
  rows.onclick = e => {
    const { act, id } = e.target.dataset; if (!act) return;
    const c = getCustomers().find(x => x.id === id);
    if (act === 'delete') { if (confirm(`Delete ${c.name}?`)) { store.set('mj_customers', getCustomers().filter(x => x.id !== id)); draw(); toast('Customer deleted'); } }
    else openModal(act, c);
  };
  document.getElementById('modal-form').onsubmit = e => {
    e.preventDefault();
    const data = { name: document.getElementById('m-name').value.trim(), contact: document.getElementById('m-contact').value.trim(), address: document.getElementById('m-address').value.trim() };
    const all = getCustomers();
    store.set('mj_customers', editingId ? all.map(c => c.id === editingId ? { ...c, ...data } : c) : [...all, { id: 'c' + Date.now(), ...data }]);
    modal.close(); draw(); toast('Customer saved');
  };
  draw();
}

/* ---------- PAYMENT RECORDS ---------- */
function initPayments() {
  $c().innerHTML = `<section class="card"><div class="search-row"><input id="search" type="search" placeholder="Search by customer name" aria-label="Search payments"><button class="btn" id="export-btn">Export</button></div>
    <div class="table-wrap"><table><thead><tr><th>Customer Name</th><th>Amount</th><th>Payment Method</th><th>Date</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table></div><div class="pager" id="pager"></div></section>`;
  const search = document.getElementById('search');
  const filtered = () => ordersNewestFirst().filter(o => o.name.toLowerCase().includes(search.value.toLowerCase()));
  function draw(page = 1) {
    const shown = paginate(filtered(), page, document.getElementById('pager'), draw);
    document.getElementById('rows').innerHTML = shown.length ? shown.map(o => `<tr><td>${o.name}</td><td>${peso(o.total)}</td><td>${o.payment}</td><td>${fmtDate(o.createdAt)}</td><td>${paySelect(o)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No payments found.</td></tr>';
  }
  search.oninput = () => draw();
  document.getElementById('export-btn').onclick = () => downloadCSV('payment-records.csv',
    [['Customer', 'Amount', 'Method', 'Date', 'Status'], ...filtered().map(o => [o.name, o.total, o.payment, fmtDate(o.createdAt), o.paymentStatus])]);
  draw();
}

/* ---------- SALES REPORT (demo analytics, edit the numbers here) ---------- */
function initSales() {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const monthly = [268, 281, 343, 255, 262, 289, 301, 318, 326, 349, 371, 385].map(n => n * 1000);
  const weekly = [71, 76, 74, 82, 86, 84, 91, 97].map(n => n * 1000);
  $c().innerHTML = `
    <div class="sales-grid">
      <section class="card"><h2>Revenue Summary</h2><div class="big">${peso(385000).replace('.00', '')}</div><p class="muted">Total revenue in September 2026</p>
        <div class="mini-stats"><div><small>This week</small><strong>₱97,000</strong></div><div><small>Average order</small><strong>₱291</strong></div><div><small>Best day</small><strong>Saturday</strong></div></div>
        <p style="margin-top:1rem"><span class="badge delivered">+12.4% vs last month</span></p></section>
      <section class="card"><span class="stat-icon">💧</span><p class="muted" style="margin-top:.8rem">Top Selling Product</p><h2>Mineral Water</h2><p class="muted">812 units sold this month</p></section>
      <section class="card"><span class="stat-icon">📋</span><p class="muted" style="margin-top:.8rem">Total Transactions</p><h2 style="font-size:2rem">1,323</h2><p class="muted">+8.1% vs last month</p></section></div>
    <div class="charts"><section class="card"><h2>Monthly Sales</h2>${barChart(months, monthly, 400000)}</section>
      <section class="card"><h2>Weekly Sales</h2>${lineChart(['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'], weekly, 100000)}</section></div>`;
}

/* ---------- START ---------- */
const pages = { dashboard: initDashboard, customers: initCustomers, payments: initPayments, sales: initSales };
document.addEventListener('change', e => {
  const sel = e.target;
  if (!sel.dataset.order) return;
  updateOrder(sel.dataset.order, sel.dataset.field, sel.value);
  pages[document.body.dataset.page]();   // redraw so the stats, colors and linked payment status are correct
});
if (guard('admin')) {
  const page = document.body.dataset.page;
  renderAdminShell(page);
  pages[page]();
}
