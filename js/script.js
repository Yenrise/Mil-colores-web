// Función para cargar los productos desde el JSON
async function loadInventory() {
    try {
        // Cambia esto en tu función loadInventory:
const response = await fetch(`data/productos.json?v=${new Date().getTime()}`);
        
        // Error de red (archivo no encontrado o mal nombre)
        if (!response.ok) {
            throw new Error(`No se pudo encontrar el archivo: ${response.statusText}`);
        }

        const text = await response.text(); // Leemos como texto primero para analizarlo
        
        try {
            products = JSON.parse(text); // Intentamos convertir a datos
            renderProducts(products);
            renderCategoryMenu();
            console.log("✅ Inventario cargado perfectamente.");
        } catch (jsonError) {
            // ERROR DE SINTAXIS (Falta una coma, comillas simples, etc.)
            console.error("❌ ERROR DE SINTAXIS EN EL JSON:");
            console.error(jsonError.message);
            
            // Este truco te dice la línea aproximada del error
            const match = jsonError.message.match(/at position (\document+)/);
            if (match) {
                const pos = parseInt(match[1]);
                console.info("Revisa cerca del carácter número:", pos);
                console.info("Fragmento del error:", text.substring(pos - 20, pos + 20));
            }
            
            alert("El archivo productos.json tiene un error de formato. Revisa la consola (F12).");
        }

    } catch (networkError) {
        console.error("❌ ERROR DE CARGA:", networkError.message);
    }
}

let products = []; // Ahora empieza vacía y se llenará después
/* =========================================
   1. CONFIGURACIÓN Y DATOS (Simulación BD)
   ========================================= */

   const CATEGORIAS = {
    ESCOLARES: "Escolares",
    OFICINA: "Oficina",
    ARTE: "Arte",
    DEPORTE: "Juegos",
    CREATIVA: "Creativa",
    DETALLES: "Detalles",
    CAJAS: "Cajas"
};



const shippingRates = {
    'Quito': 2.00,
    'Guayaquil': 4.00,
    'Cuenca': 4.00,
    'Otro': 6.00
};

// ESTADO GLOBAL DE LA APLICACIÓN
let cart = JSON.parse(localStorage.getItem('milColores_cart')) || [];
let selectedCity = localStorage.getItem('milColores_city') || "";
let clientName = localStorage.getItem('milColores_name') || "";

/* =========================================
   2. FUNCIONES DOM Y RENDERIZADO
   ========================================= */

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargamos los datos primero (esto llena el array 'products')
    await loadInventory(); 
    
    // 2. Ahora que ya tenemos datos, ejecutamos las funciones de dibujo
    renderProducts(products);
    renderCategoryMenu();
    updateCartUI();
    
    // 3. Restaurar selección de ciudad y nombre si existen
    const citySelector = document.getElementById('citySelector');
    const nameInput = document.getElementById('clientName');

    if(selectedCity && citySelector) citySelector.value = selectedCity;
    if(clientName && nameInput) nameInput.value = clientName;
});

// Renderizar Productos en la grilla
function renderProducts(productList) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = productList.map(product => `
        <div class="product-card">
            <img src="${product.img}" alt="${product.name}" class="product-img">
            <div class="product-info">
                <div>
                    <h4 class="product-title">${product.name}</h4>
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                </div>
                <button class="btn-add" onclick="addToCart(${product.id})">
                    Añadir al carrito <i class="ri-shopping-basket-2-line"></i>
                </button>
            </div>
        </div>
    `).join('');
}



/* =========================================
   3. LÓGICA DEL CARRITO (CORE)
   ========================================= */

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCartState();
    updateCartUI();
    // Abrir el carrito automáticamente al añadir para feedback inmediato (Mejora UX)
    openCart();
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCartState();
        updateCartUI();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartState();
    updateCartUI();
}

// Persistencia: Guardar todo en LocalStorage
function saveCartState() {
    localStorage.setItem('milColores_cart', JSON.stringify(cart));
}

// Actualizar toda la interfaz del mini-checkout
function updateCartUI() {
    // 1. Contador flotante
    const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalCount;

    // 2. Renderizar lista de items
    const cartContainer = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">Tu carrito está vacío 😢</p>';
    } else {
        cartContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <h5>${item.name}</h5>
                    <p>$${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-controls">
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    calculateTotals();
}

/* =========================================
   4. CÁLCULO DE ENVÍO Y TOTALES
   ========================================= */

// Event Listeners para inputs del checkout
document.getElementById('citySelector').addEventListener('change', (e) => {
    selectedCity = e.target.value;
    localStorage.setItem('milColores_city', selectedCity);
    calculateTotals();
});

document.getElementById('clientName').addEventListener('input', (e) => {
    clientName = e.target.value;
    localStorage.setItem('milColores_name', clientName);
});

function calculateTotals() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Calcular envío según ciudad seleccionada
    let shippingCost = 0;
    if (selectedCity && shippingRates[selectedCity]) {
        shippingCost = shippingRates[selectedCity];
    }

    const total = subtotal + shippingCost;

    // Actualizar DOM
    document.getElementById('subtotalDisplay').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('shippingDisplay').textContent = selectedCity ? `$${shippingCost.toFixed(2)}` : '$--.--';
    document.getElementById('totalDisplay').textContent = `$${total.toFixed(2)}`;

    // Manejar estado del botón WhatsApp
    const btn = document.getElementById('btnWhatsapp');
    if (cart.length === 0) {
        btn.disabled = true;
        btn.textContent = "Carrito Vacío";
    } else if (!selectedCity) {
        btn.disabled = true;
        btn.textContent = "Selecciona Ciudad";
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="ri-whatsapp-line"></i> Finalizar pedido por WhatsApp';
    }
}

