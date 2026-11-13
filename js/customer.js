/* CUSTOMER PAGES. Each page has its own init function; the bottom of the file picks one by <body data-page>. */
const stepper = qty => `<div class="stepper"><button type="button" data-step="-1" aria-label="Less">−</button><span class="qty">${qty}</span><button type="button" data-step="1" aria-label="More">+</button></div>`;
const myOrders = user => getOrders().filter(o => o.customerId === user.customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const $content = () => document.getElementById('content');

/* ---------- HOME ---------- */
function initHome(user) {
  const active = myOrders(user).filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  $content().innerHTML = `
    <section class="welcome"><h1>Welcome back, ${user.name.split(' ')[0]}!</h1>
      <p>Order fresh purified water and follow your delivery in real time.</p>
      <a class="btn btn-soft" href="order-status.html">View My Orders</a><a class="btn" href="track-order.html">Track Order</a></section>
    <section class="stats">
      <div class="card stat"><span class="stat-icon">📦</span><div><small>Available Products</small><strong>${PRODUCTS.length}</strong></div></div>
      <div class="card stat"><span class="stat-icon">📋</span><div><small>Active Orders</small><strong>${active}</strong></div></div>
      <div class="card stat"><span class="stat-icon">🕒</span><div><small>Estimated Delivery Time</small><strong>30–45 min</strong></div></div>
    </section>
    <div class="section-head"><h2>Our Products</h2><span class="muted">Free delivery on orders of ${FREE_DELIVERY_MIN} gallons or more</span></div>
    <div class="products">${PRODUCTS.map(p => `
      <article class="card product"><div class="product-img"><img src="${p.img}" alt="${p.name}"></div>
        <div class="product-body"><h3>${p.name}</h3><p class="muted">${p.desc}</p>
          <p class="price">${peso(p.price)} <small>/ gallon</small></p>
          <div class="buy-row">${stepper(1)}<button class="btn btn-primary" data-add="${p.id}">Add to Cart</button></div></div></article>`).join('')}</div>`;

  $content().addEventListener('click', e => {
    const card = e.target.closest('.product');
    if (!card) return;
    const qtyEl = card.querySelector('.qty');
    if (e.target.dataset.step) qtyEl.textContent = Math.max(1, Number(qtyEl.textContent) + Number(e.target.dataset.step));
    if (e.target.dataset.add) {
      const cart = getCart(), id = e.target.dataset.add, line = cart.find(i => i.productId === id);
      line ? line.qty += Number(qtyEl.textContent) : cart.push({ productId: id, qty: Number(qtyEl.textContent) });
      store.set('mj_cart', cart);
      qtyEl.textContent = 1;
      toast('Added to cart. Go to Order to check out.');
    }
  });
}

/* ---------- ORDER (checkout) ---------- */
function initOrder(user) {
  const customer = getCustomers().find(c => c.id === user.customerId) || {};
  $content().innerHTML = `
    <h1>Checkout</h1><p class="muted">Confirm your delivery details and choose how you would like to pay.</p>
    <form id="checkout" class="grid-2" novalidate>
      <section class="card"><h2>Delivery Details</h2>
        <label for="f-name">Full Name</label><input id="f-name" required value="${customer.name || user.name}">
        <label for="f-contact">Contact Number</label><input id="f-contact" required inputmode="tel" placeholder="0917 123 4567" value="${customer.contact || ''}">
        <label for="f-address">Delivery Address</label><textarea id="f-address" required placeholder="House no., street, barangay, city">${customer.address || ''}</textarea>
        <p class="error" id="form-error" hidden></p></section>
      <section class="card"><h2>Order Summary</h2><div id="summary"></div></section>
    </form>`;

  const summary = document.getElementById('summary');
  function drawSummary() {
    const cart = getCart();
    if (!cart.length) { summary.innerHTML = '<p class="empty">Your cart is empty.<br><br><a class="btn btn-primary" href="home.html">Browse products</a></p>'; return; }
    const t = calcTotals(cart);
    summary.innerHTML = `
      ${cart.map(i => { const p = productById(i.productId); return `
        <div class="line" data-id="${i.productId}"><span class="line-img"><img src="${p.img}" alt="${p.name}"></span>
          <div class="line-info"><strong>${p.name}</strong><br><small class="muted">${peso(p.price)} each</small></div>${stepper(i.qty)}</div>`; }).join('')}
      <div class="totals"><div><span>Subtotal</span><span>${peso(t.subtotal)}</span></div>
        <div><span>Delivery fee</span><span>${t.fee ? peso(t.fee) : 'Free'}</span></div>
        <div class="grand"><span>Total</span><span>${peso(t.total)}</span></div></div>
      <h3>Payment Method</h3>
      <label class="pay-option"><input type="radio" name="pay" value="Cash on Delivery" checked><div><strong>Cash on Delivery</strong><span>Pay in cash when your water arrives.</span></div></label>
      <label class="pay-option"><input type="radio" name="pay" value="GCash"><div><strong>GCash</strong><span>Pay securely with your GCash wallet.</span></div></label>
      <button class="btn btn-primary btn-block" style="margin-top:1rem" type="submit">Place Order</button>`;
  }
  drawSummary();

  // + / - buttons in the summary: change the cart, then redraw
  summary.addEventListener('click', e => {
    if (!e.target.dataset.step) return;
    const id = e.target.closest('.line').dataset.id;
    const cart = getCart().map(i => i.productId === id ? { ...i, qty: i.qty + Number(e.target.dataset.step) } : i).filter(i => i.qty > 0);
    store.set('mj_cart', cart); drawSummary();
  });

  document.getElementById('checkout').addEventListener('submit', e => {
    e.preventDefault();
    const cart = getCart(), err = document.getElementById('form-error');
    const name = document.getElementById('f-name').value.trim(), contact = document.getElementById('f-contact').value.trim(), address = document.getElementById('f-address').value.trim();
    if (!cart.length) return;
    if (!name || !contact || !address) { err.hidden = false; err.textContent = 'Please fill in your name, contact number and address.'; return; }
    const method = document.querySelector('input[name=pay]:checked').value;
    store.set('mj_orders', [...getOrders(), { id: nextOrderId(), customerId: user.customerId, name, contact, address, items: cart,
      ...calcTotals(cart), payment: method, paymentStatus: 'Pending', status: 'Pending', createdAt: new Date().toISOString() }]);
    store.set('mj_cart', []);
    location.href = 'order-status.html';
  });
}

/* ---------- ORDER STATUS ---------- */
function initStatus(user) {
  const order = myOrders(user)[0];
  const guide = { Pending: 'We received your order and are waiting for confirmation.', Confirmed: 'Your order and payment details are confirmed.',
    Preparing: 'Your water is being purified, filled and sealed.', 'Out for Delivery': 'Your rider is on the way to your address.', Delivered: 'Your order arrived. Enjoy your fresh water!', Cancelled: 'This order was cancelled and will not be delivered.' };
  const guideHTML = `<aside class="card"><h2>Status Guide</h2><br>${[...STATUSES, 'Cancelled'].map(s => `<div class="guide-item">${badge(s)}<p>${guide[s]}</p></div>`).join('')}</aside>`;
  if (!order) { $content().innerHTML = `<h1>Order Status</h1><div class="card empty">You have no orders yet.<br><br><a class="btn btn-primary" href="home.html">Order now</a></div>`; return; }
  $content().innerHTML = `
    <h1>Order Status</h1><p class="muted">Here is where your latest order stands.</p>
    <div class="grid-2"><div>
      <section class="card"><h2>Order Details</h2><br>
        <div class="detail-row"><span>Order Number</span><span>${order.id}</span></div>
        <div class="detail-row"><span>Customer Name</span><span>${order.name}</span></div>
        <div class="detail-row"><span>Date Ordered</span><span>${fmtDate(order.createdAt, true)}</span></div>
        <div class="detail-row"><span>Payment Status</span><span>${badge(order.paymentStatus)}</span></div>
        <div class="detail-row"><span>Delivery Status</span><span>${badge(order.status)}</span></div></section><br>
      <section class="card" style="padding:0"><h3 style="padding:1.2rem 1.5rem">Items in this order</h3>
        <div class="table-wrap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Price</th></tr></thead><tbody>
          ${order.items.map(i => `<tr><td>${productById(i.productId).name}</td><td>${i.qty}</td><td>${peso(productById(i.productId).price * i.qty)}</td></tr>`).join('')}
          <tr><td colspan="2"><strong>Total (incl. delivery)</strong></td><td><strong>${peso(order.total)}</strong></td></tr></tbody></table></div></section><br>
      <a class="btn btn-primary" href="track-order.html?id=${order.id}">Track Order</a> <a class="btn" href="home.html">Back to Home</a>
      ${CANCELLABLE.includes(order.status) ? '<button class="btn btn-danger" id="cancel-btn">Cancel Order</button>' : ''}
    </div>${guideHTML}</div>`;
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) cancelBtn.onclick = () => {
    if (!confirm(`Cancel order ${order.id}? This cannot be undone.`)) return;
    cancelOrder(order.id);
    toast('Order cancelled');
    initStatus(user);   // redraw with the new status
  };
}

