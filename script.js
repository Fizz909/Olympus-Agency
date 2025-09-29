/* script.js - Enhanced version
   - Improved loader with status text
   - Better i18n support
   - Enhanced search with validation
   - Toast notifications
   - Improved cart management
   - Better error handling
   - Form validation
*/

const STORAGE_CART = 'oaa_cart_v4';
const STORAGE_BOOKINGS = 'oaa_bookings_v4';
const STORAGE_LASTSEARCH = 'oaa_search_v4';

const I18N = {
  pt: { 
    searchPlaceholder: 'Selecione', 
    pax: 'Passageiros', 
    bookNow: 'Reservar agora', 
    added: 'adicionado ao carrinho',
    loading: 'Carregando...',
    searchFlights: 'Buscar voos',
    searchHotels: 'Buscar hotéis',
    searchPackages: 'Buscar pacotes',
    noResults: 'Nenhum resultado encontrado',
    cartEmpty: 'Carrinho vazio',
    bookingSuccess: 'Reserva realizada com sucesso!',
    bookingCanceled: 'Reserva cancelada',
    requiredField: 'Este campo é obrigatório',
    invalidEmail: 'Email inválido'
  },
  en: { 
    searchPlaceholder: 'Select', 
    pax: 'Passengers', 
    bookNow: 'Book now', 
    added: 'added to cart',
    loading: 'Loading...',
    searchFlights: 'Search flights',
    searchHotels: 'Search hotels',
    searchPackages: 'Search packages',
    noResults: 'No results found',
    cartEmpty: 'Cart is empty',
    bookingSuccess: 'Booking successful!',
    bookingCanceled: 'Booking canceled',
    requiredField: 'This field is required',
    invalidEmail: 'Invalid email'
  },
  es: { 
    searchPlaceholder: 'Seleccionar', 
    pax: 'Pasajeros', 
    bookNow: 'Reservar', 
    added: 'añadido al carrito',
    loading: 'Cargando...',
    searchFlights: 'Buscar vuelos',
    searchHotels: 'Buscar hoteles',
    searchPackages: 'Buscar paquetes',
    noResults: 'No se encontraron resultados',
    cartEmpty: 'Carrito vacío',
    bookingSuccess: '¡Reserva realizada con éxito!',
    bookingCanceled: 'Reserva cancelada',
    requiredField: 'Este campo es obligatorio',
    invalidEmail: 'Email inválido'
  }
};

// Utility functions
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
function readJSON(k, fallback){ try{ return JSON.parse(localStorage.getItem(k)) || fallback; }catch(e){ return fallback; } }
function writeJSON(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

// Toast notification system
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Enhanced loader with status text
function initLoader(){
  const loader = $('#site-loader');
  const site = $('#site');
  
  if (loader) {
    const loaderText = document.createElement('div');
    loaderText.className = 'loader-text';
    loaderText.textContent = I18N[getLang()].loading;
    loader.appendChild(loaderText);
  }
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
          loader.style.display = 'none';
        }, 300);
      }
      if(site) site.classList.remove('hidden');
      initPage();
    }, 800);
  });
}

// Enhanced page initialization
function initPage(){
  // Initialize language selects
  initLanguage();
  
  // Initialize offers
  generateOffers();
  
  // Initialize forms
  const searchForm = $('#searchForm');
  if(searchForm) {
    searchForm.addEventListener('submit', onSearchSubmit);
    initSearchForm();
  }
  
  // Initialize results page
  if($('#resultsList')) {
    renderResultsFromSearch();
  }
  
  // Initialize package page
  const addPkg = $('#addPackage');
  if(addPkg) {
    addPkg.addEventListener('click', addPackageToCart);
  }
  
  // Initialize cart
  if($('#cartItems')) {
    renderCartSidebar();
  }
  
  // Initialize checkout
  if($('#checkoutForm')) {
    initCheckout();
  }
  
  // Initialize bookings
  if($('#bookingsList')) {
    renderBookings();
  }
  
  // Initialize contact button
  const contactBtn = $('#contactBtn');
  if(contactBtn) {
    contactBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showContactModal();
    });
  }
}

// Enhanced language support
function initLanguage() {
  $all('.lang-select').forEach(select => {
    const savedLang = localStorage.getItem('oaa_lang') || 'pt';
    select.value = savedLang;
    select.addEventListener('change', (e) => {
      setLang(e.target.value);
    });
  });
}

function setLang(lang) {
  localStorage.setItem('oaa_lang', lang);
  document.documentElement.lang = lang;
  
  // Update UI texts
  const t = I18N[lang];
  $all('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key];
    }
  });
  
  // Update placeholders
  $all('select').forEach(select => {
    if(select.id === 'origin' || select.id === 'destination') {
      select.querySelectorAll('option')[0].textContent = t.searchPlaceholder;
    }
  });
  
  // Update loader text if exists
  const loaderText = $('.loader-text');
  if (loaderText) {
    loaderText.textContent = t.loading;
  }
  
  showToast(`Idioma alterado para ${lang.toUpperCase()}`, 'success');
}

