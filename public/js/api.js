const API_BASE = 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function fetchMenu() {
  const res = await fetch(API_BASE + '/menu');
  if (!res.ok) throw new Error('Failed to load menu');
  return res.json();
}

async function fetchAdminMenu() {
  const res = await fetch(API_BASE + '/admin/menu', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load admin menu');
  return res.json();
}

async function fetchMyOrders() {
  const res = await fetch(API_BASE + '/orders', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json();
}

function isItemAvailable(item) {
  const available = item.is_available === undefined || item.is_available === 1 || item.is_available === true;
  const inStock = item.stock === undefined || item.stock === null || item.stock > 0;
  return available && inStock;
}

function formatPrice(price) {
  return 'PKR ' + Number(price).toLocaleString();
}

function renderMenuCard(item, options = {}) {
  const available = isItemAvailable(item);
  const stockText =
    item.stock !== undefined && item.stock !== null
      ? `<p class="stock">${available ? 'In stock: ' + item.stock : 'Out of stock'}</p>`
      : '';

  const card = document.createElement('div');
  card.classList.add('menu-item');
  if (!available) card.classList.add('unavailable');
  card.innerHTML = `
    <img src="${item.image_url || './images/logos/burger_logo.jpg'}" alt="${item.name}">
    <h3>${item.name}</h3>
    <p class="price">${formatPrice(item.price)}</p>
    ${item.discount ? `<p class="discount">${item.discount}% OFF</p>` : ''}
    ${stockText}
    ${options.showDescription && item.description ? `<p class="description">${item.description}</p>` : ''}
  `;
  return card;
}