/* ---------- TRACK ORDER ---------- */
function initTrack(user) {
  const wanted = (new URLSearchParams(location.search).get('id') || '').toUpperCase();
  const orders = myOrders(user);
  const order = wanted ? orders.find(o => o.id === wanted) : orders[0];
  const form = `<form class="track-form" id="track-form"><input id="track-id" placeholder="Order ID, e.g. MJ-0418" value="${wanted}" aria-label="Order ID"><button class="btn btn-primary">Track</button></form>`;
  if (!order) { $content().innerHTML = `<h1>Track Your Order</h1><p class="muted">Enter your order ID to see where your water is right now.</p>${form}<div class="card empty">${wanted ? 'We could not find that order on your account.' : 'You have no orders yet.'}</div>`; bindTrackForm(); return; }

  if (order.status === 'Cancelled') {
    $content().innerHTML = `<h1>Track Your Order</h1><p class="muted">Order ${order.id}</p>${form}
      <section class="card"><div class="section-head"><h2>Delivery Progress</h2>${badge('Cancelled')}</div>
      <p class="muted">This order was cancelled, so nothing is on its way.</p><br><a class="btn btn-primary" href="home.html">Order Again</a></section>`;
    bindTrackForm(); return;
  }
  // each step: [title, note, minutes after the order was placed]
  const steps = [['Order Received', 'We got your order.', 0], ['Payment Confirmed', order.payment + ' confirmed.', 2], ['Preparing Water', 'Your gallons are filled and sealed.', 16],
                 ['Out for Delivery', 'Your rider is on the way.', 41], ['Delivered', 'Estimated arrival', 71]];
  const at = mins => new Date(new Date(order.createdAt).getTime() + mins * 60000).toISOString();
  const now = STATUSES.indexOf(order.status);
  const rows = steps.map(([title, note, mins], i) => {
    const state = order.status === 'Delivered' || i < now ? 'done' : i === now ? 'current' : 'upcoming';
    const when = i === 4 && state !== 'done' ? `${note} ${fmtTime(at(mins))}.` : `${fmtDate(at(mins))}, ${fmtTime(at(mins))}. ${i === 4 ? 'Delivered to your door.' : note}`;
    return `<li class="${state}"><span class="dot">${state === 'done' ? '✓' : ''}</span><h3>${title}</h3><p>${when}</p></li>`;
  }).join('');
  $content().innerHTML = `
    <h1>Track Your Order</h1><p class="muted">Enter your order ID to see where your water is right now.</p>${form}
    <div class="grid-2"><section class="card"><div class="section-head"><h2>Delivery Progress</h2>${badge(order.status)}</div><ol class="timeline">${rows}</ol></section>
      <div><section class="card"><h2>Delivery Rider</h2>
        <div class="rider"><span class="avatar">RS</span><div><strong>Ramon Santos</strong><br><small class="muted">Marc Jacob delivery rider</small></div></div>
        <div class="rider-field"><small>Contact Number</small>0917 987 6543</div>
        <div class="rider-field"><small>Estimated Arrival Time</small>${order.status === 'Delivered' ? 'Delivered' : fmtTime(at(71))}</div></section><br>
        <a class="btn btn-block" href="home.html">Order Again</a></div></div>`;
  bindTrackForm();
}
function bindTrackForm() {
  document.getElementById('track-form').onsubmit = e => { e.preventDefault(); location.href = 'track-order.html?id=' + encodeURIComponent(document.getElementById('track-id').value.trim()); };
}