function getLang() { 
  return localStorage.getItem('oaa_lang') || 'pt'; 
}

// Enhanced search form
function initSearchForm() {
  const typeSelect = $('#searchType');
  const originSelect = $('#origin');
  const destinationSelect = $('#destination');
  
  if (typeSelect && originSelect && destinationSelect) {
    // Update button text based on search type
    typeSelect.addEventListener('change', () => {
      const submitBtn = $('#searchForm .btn.primary');
      if (submitBtn) {
        const t = I18N[getLang()];
        const type = typeSelect.value;
        if (type === 'flight') submitBtn.textContent = t.searchFlights;
        else if (type === 'hotel') submitBtn.textContent = t.searchHotels;
        else if (type === 'package') submitBtn.textContent = t.searchPackages;
      }
    });
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateFrom = $('#dateFrom');
    const dateTo = $('#dateTo');
    
    if (dateFrom) dateFrom.min = today;
    if (dateTo) dateTo.min = today;
    
    if (dateFrom && dateTo) {
      dateFrom.addEventListener('change', () => {
        dateTo.min = dateFrom.value;
      });
    }
  }
}

// Enhanced search validation and submission
function onSearchSubmit(e){
  e.preventDefault();
  
  const type = $('#searchType') ? $('#searchType').value : 'flight';
  const origin = $('#origin') ? $('#origin').value : '';
  const destination = $('#destination') ? $('#destination').value : '';
  const dateFrom = $('#dateFrom') ? $('#dateFrom').value : '';
  const dateTo = $('#dateTo') ? $('#dateTo').value : '';
  const pax = $('#pax') ? +$('#pax').value : 1;
  
  // Basic validation
  if (!origin || !destination) {
    showToast('Por favor, selecione origem e destino', 'error');
    return;
  }
  
  if (origin === destination) {
    showToast('Origem e destino não podem ser iguais', 'error');
    return;
  }
  
  if (!dateFrom) {
    showToast('Por favor, selecione uma data de ida', 'error');
    return;
  }
  
  const search = { type, origin, destination, dateFrom, dateTo, pax, ts: Date.now() };
  writeJSON(STORAGE_LASTSEARCH, search);
  
  // Show loading state
  const submitBtn = e.target.querySelector('.btn.primary');
  if (submitBtn) {
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Buscando...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
      window.location.href = 'results.html';
    }, 1000);
  }
}