/* =========================================
   5. WHATSAPP CHECKOUT GENERATOR
   ========================================= */

function checkoutWhatsApp() {
    if (cart.length === 0 || !selectedCity) return;

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = shippingRates[selectedCity];
    const total = subtotal + shipping;
    const name = clientName || "Cliente"; // Fallback si no pone nombre

    // Construcción del mensaje
    let message = `Hola 👋, buen día.\n`;
    message += `Soy ${name}.\n`;
    message += `Quisiera realizar el siguiente pedido en Mil Colores 🛍️\n\n`;
    message += `📦 *Productos:*\n`;

    cart.forEach(item => {
        message += `• ${item.name} (x${item.quantity}) – $${(item.price * item.quantity).toFixed(2)}\n`;
    });

    message += `\n🧾 *Resumen:*\n`;
    message += `Subtotal: $${subtotal.toFixed(2)}\n`;
    message += `Envío a ${selectedCity}: $${shipping.toFixed(2)}\n`;
    message += `*Total: $${total.toFixed(2)}*\n\n`;
    message += `¿Podrían confirmarme disponibilidad y tiempo de entrega, por favor?\n¡Gracias!`;

    // Codificación y Redirección
    const phoneNumber = "593998469884"; // Reemplazar con el número real
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
}

/* =========================================
   6. UI INTERACTION (Modales y Paneles)
   ========================================= */

function toggleCart() {
    const cartPanel = document.getElementById('miniCheckout');
    const overlay = document.getElementById('overlay');
    cartPanel.classList.toggle('active');
    overlay.classList.toggle('active');
}

function openCart() {
    document.getElementById('miniCheckout').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeAll() {
    document.getElementById('miniCheckout').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('contactModal').classList.remove('show');
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal.classList.contains('show')) {
        modal.classList.remove('show');
    } else {
        modal.classList.add('show');
    }
}

function scrollToProducts() {
    document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' });
}

// Función para compartir la tienda (Web Share API)
async function shareStore() {
    const shareData = {
        title: 'Mil Colores - Papelería',
        text: 'Mira los productos geniales que encontré en Mil Colores 🎨',
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: Copiar al portapapeles
            navigator.clipboard.writeText(window.location.href);
            alert("Enlace de la tienda copiado al portapapeles 📋");
        }
    } catch (err) {
        console.log("Error al compartir: ", err);
    }
}

// Cerrar modales si se hace clic fuera del contenido
window.onclick = function(event) {
    const contactModal = document.getElementById('contactModal');
    if (event.target == contactModal) {
        closeAll();
    }
}

/* =========================================
   LÓGICA DEL CARRUSEL AUTOMÁTICO
   ========================================= */
const carousel = document.getElementById('carousel');
const dots = document.querySelectorAll('.dot');
let currentSlide = 0;
const totalSlides = dots.length;
let autoPlayInterval;

function updateDots() {
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function goToSlide(index) {
    currentSlide = index;
    const offset = carousel.offsetWidth * index;
    carousel.scrollTo({
        left: offset,
        behavior: 'smooth'
    });
    updateDots();
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    goToSlide(currentSlide);
}

// Iniciar Auto-play
function startAutoPlay() {
    autoPlayInterval = setInterval(nextSlide, 5000); // 5 segundos
}

// Detener Auto-play si el usuario interactúa
carousel.addEventListener('mousedown', () => clearInterval(autoPlayInterval));
carousel.addEventListener('touchstart', () => clearInterval(autoPlayInterval));

// Sincronizar puntos si el usuario desliza manualmente
carousel.addEventListener('scroll', () => {
    const index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    if (currentSlide !== index) {
        currentSlide = index;
        updateDots();
    }
});

// Inicializar
startAutoPlay();


/* =========================================
   LÓGICA DE KITS INTELIGENTES
   ========================================= */

const kitsDefinidos = {
    'escolar': [1, 2, 3, 8], // IDs: Cuaderno, Lápices, Bolígrafo, Goma
    'oficina': [4, 5]        // IDs: Resma, Marcadores
};

function addKitToCart(tipo) {
    const ids = kitsDefinidos[tipo];
    
    ids.forEach(id => {
        const producto = products.find(p => p.id === id);
        if (producto) {
            // Reutilizamos la lógica de addToCart existente
            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({ ...producto, quantity: 1 });
            }
        }
    });

    saveCartState();
    updateCartUI();
    openCart();
    
    // Feedback visual innovador: Confeti o notificación
    showNotification(`¡Kit ${tipo.toUpperCase()} añadido con éxito! 🛍️`);
}

