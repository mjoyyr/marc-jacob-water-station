# Marc Jacob Water Station (HTML + CSS + JavaScript)

Open `index.html` in a browser. No server needed.

## Demo logins (one login page, role decides the dashboard)
- Admin: `admin@marcjacob.com` (or `admin`) / `admin123` -> admin-dashboard.html
- Customer: `boy@example.com` / `customer123` -> home.html

- New customers: `signup.html` (creates the account and adds them to Customer Records)

## Where things are
- `css/style.css` one stylesheet, numbered sections
- `js/data.js` demo data, prices, login/logout, `guard()` (blocks wrong role)
- `js/layout.js` header, sidebar, toast, table paging, CSV download
- `js/customer.js` home, order, order-status, track-order, profile
- `js/admin.js` dashboard, customers, payments, sales
- `design-reference/` the Figma screenshots

Admins change order and payment status with the dropdowns on the Dashboard and Payment Records pages.

Settings (delivery fee, free-delivery gallons, rows per page) are at the top of `js/data.js`.
Reset demo data: run `localStorage.clear()` in the browser console.