// Enhanced offers generation
function generateOffers(){
  const offersGrid = $('#offersGrid');
  if(!offersGrid) return;
  
  const samples = [
    {title:'São Paulo - 3 dias', price:1299, img:'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=800&q=80', type:'city'},
    {title:'Rio de Janeiro - Fim de semana', price:899, img:'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=800&q=80', type:'beach'},
    {title:'Minas Gerais - Roteiro gastronômico', price:1099, img:'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80', type:'culinary'},
    {title:'ES - Praias', price:799, img:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', type:'beach'}
  ];
  
  offersGrid.innerHTML = '';
  const t = I18N[getLang()];
  
  samples.forEach(offer => {
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <img src="${offer.img}" alt="${offer.title}" loading="lazy">
      <h3>${offer.title}</h3>
      <p class="muted">A partir de <strong>R$ ${offer.price.toLocaleString()}</strong></p>
      <div style="padding:12px">
        <button class="btn outline small" data-buy='${JSON.stringify({
          id:'OF-'+Math.random().toString(36).slice(2,6).toUpperCase(),
          title:offer.title,
          price:offer.price,
          type:'offer'
        })}'>${t.bookNow}</button>
      </div>
    `;
    offersGrid.appendChild(el);
  });
  
  // Add event listeners to buy buttons
  $all('[data-buy]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const item = JSON.parse(ev.currentTarget.dataset.buy);
      addToCart(item);
      showToast(`"${item.title}" ${t.added}`, 'success');
    });
  });
}

// Enhanced results rendering
function renderResultsFromSearch(){
  const search = readJSON(STORAGE_LASTSEARCH, {});
  const list = $('#resultsList');
  const summary = $('#searchSummary');
  
  if(!list) return;
  
  if (summary && search.origin && search.destination) {
    summary.textContent = `${search.origin} → ${search.destination} • ${search.dateFrom} • ${search.pax} ${search.pax > 1 ? 'pessoas' : 'pessoa'}`;
  }
  
  const items = [];
  const t = I18N[getLang()];
  
  if(!search.type || search.type==='flight'){
    const carriers = ['OlympusAero'];
    for(let i=0; i<8; i++){
      const price = Math.round((200 + Math.random()*1500));
      items.push({
        id:'FL-'+Math.random().toString(36).slice(2,8).toUpperCase(),
        title: `${search.origin || 'Fortaleza'} → ${search.destination || 'Rio de Janeiro'}`,
        airline: carriers[i % carriers.length],
        depart: search.dateFrom || '---',
        duration: `${3+Math.floor(Math.random()*12)}h ${Math.floor(Math.random()*60)}m`,
        price,
        type: 'flight'
      });
    }
    // Sort by price
    items.sort((a, b) => a.price - b.price);
  } else if(search.type==='hotel'){
    for(let i=0; i<6; i++){
      items.push({ 
        id:'HT-'+i, 
        title:'Palácio Tangará '+(i+1), 
        price:1000+Math.floor(Math.random()*6000),
        type: 'hotel'
      });
    }
  } else if(search.type==='package'){
    items.push({ 
      id:'PKG-DREAM', 
      title:'Viagem dos Sonhos — Pacote Completo', 
      price:35000,
      type: 'package'
    });
  }
  
  list.innerHTML = '';
  
  if (items.length === 0) {
    list.innerHTML = `<div class="text-center muted">${t.noResults}</div>`;
    return;
  }
  
  items.forEach(item => {
    const el = document.createElement('article');
    el.className = 'result-card';
    el.innerHTML = `
      <h4>${item.title}</h4>
      ${item.airline ? `<p class="small muted">${item.airline} • ${item.duration}</p>` : ''}
      <div class="price">R$ ${item.price.toLocaleString()}</div>
      <button class="btn primary small" data-add='${JSON.stringify(item)}'>${t.bookNow}</button>
    `;
    list.appendChild(el);
  });
  
  // Add event listeners
  $all('[data-add]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const item = JSON.parse(ev.currentTarget.dataset.add);
      addToCart(item);
      showToast(`"${item.title}" ${t.added}`, 'success');
    });
  });
}

// Enhanced cart management
function getCart(){ return readJSON(STORAGE_CART, []); }
function saveCart(cart){ writeJSON(STORAGE_CART, cart); }

function addToCart(item){
  const cart = getCart();
  cart.push({...item, cartId: Date.now().toString(36)});
  saveCart(cart);
  renderCartSidebar();
}

function removeFromCart(cartId){
  const cart = getCart();
  const newCart = cart.filter(item => item.cartId !== cartId);
  saveCart(newCart);
  renderCartSidebar();
  showToast(I18N[getLang()].bookingCanceled, 'error');
}

function renderCartSidebar(){
  const container = $('#cartItems');
  const totalEl = $('#cartTotal');
  const emptyEl = $('#cartEmpty');
  const checkoutBtn = $('#checkoutBtn');
  
  if(!container) return;
  
  const cart = getCart();
  const t = I18N[getLang()];
  
  if(cart.length === 0){
    if(emptyEl) emptyEl.classList.remove('hidden');
    if(container) container.innerHTML = '';
    if(totalEl) totalEl.textContent = 'R$ 0';
    if(checkoutBtn) checkoutBtn.disabled = true;
    return;
  }
  
  if(emptyEl) emptyEl.classList.add('hidden');
  
  container.innerHTML = '';
  let total = 0;
  
  cart.forEach(item => {
    total += item.price;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; gap:8px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.05);">
        <div style="flex:1">
          <strong>${item.title}</strong>
          <div class="small muted">R$ ${item.price.toLocaleString()}</div>
        </div>
        <button class="btn small" data-remove="${item.cartId}" style="background:transparent; color:var(--error); padding:4px 8px;">✕</button>
      </div>
    `;
    container.appendChild(el);
  });
  
  if(totalEl) totalEl.textContent = `R$ ${total.toLocaleString()}`;
  if(checkoutBtn) checkoutBtn.disabled = false;
  
  // Add remove event listeners
  $all('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      removeFromCart(ev.currentTarget.dataset.remove);
    });
  });
}

function addPackageToCart(){
  const pkg = {
    id: 'PKG-DREAM',
    title: 'Viagem dos Sonhos — Pacote Completo',
    price: 35000,
    type: 'package'
  };
  addToCart(pkg);
  showToast(`"${pkg.title}" ${I18N[getLang()].added}`, 'success');
}

// Enhanced checkout
function initCheckout(){
  const form = $('#checkoutForm');
  const cart = getCart();
  
  if(cart.length === 0){
    window.location.href = 'index.html';
    return;
  }
  
  if(form){
    form.addEventListener('submit', onCheckoutSubmit);
    
    // Real-time validation
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
      input.addEventListener('blur', validateField);
    });
  }
  
  renderCheckoutSummary();
}

