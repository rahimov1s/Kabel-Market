 const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = 3000;
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const dataFile = path.join(__dirname, "data.json");
if (!fs.existsSync(dataFile)) {
  const initialData = {
    adminPasswordHash: bcrypt.hashSync("admin123", 10),
    products: [
      {
        id: 1,
        title: "Кабель ВВГнг-LS 3х2.5",
        brand: "ВВГнг-LS",
        cores: 3,
        section: "2.5",
        material: "Медь",
        price: 12.50,
        unit: "сом/м",
        description: "Силовой кабель для внутренней проводки, негорючий. Предназначен для передачи и распределения электроэнергии в стационарных установках на номинальное переменное напряжение 0,66 кВ или 1 кВ.",
        image: "https://via.placeholder.com/300x200?text=Кабель+ВВГ"
      }
    ]
  };
  fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
}
function getData() {
  return JSON.parse(fs.readFileSync(dataFile));
}
function saveData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(session({
  secret: "kabel_super_secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 * 24 }
}));
function checkAuth(req, res, next) {
  if (req.session.isAdmin) next();
  else res.status(401).json({ error: "Auth error" });
}
app.get("/api/products", (req, res) => {
  const { search, brand, cores, material } = req.query;
  let { products } = getData();
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (brand) products = products.filter(p => p.brand === brand);
  if (cores) products = products.filter(p => String(p.cores) === String(cores));
  if (material) products = products.filter(p => p.material === material);
  res.json(products);
});
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, getData().adminPasswordHash)) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Неверный пароль" });
  }
});
app.post("/api/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});
app.post("/api/products/save", checkAuth, upload.single("image"), (req, res) => {
  const data = getData();
  const { id, title, brand, cores, section, material, price, unit, description } = req.body;
  let imageUrl = req.file ? "/uploads/" + req.file.filename : null;
  if (id) {
    const idx = data.products.findIndex(p => p.id == id);
    if (idx !== -1) {
      data.products[idx] = {
        ...data.products[idx],
        title, brand, cores: Number(cores), section, material, price: Number(price), unit, description,
        image: imageUrl || data.products[idx].image
      };
    }
  } else {
    data.products.push({
      id: Date.now(),
      title, brand, cores: Number(cores), section, material, price: Number(price), unit, description,
      image: imageUrl || "https://via.placeholder.com/300x200?text=Нет+Фото"
    });
  }
  saveData(data);
  res.json({ success: true });
});
app.delete("/api/products/:id", checkAuth, (req, res) => {
  const data = getData();
  data.products = data.products.filter(p => p.id != req.params.id);
  saveData(data);
  res.json({ success: true });
});
app.get("*", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
 <title>Каталог Кабельной Продукции</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#FDFBF7] text-[#2D3748] font-sans antialiased min-h-screen">
  <header class="bg-white border-b border-[#E5E7EB] sticky top-0 z-40 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <button onclick="toggleMenu()" class="p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none flex flex-col justify-between w-9 h-9 items-center justify-center">
          <div class="w-5 h-0.5 bg-[#2D3748] mb-1"></div>
          <div class="w-5 h-0.5 bg-[#2D3748] mb-1"></div>
          <div class="w-5 h-0.5 bg-[#2D3748]"></div>
        </button>
        <div class="flex items-center space-x-2 cursor-pointer" onclick="resetFilters()">
          <div class="w-9 h-9 bg-[#D97706] rounded-xl flex items-center justify-center text-white font-bold text-xl">Э</div>
          <span class="text-xl font-bold tracking-tight text-[#1A1A1A]">ЭлектроКабель</span>
        </div>
      </div>
      <div class="flex-1 max-w-xl">
        <input type="text" id="searchInput" oninput="loadProducts()" placeholder="Поиск кабеля (название, марка)..." class="w-full px-4 py-2 bg-[#F9F6F0] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97706] transition">
      </div>
      <div class="flex items-center gap-3">
        <button onclick="toggleCartModal()" class="relative px-3 py-2 text-sm font-medium text-[#2D3748] border border-[#E5E7EB] bg-[#F9F6F0] rounded-lg hover:bg-gray-100 transition flex items-center gap-2">
          🛒 Корзина <span id="cartBadge" class="bg-[#D97706] text-white px-2 py-0.5 rounded-full text-xs font-bold">0</span>
        </button>
        <button onclick="toggleContactModal()" class="px-3 py-2 text-sm font-medium text-white bg-[#D97706] rounded-lg hover:bg-[#B45309] transition">Связаться</button>
        <button onclick="toggleAdminModal()" class="px-3 py-2 text-sm font-medium text-[#D97706] border border-[#D97706] rounded-lg hover:bg-[#D97706] hover:text-white transition">Админ</button>
      </div>
    </div>
  </header>

  <!-- Бургер-меню -->
  <div id="menuOverlay" onclick="toggleMenu()" class="fixed inset-0 bg-black/40 z-50 hidden transition-opacity"></div>
  <div id="sideMenu" class="fixed top-0 left-[-300px] w-72 h-full bg-white shadow-2xl z-50 transition-all duration-300 p-6 flex flex-col">
    <div class="flex justify-between items-center mb-6">
      <span class="text-lg font-bold text-[#1A1A1A]">Меню</span>
      <button onclick="toggleMenu()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
    </div>
    <div class="flex flex-col space-y-3">
      <a href="#" onclick="toggleCartModal(); toggleMenu();" class="p-3 rounded-xl hover:bg-[#F9F6F0] font-medium transition flex items-center gap-3">🛒 Корзина</a>
      <a href="#" onclick="toggleContactModal(); toggleMenu();" class="p-3 rounded-xl hover:bg-[#F9F6F0] font-medium transition flex items-center gap-3">📞 Связаться с оператором</a>
      <hr class="my-2 border-gray-100">
      <a href="#" onclick="toggleAdminModal(); toggleMenu();" class="p-3 rounded-xl hover:bg-[#F9F6F0] text-[#D97706] font-medium transition flex items-center gap-3">⚙️ Панель Админа</a>
    </div>
  </div>

  <main class="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
    <aside class="w-full md:w-64 bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm h-fit">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-bold text-[#1A1A1A]">Фильтры</h2>
        <button onclick="resetFilters()" class="text-xs text-[#D97706] hover:underline">Сбросить</button>
      </div>
      <div class="mb-5">
        <label class="block text-sm font-semibold mb-2">Марка</label>
        <select id="filterBrand" onchange="loadProducts()" class="w-full p-2 bg-[#F9F6F0] border border-[#E5E7EB] rounded-lg text-sm">
          <option value="">Все марки</option>
 <option value="ВВГнг-LS">ВВГнг-LS</option>
          <option value="ПВС">ПВС</option>
          <option value="СИП">СИП</option>
          <option value="КГ">КГ</option>
        </select>
      </div>
      <div class="mb-5">
        <label class="block text-sm font-semibold mb-2">Количество жил</label>
        <select id="filterCores" onchange="loadProducts()" class="w-full p-2 bg-[#F9F6F0] border border-[#E5E7EB] rounded-lg text-sm">
          <option value="">Все</option>
          <option value="2">2 жилы</option>
          <option value="3">3 жилы</option>
          <option value="4">4 жилы</option>
          <option value="5">5 жил</option>
        </select>
      </div>
      <div class="mb-5">
        <label class="block text-sm font-semibold mb-2">Материал</label>
        <select id="filterMaterial" onchange="loadProducts()" class="w-full p-2 bg-[#F9F6F0] border border-[#E5E7EB] rounded-lg text-sm">
          <option value="">Все</option>
          <option value="Медь">Медь</option>
          <option value="Алюминий">Алюминий</option>
        </select>
      </div>
    </aside>
    <section class="flex-1">
      <div id="productsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </section>
  </main>

  <!-- Модальное окно товара (Описание) -->
  <div id="productModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-xl border border-[#E5E7EB] shadow-xl relative">
      <button onclick="toggleProductModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
      <div id="modalProductContent"></div>
    </div>
  </div>

  <!-- Модальное окно Корзины -->
  <div id="cartModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-lg border border-[#E5E7EB] shadow-xl relative max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Ваша корзина</h2>
        <button onclick="toggleCartModal()" class="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
      </div>
      <div id="cartItemsList" class="flex-1 overflow-y-auto space-y-3 mb-4 divide-y"></div>
      <div class="border-t pt-4">
        <div class="flex justify-between text-lg font-bold mb-4">
          <span>Итого:</span>
          <span id="cartTotalPrice">0 сом</span>
        </div>
        <button onclick="checkoutCart()" class="w-full py-3 bg-[#D97706] text-white rounded-xl font-bold hover:bg-[#B45309] transition">Оформить заказ</button>
      </div>
    </div>
  </div>

  <!-- Модальное окно Связь с оператором -->
  <div id="contactModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md border border-[#E5E7EB] shadow-xl relative text-center">
      <button onclick="toggleContactModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
      <div class="w-12 h-12 bg-[#D97706]/10 text-[#D97706] rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold">📞</div>
      <h3 class="text-xl font-bold mb-2">Связаться с оператором</h3>
      <p class="text-sm text-gray-500 mb-6">Выберите удобный номер для звонка или консультации:</p>
      <div class="space-y-3">
        <a href="tel:+992303838383" class="block w-full py-3 bg-[#F9F6F0] border border-[#E5E7EB] rounded-xl font-bold text-lg text-[#1A1A1A] hover:bg-gray-100 transition">+992 303838383</a>
        <a href="tel:+992918667474" class="block w-full py-3 bg-[#F9F6F0] border border-[#E5E7EB] rounded-xl font-bold text-lg text-[#1A1A1A] hover:bg-gray-100 transition">+992 918667474</a>
      </div>
    </div>
  </div>

  <!-- Модальное окно Админ-панели -->
 <div id="adminModal" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl p-6 w-full max-w-2xl border border-[#E5E7EB] shadow-xl max-h-[90vh] overflow-y-auto">
      <div id="loginSection">
        <h2 class="text-xl font-bold mb-4">Вход в Админ-панель</h2>
        <input type="password" id="adminPass" placeholder="Пароль (по умолч: admin123)" class="w-full p-3 border rounded-lg mb-4 bg-[#F9F6F0]">
        <div class="flex justify-end gap-2">
          <button onclick="toggleAdminModal()" class="px-4 py-2 border rounded-lg">Отмена</button>
          <button onclick="login()" class="px-4 py-2 bg-[#D97706] text-white rounded-lg">Войти</button>
        </div>
      </div>
      <div id="adminControlSection" class="hidden">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Управление товарами</h2>
          <button onclick="logout()" class="text-sm text-red-500 hover:underline">Выйти</button>
        </div>
        <form id="productForm" onsubmit="saveProduct(event)" class="space-y-4 mb-8 bg-[#F9F6F0] p-4 rounded-xl">
          <input type="hidden" id="pId">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" id="pTitle" placeholder="Название кабеля" required class="p-2 border rounded-lg bg-white">
            <input type="text" id="pBrand" placeholder="Марка" required class="p-2 border rounded-lg bg-white">
            <input type="number" id="pCores" placeholder="Кол-во жил" required class="p-2 border rounded-lg bg-white">
            <input type="text" id="pSection" placeholder="Сечение (напр. 2.5)" required class="p-2 border rounded-lg bg-white">
            <select id="pMaterial" class="p-2 border rounded-lg bg-white">
              <option value="Медь">Медь</option>
              <option value="Алюминий">Алюминий</option>
            </select>
            <div class="flex gap-2">
              <input type="number" step="0.01" id="pPrice" placeholder="Цена" required class="w-full p-2 border rounded-lg bg-white">
              <input type="text" id="pUnit" value="сом/м" required class="w-24 p-2 border rounded-lg bg-white">
            </div>
          </div>
          <textarea id="pDesc" placeholder="Описание и назначение" class="w-full p-2 border rounded-lg bg-white"></textarea>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Фотография товара</label>
            <input type="file" id="pImage" accept="image/*" class="w-full text-sm">
          </div>
          <button type="submit" class="w-full py-2 bg-[#D97706] text-white rounded-lg font-medium hover:bg-[#B45309]">Сохранить товар</button>
        </form>
        <h3 class="font-bold mb-2">Список товаров</h3>
        <div id="adminProductList" class="space-y-2"></div>
      </div>
    </div>
  </div>

  <script>
    let isAdmin = false;
    let cart = JSON.parse(localStorage.getItem('kabel_cart')) || [];
    let allProducts = [];

    updateCartBadge();

    function toggleMenu() {
      const menu = document.getElementById('sideMenu');
      const overlay = document.getElementById('menuOverlay');
      if (menu.style.left === '0px') {
        menu.style.left = '-300px';
        overlay.classList.add('hidden');
      } else {
        menu.style.left = '0px';
        overlay.classList.remove('hidden');
      }
    }

    function toggleCartModal() {
      renderCart();
      document.getElementById('cartModal').classList.toggle('hidden');
    }

    function toggleContactModal() {
      document.getElementById('contactModal').classList.toggle('hidden');
    }

    function toggleProductModal() {
      document.getElementById('productModal').classList.toggle('hidden');
    }

    async function loadProducts() {
      const search = document.getElementById("searchInput").value;
      const brand = document.getElementById("filterBrand").value;
      const cores = document.getElementById("filterCores").value;
      const material = document.
 getElementById("filterMaterial").value;
      const res = await fetch("/api/products?" + new URLSearchParams({ search, brand, cores, material }));
      allProducts = await res.json();
      
      document.getElementById("productsGrid").innerHTML = allProducts.map(p => \`
        <div class="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
          <div class="h-48 bg-[#F9F6F0] flex items-center justify-center overflow-hidden cursor-pointer" onclick="openProductDetails(\${p.id})">
            <img src="\${p.image}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x200?text=Кабель'">
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-[#D97706]">\${p.material} • Жилы: \${p.cores}</span>
              <h3 class="text-lg font-bold text-[#1A1A1A] mt-1 cursor-pointer hover:text-[#D97706]" onclick="openProductDetails(\${p.id})">\${p.title}</h3>
              <p class="text-xs text-gray-500 mt-1 line-clamp-2">\${p.description}</p>
            </div>
            <div class="mt-4 flex items-baseline justify-between pt-3 border-t">
              <div>
                <span class="text-2xl font-black text-[#1A1A1A]">\${p.price}</span>
                <span class="text-sm text-gray-500"> \${p.unit}</span>
              </div>
              <button onclick="addToCart(\${p.id})" class="bg-[#D97706] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#B45309] transition font-medium">В корзину</button>
            </div>
          </div>
        </div>
      \`).join("");
      if (isAdmin) renderAdminList(allProducts);
    }

    function openProductDetails(id) {
      const p = allProducts.find(item => item.id == id);
      if (!p) return;
      
      document.getElementById('modalProductContent').innerHTML = \`
        <div class="space-y-4">
          <img src="\${p.image}" class="w-full h-56 object-cover rounded-xl bg-[#F9F6F0]" onerror="this.src='https://via.placeholder.com/300x200?text=Кабель'">
          <div>
            <span class="text-xs font-semibold uppercase tracking-wider text-[#D97706]">\${p.material} • \${p.brand} • Жилы: \${p.cores} • Сечение: \${p.section}</span>
            <h2 class="text-2xl font-bold text-[#1A1A1A] mt-1">\${p.title}</h2>
          </div>
          <div class="bg-[#F9F6F0] p-4 rounded-xl">
            <h4 class="font-bold text-sm mb-1">Описание и назначение:</h4>
            <p class="text-sm text-gray-600">\${p.description || 'Описание отсутствует'}</p>
          </div>
          <div class="flex items-center justify-between pt-2">
            <div>
              <span class="text-3xl font-black text-[#1A1A1A]">\${p.price}</span>
              <span class="text-sm text-gray-500"> \${p.unit}</span>
            </div>
            <button onclick="addToCart(\${p.id}); toggleProductModal();" class="bg-[#D97706] text-white px-5 py-2.5 rounded-xl font-bold hover:bg-[#B45309] transition">Добавить в корзину</button>
          </div>
        </div>
      \`;
      toggleProductModal();
    }

    function addToCart(id) {
      const p = allProducts.find(item => item.id == id);
      if (!p) return;
      const existing = cart.find(item => item.id == id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ ...p, quantity: 1 });
      }
      saveCart();
      alert('Товар добавлен в корзину!');
    }

    function changeQuantity(id, delta) {
      const item = cart.find(i => i.id == id);
      if (!item) return;
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id != id);
      }
      saveCart();
      renderCart();
    }

    function saveCart() {
      localStorage.setItem('kabel_cart', JSON.stringify(cart));
      updateCartBadge();
    }

    function updateCartBadge() {
      const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
      document.getElementById('cartBadge').
 innerText = totalCount;
    }

    function renderCart() {
      const list = document.getElementById('cartItemsList');
      if (cart.length === 0) {
        list.innerHTML = \`<p class="text-center text-gray-500 py-8">Ваша корзина пуста</p>\`;
        document.getElementById('cartTotalPrice').innerText = '0 сом';
        return;
      }
      let total = 0;
      list.innerHTML = cart.map(item => {
        let itemSum = item.price * item.quantity;
        total += itemSum;
        return \`
          <div class="flex items-center justify-between py-3">
            <div>
              <h4 class="font-bold text-sm">\${item.title}</h4>
              <p class="text-xs text-gray-500">\${item.price} \${item.unit} за ед.</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center border rounded-lg overflow-hidden bg-[#F9F6F0]">
                <button onclick="changeQuantity(\${item.id}, -1)" class="px-2.5 py-1 text-sm font-bold hover:bg-gray-200">-</button>
                <span class="px-3 text-sm font-semibold">\${item.quantity}</span>
                <button onclick="changeQuantity(\${item.id}, 1)" class="px-2.5 py-1 text-sm font-bold hover:bg-gray-200">+</button>
              </div>
              <span class="font-bold text-sm min-w-[70px] text-right">\${itemSum.toFixed(2)} сом</span>
            </div>
          </div>
        \`;
      }).join('');
      document.getElementById('cartTotalPrice').innerText = total.toFixed(2) + ' сом';
    }

    function checkoutCart() {
      if (cart.length === 0) {
        alert('Корзина пуста!');
        return;
      }
      alert('Спасибо за заказ! Оператор свяжется с вами в ближайшее время для подтверждения.');
      cart = [];
      saveCart();
      toggleCartModal();
    }

    function resetFilters() {
      document.getElementById("searchInput").value = "";
      document.getElementById("filterBrand").value = "";
      document.getElementById("filterCores").value = "";
      document.getElementById("filterMaterial").value = "";
      loadProducts();
    }

    function toggleAdminModal() { document.getElementById("adminModal").classList.toggle("hidden"); }

    async function login() {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: document.getElementById("adminPass").value })
      });
      if (res.ok) {
        isAdmin = true;
        document.getElementById("loginSection").classList.add("hidden");
        document.getElementById("adminControlSection").classList.remove("hidden");
        loadProducts();
      } else alert("Неверный пароль");
    }

    async function logout() {
      await fetch("/api/logout", { method: "POST" });
      isAdmin = false;
      document.getElementById("loginSection").classList.remove("hidden");
      document.getElementById("adminControlSection").classList.add("hidden");
    }

    async function saveProduct(e) {
      e.preventDefault();
      const formData = new FormData();
      ["Id","Title","Brand","Cores","Section","Material","Price","Unit","Desc"].forEach(k => formData.append(k.toLowerCase(), document.getElementById("p"+k).value));
      if (document.getElementById("pImage").files[0]) formData.append("image", document.getElementById("pImage").files[0]);
      const res = await fetch("/api/products/save", { method: "POST", body: formData });
      if (res.ok) {
        document.getElementById("productForm").reset();
        document.getElementById("pId").value = "";
        loadProducts();
      }
    }

    function editProduct(p) {
      document.getElementById("pId").value = p.id;
      document.getElementById("pTitle").value = p.title;
      document.getElementById("pBrand").value = p.brand;
      document.getElementById("pCores").value = p.cores;
      document.getElementById("pSection").value = p.section;
      document.getElementById("pMaterial").value = p.material;
      document.getElementById("pPrice").value = p.price;
      document.
 getElementById("pUnit").value = p.unit;
      document.getElementById("pDesc").value = p.description;
    }

    async function deleteProduct(id) {
      if (confirm("Удалить товар?")) {
        await fetch("/api/products/" + id, { method: "DELETE" });
        loadProducts();
      }
    }

    function renderAdminList(products) {
      document.getElementById("adminProductList").innerHTML = products.map(p => \`
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm">
          <span>\${p.title} - <b>\${p.price} \${p.unit}</b></span>
          <div class="flex gap-2">
            <button onclick='editProduct(\${JSON.stringify(p)})' class="text-blue-600 hover:underline">Изм.</button>
            <button onclick="deleteProduct(\${p.id})" class="text-red-600 hover:underline">Уд.</button>
          </div>
        </div>
      \`).join("");
    }

    loadProducts();
  </script>
</body>
</html>`);
});

app.listen(PORT, '0.0.0.0', () => console.log('Сайт запущен на http://localhost:' + PORT));