/* ---------- PROFILE ---------- */
function initProfile(user) {
  const customer = getCustomers().find(c => c.id === user.customerId) || {};
  $content().innerHTML = `
    <h1>My Profile</h1><p class="muted">Keep your delivery details up to date.</p>
    <div class="grid-2">
      <form class="card" id="profile-form" novalidate><h2>Account Details</h2>
        <label for="p-name">Full Name</label><input id="p-name" required value="${user.name}">
        <label for="p-contact">Contact Number</label><input id="p-contact" required inputmode="tel" value="${customer.contact || ''}">
        <label for="p-address">Delivery Address</label><textarea id="p-address" required>${customer.address || ''}</textarea>
        <label for="p-email">Email</label><input id="p-email" type="email" required value="${user.email}">
        <p class="error" id="profile-error" hidden></p>
        <button class="btn btn-primary" style="margin-top:1.2rem">Save changes</button></form>
      <form class="card" id="password-form" novalidate><h2>Change Password</h2>
        <label for="pw-current">Current Password</label><input id="pw-current" type="password" autocomplete="current-password" required>
        <label for="pw-new">New Password (at least 6 characters)</label><input id="pw-new" type="password" autocomplete="new-password" required>
        <label for="pw-confirm">Confirm New Password</label><input id="pw-confirm" type="password" autocomplete="new-password" required>
        <p class="error" id="password-error" hidden></p>
        <button class="btn btn-primary" style="margin-top:1.2rem">Update password</button></form>
    </div>`;
  const showError = (id, text) => { const el = document.getElementById(id); el.hidden = !text; el.textContent = text || ''; };

  document.getElementById('profile-form').onsubmit = e => {
    e.preventDefault();
    const val = id => document.getElementById(id).value.trim();
    const name = val('p-name'), contact = val('p-contact'), address = val('p-address'), email = val('p-email').toLowerCase();
    if (!name || !contact || !address || !email) return showError('profile-error', 'Please fill in every field.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showError('profile-error', 'Please enter a valid email address.');
    const users = store.get('mj_users', []);
    if (users.some(u => u.email === email && u.email !== user.email)) return showError('profile-error', 'That email is already used by another account.');
    store.set('mj_customers', getCustomers().map(c => c.id === user.customerId ? { ...c, name, contact, address } : c));
    store.set('mj_users', users.map(u => u.email === user.email ? { ...u, name, email } : u));
    store.set('mj_session', { ...user, name, email });
    user.name = name; user.email = email;
    showError('profile-error', ''); toast('Profile saved');
  };

  document.getElementById('password-form').onsubmit = e => {
    e.preventDefault();
    const current = document.getElementById('pw-current').value, next = document.getElementById('pw-new').value;
    const users = store.get('mj_users', []), me = users.find(u => u.email === user.email);
    if (me.password !== current) return showError('password-error', 'Your current password is wrong.');
    if (next.length < 6) return showError('password-error', 'Your new password needs at least 6 characters.');
    if (next !== document.getElementById('pw-confirm').value) return showError('password-error', 'The new passwords do not match.');
    store.set('mj_users', users.map(u => u.email === user.email ? { ...u, password: next } : u));
    e.target.reset(); showError('password-error', ''); toast('Password updated');
  };
}

/* ---------- START ---------- */
const user = guard('customer');
if (user) {
  const page = document.body.dataset.page;
  renderCustomerHeader(page);
  ({ home: initHome, order: initOrder, status: initStatus, track: initTrack, profile: initProfile })[page](user);
}
