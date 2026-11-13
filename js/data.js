/* DATA + AUTH. Everything is saved in localStorage so the site works without a server.
   To reset the demo data, run localStorage.clear() in the browser console. */
const FREE_DELIVERY_MIN = 3;   // gallons needed for free delivery
const DELIVERY_FEE = 20;       // pesos
const PAGE_SIZE = 5;           // rows per table page
const STATUSES = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

const PRODUCTS = [
  { id: 'p1', name: '5 Gallon Purified Water', price: 40, img: 'images/gallon-clear.png', desc: 'Refilled, sealed and ready to deliver. 18.9 L per gallon.' },
  { id: 'p2', name: 'Mineral Water', price: 55, img: 'images/gallon-jug.png', desc: 'Naturally balanced minerals for great taste. 18.9 L per gallon.' },
  { id: 'p3', name: 'Distilled Water', price: 60, img: 'images/gallon-clear.png', desc: 'Fully distilled and purified. 18.9 L per gallon.' }
];

const store = {
  get: (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value))
};
const getCustomers = () => store.get('mj_customers', []);
const getOrders = () => store.get('mj_orders', []);
const getCart = () => store.get('mj_cart', []);          // [{ productId, qty }]
const productById = id => PRODUCTS.find(p => p.id === id);

/* ---- price math (used by checkout AND by the seed orders) ---- */
function calcTotals(items) {
  const subtotal = items.reduce((sum, i) => sum + productById(i.productId).price * i.qty, 0);
  const gallons = items.reduce((sum, i) => sum + i.qty, 0);
  const fee = gallons > 0 && gallons < FREE_DELIVERY_MIN ? DELIVERY_FEE : 0;
  return { subtotal, fee, total: subtotal + fee };
}

function nextOrderId() {
  const highest = Math.max(0, ...getOrders().map(o => Number(o.id.split('-')[1])));
  return 'MJ-' + String(highest + 1).padStart(4, '0');
}

/* ---- first-visit demo data ---- */
function seedData() {
  if (store.get('mj_seeded')) return;
  const addr = 'Sitio Bato, San Vicente, San Manuel, Pangasinan';
  const customers = [
    { id: 'c1', name: 'Boy Aquino', contact: '0917 123 4567', address: addr },
    { id: 'c2', name: 'Wennie Besario', contact: '0918 234 5678', address: addr },
    { id: 'c3', name: 'Rinalyn Alvarez', contact: '0919 345 6789', address: addr }
  ];
  store.set('mj_customers', customers);
  store.set('mj_users', [
    { email: 'admin@marcjacob.com', username: 'admin', password: 'admin123', role: 'admin', name: 'Admin' },
    { email: 'boy@example.com', password: 'customer123', role: 'customer', name: 'Boy Aquino', customerId: 'c1' },
    { email: 'wennie@example.com', password: 'customer123', role: 'customer', name: 'Wennie Besario', customerId: 'c2' },
    { email: 'rinalyn@example.com', password: 'customer123', role: 'customer', name: 'Rinalyn Alvarez', customerId: 'c3' }
  ]);
  // [orderNumber, customerId, items, status, payment method, payment status, minutes ago]
  const rows = [
    [412, 'c3', [['p1', 2]], 'Delivered', 'Cash on Delivery', 'Paid', 5800],
    [413, 'c2', [['p2', 1], ['p3', 1]], 'Delivered', 'GCash', 'Paid', 4300],
    [414, 'c3', [['p1', 1], ['p3', 2]], 'Pending', 'Cash on Delivery', 'Pending', 2900],
    [415, 'c2', [['p2', 4]], 'Delivered', 'GCash', 'Paid', 1500],
    [416, 'c1', [['p1', 2]], 'Confirmed', 'GCash', 'Paid', 300],
    [417, 'c3', [['p2', 2]], 'Preparing', 'Cash on Delivery', 'Pending', 150],
    [418, 'c1', [['p1', 2], ['p3', 1]], 'Out for Delivery', 'Cash on Delivery', 'Pending', 95]
  ];
  store.set('mj_orders', rows.map(([n, cid, items, status, payment, paymentStatus, mins]) => {
    const c = customers.find(x => x.id === cid);
    const list = items.map(([productId, qty]) => ({ productId, qty }));
    return { id: 'MJ-0' + n, customerId: cid, name: c.name, contact: c.contact, address: c.address, items: list,
             ...calcTotals(list), payment, paymentStatus, status, createdAt: new Date(Date.now() - mins * 60000).toISOString() };
  }));
  store.set('mj_seeded', true);
}
seedData();

/* ---- LOGIN: one login page for everyone. The account's "role" decides the dashboard. ---- */
const dashboardFor = role => (role === 'admin' ? 'admin-dashboard.html' : 'home.html');
const currentUser = () => store.get('mj_session', null);

function login(identifier, password) {
  const id = identifier.trim().toLowerCase();
  const user = store.get('mj_users', []).find(u => (u.email === id || u.username === id) && u.password === password);
  if (!user) return null;
  const { password: _hidden, ...session } = user;   // never keep the password in the session
  store.set('mj_session', session);
  return session;
}

function logout() { localStorage.removeItem('mj_session'); location.href = 'login.html'; }

/* Call at the top of every protected page. Wrong role or not logged in = redirected. */
function guard(role) {
  const user = currentUser();
  if (!user) { location.replace('login.html'); return null; }
  if (user.role !== role) { location.replace(dashboardFor(user.role)); return null; }
  return user;
}

/* ---- SIGN UP: only customers can sign up. Admin accounts are fixed in seedData(). ---- */
function signup({ name, contact, address, email, password }) {
  const users = store.get('mj_users', []);
  email = email.trim().toLowerCase();
  if (users.some(u => u.email === email || u.username === email)) return { error: 'That email is already registered. Try logging in instead.' };
  const customer = { id: 'c' + Date.now(), name, contact, address };   // shows up in the admin's Customer Records
  store.set('mj_customers', [...getCustomers(), customer]);
  store.set('mj_users', [...users, { email, password, role: 'customer', name, customerId: customer.id }]);
  return { user: login(email, password) };
}

/* ---- CANCEL ORDER: a customer can only cancel before the water is being prepared ---- */
const CANCELLABLE = ['Pending', 'Confirmed'];
function cancelOrder(id) {
  store.set('mj_orders', getOrders().map(o => o.id === id && CANCELLABLE.includes(o.status) ? { ...o, status: 'Cancelled', paymentStatus: 'Cancelled' } : o));
}
