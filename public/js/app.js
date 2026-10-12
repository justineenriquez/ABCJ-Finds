/* ABCJ Finds client-side logic */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const ICONS = {
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  fork: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2.5 1.5-3 5-3 8h3"/>'
};
const icon = (n, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const rate = (r, tag = 'span') => `<${tag} class="rate">${icon('star', 12)}${r.rating.toFixed(1)}</${tag}>`;
const avatar = (r) => `<div class="avatar">${esc(r.name[0].toUpperCase())}</div>`;
const showErr = (sel, msg) => Object.assign($(sel), { textContent: msg }).style.setProperty('display', 'block');

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { details: data?.details });
  return data;
}

function toast(msg, err = false) {
  const t = $('.toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast' }));
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = 'toast'), 3200);
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  const [n, u] = s < 3600 ? [s / 60, 'm'] : s < 86400 ? [s / 3600, 'h'] : [s / 86400, 'd'];
  return s < 86400 * 14 ? `${Math.max(1, Math.round(n))}${u} ago` : new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/* ---------- Shared shell ---------- */
function renderShell(active) {
  const link = ([href, key, label]) => `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  $('#site-header').outerHTML = `
  <header class="site-header"><div class="container nav">
    <a class="brand" href="index.html">
      <div class="logo"><img src="/images/logo.png" alt="ABCJ Finds Logo"></div>
      <span class="brand-name">ABCJ <span>Finds</span></span>
    </a>
    <nav class="nav-links">${[['index.html', 'home', 'Home'], ['restaurants.html', 'restaurants', 'Restaurants'], ['about.html', 'about', 'About']].map(link).join('')}</nav>
    <a class="btn primary sm" href="restaurants.html">${icon('db', 14)}<span>Manage Restaurants</span></a>
  </div></header>`;
  $('#site-footer').outerHTML = `
  <footer class="site-footer"><div class="container">
    <b>ABCJ Finds</b><span>Restaurants for your appetite · dbRestaurants</span>
  </div></footer>`;
}

/* ---------- Shared form pieces ---------- */
const CUISINES = ['Filipino', 'Indian', 'Italian', 'Japanese', 'Chinese', 'American', 'Korean', 'Mexican', 'Seafood', 'Vegetarian', 'Cafe'];
const PLACES = ['Angeles City, Pampanga', 'Clark, Pampanga', 'San Fernando, Pampanga', 'Mabalacat, Pampanga'];
const PHONE_RX = /^(09\d{9}|\+639\d{9})$/;

function fieldsHTML(v = {}, p = '') {
  const list = (id, items) => `<datalist id="${p}${id}">${items.map((c) => `<option value="${c}">`).join('')}</datalist>`;
  const f = (name, label, attrs, msg, extra = '') =>
    `<label class="f" data-field="${name}">${label}<input class="input" name="${name}" ${attrs} value="${esc(v[name])}">${extra}<span class="err">${msg}</span></label>`;
  return `
  ${f('name', 'Restaurant name *', `id="${p}name" placeholder="e.g. The Sunday Table" maxlength="80"`, 'Enter a name (2–80 characters).')}
  <div class="two">
    ${f('cuisine', 'Cuisine *', `list="${p}cuisines" placeholder="Select or type a cuisine" maxlength="40"`, 'Choose or type a cuisine.', list('cuisines', CUISINES))}
    ${f('rating', 'User rating *', 'type="number" min="0" max="5" step="0.1" placeholder="4.5"', 'Rating must be 0 to 5.')}
  </div>
  <div class="two">
    ${f('address', 'Location *', `list="${p}places" placeholder="e.g. Angeles City, Pampanga" maxlength="120"`, 'Enter a location.', list('places', PLACES))}
    ${f('contact', 'Contact number *', 'placeholder="e.g. 09171234567"', 'Use a PH mobile number, e.g. 09171234567.')}
  </div>`;
}

function validate(form) {
  const d = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
  const contact = d.contact.replace(/[\s-]/g, '');
  const bad = {
    name: d.name.length < 2 || d.name.length > 80,
    cuisine: !d.cuisine,
    rating: d.rating === '' || isNaN(+d.rating) || +d.rating < 0 || +d.rating > 5,
    address: !d.address,
    contact: !PHONE_RX.test(contact)
  };
  $$('label.f', form).forEach((l) => l.classList.toggle('bad', !!bad[l.dataset.field]));
  return { ok: !Object.values(bad).some(Boolean), data: { ...d, rating: +d.rating, contact } };
}

/* ---------- Home ---------- */
async function initHome() {
  renderShell('home');
  $('#hero-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#hero-q').value.trim();
    location.href = 'restaurants.html' + (q ? `?q=${encodeURIComponent(q)}` : '');
  });
  try {
    const [stats, top, latest] = await Promise.all([api('/api/stats'), api('/api/restaurants?sort=rating'), api('/api/restaurants?sort=recent')]);
    $('#stat-total').textContent = stats.total;
    $('#stat-recent').textContent = stats.recent;
    $('#stat-avg').textContent = stats.averageRating.toFixed(1);
    $('#top-grid').innerHTML = top.slice(0, 5).map((r) => `
      <a class="card top-card" href="restaurants.html?q=${encodeURIComponent(r.name)}">
        <div class="row"><span class="tag">${esc(r.cuisine)}</span>${rate(r)}</div>
        ${avatar(r)}
        <h3>${esc(r.name)}</h3>
        <div class="loc">${icon('pin', 12)}${esc(r.address)}</div>
      </a>`).join('');
    $('#latest').innerHTML = latest.slice(0, 3).map((r) => `
      <div class="list-row">
        ${avatar(r)}
        <div><b>${esc(r.name)}</b><small>${esc(r.cuisine)}</small></div>
        <div class="hide-sm badge">${esc(r.address)}</div>
        ${rate(r, 'div')}
        <div class="hide-sm badge">${r.createdAt === r.updatedAt ? 'Added' : 'Updated'} ${timeAgo(r.updatedAt)}</div>
      </div>`).join('') || '<div class="empty">No restaurants yet. Add your first one!</div>';
  } catch (e) {
    toast('Could not load data: ' + e.message, true);
  }
}

/* ---------- Restaurants ---------- */
async function initRestaurants() {
  renderShell('restaurants');
  const state = { q: new URLSearchParams(location.search).get('q') || '', cuisine: '', location: '', sort: '' };
  $('#q').value = state.q;
  let toDelete, toEdit;
  const grid = $('#grid'), editModal = $('#edit-modal'), delModal = $('#del-modal');

  const card = (r) => `
    <article class="card r-card">
      <div class="r-body">
        <div class="row"><span class="tag">${esc(r.cuisine)}</span>${rate(r)}</div>
        <div class="banner">${icon('fork', 28)}</div>
        <h3>${esc(r.name)}</h3>
        <div class="loc">${icon('pin', 12)}${esc(r.address)}</div>
        <div class="loc">${icon('phone', 12)}${esc(r.contact)}</div>
      </div>
      <div class="r-actions">
        <button class="btn sm" data-edit="${r.restaurant_id}">${icon('edit', 13)}Edit</button>
        <button class="btn sm del" data-del="${r.restaurant_id}" data-name="${esc(r.name)}">${icon('trash', 13)}Delete</button>
      </div>
    </article>`;

  async function load() {
    const qs = new URLSearchParams(Object.entries(state).filter(([, v]) => v)).toString();
    try {
      const items = await api('/api/restaurants' + (qs ? '?' + qs : ''));
      $('#count').textContent = `${items.length} restaurant${items.length === 1 ? '' : 's'}`;
      grid.innerHTML = items.map(card).join('') || '<div class="empty"><h3>No matches</h3><p>Try a different search or filter.</p></div>';
    } catch (e) { toast(e.message, true); }
  }

  // filters
  try {
    const all = await api('/api/restaurants');
    const fill = (sel, label, key) =>
      ($(sel).innerHTML = `<option value="">${label}</option>` + [...new Set(all.map((r) => r[key]))].sort().map((c) => `<option>${esc(c)}</option>`).join(''));
    fill('#f-cuisine', 'All cuisines', 'cuisine');
    fill('#f-location', 'All locations', 'address');
  } catch { /* handled in load */ }

  let t;
  $('#q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 250); });
  [['#f-cuisine', 'cuisine'], ['#f-location', 'location'], ['#f-sort', 'sort']].forEach(([sel, key]) =>
    $(sel).addEventListener('change', (e) => { state[key] = e.target.value; load(); }));

  // modals
  const close = () => $$('.overlay').forEach((o) => o.classList.remove('open'));
  $$('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o || e.target.hasAttribute('data-close')) close(); }));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  grid.addEventListener('click', async (e) => {
    const eb = e.target.closest('[data-edit]'), db = e.target.closest('[data-del]');
    if (eb) {
      try {
        toEdit = await api('/api/restaurants/' + eb.dataset.edit);
        $('#edit-fields').innerHTML = fieldsHTML(toEdit, 'e-');
        $('#edit-error').style.display = 'none';
        editModal.classList.add('open');
      } catch (err) { toast(err.message, true); }
    }
    if (db) {
      toDelete = db.dataset.del;
      $('#del-name').textContent = db.dataset.name;
      delModal.classList.add('open');
    }
  });

  $('#edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { ok, data } = validate(e.target);
    if (!ok) return;
    const btn = $('#edit-save'); btn.disabled = true;
    try {
      await api('/api/restaurants/' + toEdit.restaurant_id, { method: 'PUT', body: JSON.stringify(data) });
      close(); toast('Restaurant updated'); load();
    } catch (err) { showErr('#edit-error', err.message); } finally { btn.disabled = false; }
  });

  $('#del-confirm').addEventListener('click', async () => {
    const btn = $('#del-confirm'); btn.disabled = true;
    try {
      await api('/api/restaurants/' + toDelete, { method: 'DELETE' });
      close(); toast('Restaurant deleted permanently'); load();
    } catch (err) { toast(err.message, true); } finally { btn.disabled = false; }
  });

  load();
}

/* ---------- Add form ---------- */
function initForm() {
  renderShell('restaurants');
  const form = $('#add-form');
  $('#fields').innerHTML = fieldsHTML({}, 'a-');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { ok, data } = validate(form);
    if (!ok) return;
    const btn = $('#submit-btn'); btn.disabled = true;
    try {
      await api('/api/restaurants', { method: 'POST', body: JSON.stringify(data) });
      toast('Restaurant added!');
      setTimeout(() => (location.href = 'index.html'), 700);
    } catch (err) { showErr('#form-error', err.message); btn.disabled = false; }
  });
}

/* ---------- Boot ---------- */
({ home: initHome, restaurants: initRestaurants, form: initForm, about: () => renderShell('about') })[document.body.dataset.page]?.();