function validateField(e) {
  const field = e.target;
  const value = field.value.trim();
  const t = I18N[getLang()];
  
  // Clear previous error
  field.style.borderColor = '';
  const existingError = field.parentNode.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Check required
  if (field.required && !value) {
    showFieldError(field, t.requiredField);
    return false;
  }
  
  // Check email format
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showFieldError(field, t.invalidEmail);
      return false;
    }
  }
  
  return true;
}

function showFieldError(field, message) {
  field.style.borderColor = 'var(--error)';
  const errorEl = document.createElement('div');
  errorEl.className = 'field-error small';
  errorEl.style.color = 'var(--error)';
  errorEl.style.marginTop = '4px';
  errorEl.textContent = message;
  field.parentNode.appendChild(errorEl);
}

function onCheckoutSubmit(e){
  e.preventDefault();
  
  // Validate all fields
  const form = e.target;
  const inputs = form.querySelectorAll('input[required]');
  let isValid = true;
  
  inputs.forEach(input => {
    if (!validateField({ target: input })) {
      isValid = false;
    }
  });
  
  if (!isValid) {
    showToast('Por favor, corrija os erros no formulário', 'error');
    return;
  }
  
  const formData = new FormData(form);
  const booking = {
    id: 'BK-' + Date.now().toString(36).toUpperCase(),
    items: getCart(),
    customer: Object.fromEntries(formData),
    date: new Date().toISOString(),
    status: 'confirmed'
  };
  
  // Save booking
  const bookings = readJSON(STORAGE_BOOKINGS, []);
  bookings.push(booking);
  writeJSON(STORAGE_BOOKINGS, bookings);
  
  // Clear cart
  saveCart([]);
  
  // Show success message
  const t = I18N[getLang()];
  showToast(t.bookingSuccess, 'success');
  
  // Redirect to bookings page
  setTimeout(() => {
    window.location.href = 'bookings.html';
  }, 1500);
}

function renderCheckoutSummary(){
  const container = $('#checkoutSummary');
  if(!container) return;
  
  const cart = getCart();
  let total = 0;
  
  container.innerHTML = '';
  
  cart.forEach(item => {
    total += item.price;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; gap:8px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.05);">
        <div style="flex:1">
          <strong>${item.title}</strong>
          <div class="small muted">R$ ${item.price.toLocaleString()}</div>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
  
  const totalEl = document.createElement('div');
  totalEl.className = 'cart-total';
  totalEl.innerHTML = `Total: <strong>R$ ${total.toLocaleString()}</strong>`;
  container.appendChild(totalEl);
}

// Enhanced bookings
function renderBookings(){
  const container = $('#bookingsList');
  if(!container) return;
  
  const bookings = readJSON(STORAGE_BOOKINGS, []);
  
  if(bookings.length === 0){
    container.innerHTML = `
      <div class="text-center muted">
        <p>Nenhuma reserva encontrada.</p>
        <a href="index.html" class="btn primary mt-2">Buscar viagens</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  bookings.forEach(booking => {
    const total = booking.items.reduce((sum, item) => sum + item.price, 0);
    const el = document.createElement('article');
    el.className = 'booking';
    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:12px;">
        <div style="flex:1">
          <h4>Reserva ${booking.id}</h4>
          <p class="small muted">${new Date(booking.date).toLocaleDateString('pt-BR')} • ${booking.customer.name}</p>
          <div style="margin-top:8px;">
            ${booking.items.map(item => `<div class="small">✓ ${item.title}</div>`).join('')}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="price">R$ ${total.toLocaleString()}</div>
          <div class="small" style="color:var(--success); font-weight:600;">${booking.status}</div>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

// Enhanced contact modal
function showContactModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 16px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2);">
      <h3 style="margin-bottom: 1rem;">Entre em Contato</h3>
      <p style="margin-bottom: 1.5rem; color: var(--muted);">Nossa equipe está pronta para ajudar você a planejar a viagem dos seus sonhos!</p>
      
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <strong>📞 Telefone</strong>
          <p style="margin: 0.25rem 0 0; color: var(--muted);">(11) 9999-9999</p>
        </div>
        <div>
          <strong>✉️ Email</strong>
          <p style="margin: 0.25rem 0 0; color: var(--muted);">contato@olimpusair.com.br</p>
        </div>
        <div>
          <strong>📍 Endereço</strong>
          <p style="margin: 0.25rem 0 0; color: var(--muted);">Av. Paulista, 1000 - São Paulo, SP</p>
        </div>
      </div>
      
      <button class="btn primary" style="margin-top: 1.5rem; width: 100%;" onclick="this.closest('.modal').remove()">Fechar</button>
    </div>
  `;
  
  modal.classList.add('modal');
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', initLoader);