// Pequeña función para notificaciones tipo Toast
function showNotification(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }, 100);
}

/* =========================================
   LÓGICA DEL TEMPORIZADOR
   ========================================= */
function updateTimer() {
    // Configuramos el fin de la oferta para las 11:59:59 PM de hoy
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59);

    const diff = endOfDay - now;

    if (diff <= 0) {
        document.getElementById('countdown').innerHTML = "¡Oferta terminada!";
        return;
    }

    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    document.getElementById('hours').textContent = h < 10 ? '0' + h : h;
    document.getElementById('minutes').textContent = m < 10 ? '0' + m : m;
    document.getElementById('seconds').textContent = s < 10 ? '0' + s : s;
}

// Actualizar cada segundo
setInterval(updateTimer, 1000);
updateTimer(); // Llamada inicial

/* =========================================
   7. LÓGICA DE FILTRADO Y MENÚ DESPLEGABLE (NUEVO)
   ========================================= */

let selectedCategory = "Todas";

// A. RENDERIZAR MENÚ CON CONTADORES
function renderCategoryMenu() {
    // Intentamos buscar por ID o por Clase para no fallar
    const container = document.getElementById('categoryContainer') || document.querySelector('.category-list');
    
    if (!container) {
        console.warn("El contenedor de categorías no existe en el DOM aún.");
        return;
    }

    const categoriasList = ["Todas", ...Object.values(CATEGORIAS)];
    
    // Generamos el contenido
    const htmlBotones = categoriasList.map(cat => {
        const count = cat === "Todas" 
            ? products.length 
            : products.filter(p => p.category === cat).length;

        const isActive = cat === selectedCategory ? 'active' : '';

        return `
            <button class="cat-btn ${isActive}" onclick="selectCategory('${cat}')">
                <span class="cat-name">${cat}</span>
                <span class="cat-count">${count}</span>
            </button>
        `;
    }).join('');

    // Inyectamos el contenido
    container.innerHTML = htmlBotones;
    console.log("¡Categorías renderizadas con éxito!");
}

// B. ABRIR / CERRAR MENÚ
function toggleCategoryMenu() {
    const nav = document.getElementById('categoryNav');
    const arrow = document.getElementById('menuArrow');
    
    // Esto alterna la clase "open" que definimos en el CSS arriba
    nav.classList.toggle('open');
    if (arrow) arrow.classList.toggle('arrow-rotate');
}

// C. SELECCIONAR CATEGORÍA
function selectCategory(category) {
    selectedCategory = category;
    
    // 1. Filtrar productos
    runCombinedFilter();
    
    // 2. Actualizar texto del botón principal (Dropdown)
    const btnText = document.querySelector('.dropdown-toggle span');
    if(btnText) btnText.innerHTML = `<i class="ri-function-line"></i> ${category}`;

    // 3. Cerrar el menú
    const nav = document.getElementById('categoryNav');
    const arrow = document.getElementById('menuArrow');
    if(nav) nav.classList.remove('open');
    if(arrow) arrow.classList.remove('arrow-rotate');
    
    // 4. Re-renderizar menú para actualizar la clase "active" (color de fondo)
    renderCategoryMenu(); 
}

// D. FILTRADO PRINCIPAL (Busqueda + Categoría)
function runCombinedFilter() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    
    const filtered = products.filter(product => {
        const matchesCategory = (selectedCategory === "Todas" || product.category === selectedCategory);
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        return matchesCategory && matchesSearch;
    });

    renderProducts(filtered);
    
    // Mostrar mensaje si no hay resultados
    const grid = document.getElementById('productGrid');
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="ri-search-eye-line" style="font-size: 3rem; color: #ccc;"></i>
                <p>No encontramos productos en esta categoría con ese nombre.</p>
            </div>
        `;
    }
}

// E. EVENT LISTENERS DE FILTROS

// Buscar al escribir
const searchInputEl = document.getElementById('searchInput');
if (searchInputEl) {
    searchInputEl.addEventListener('input', runCombinedFilter);
}

// Limpiar búsqueda
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = "";
        runCombinedFilter();
    }
}

// F. CERRAR MENÚ AL HACER CLIC FUERA (UX PRO)
window.addEventListener('click', function(e) {
    const container = document.querySelector('.category-dropdown-container');
    const nav = document.getElementById('categoryNav');
    const arrow = document.getElementById('menuArrow');
    
    // Si el clic NO fue dentro del contenedor del menú...
    if (container && !container.contains(e.target)) {
        if(nav) nav.classList.remove('open');
        if(arrow) arrow.classList.remove('arrow-rotate');
    }
});

setTimeout(renderCategoryMenu, 500);