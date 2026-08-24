const express = require("express"); const session = require("express-session"); const multer = require("multer"); const bcrypt = require("bcryptjs"); const path = require("path"); const fs = require("fs");
const app = express(); const PORT = 3000;
const uploadDir = path.join(__dirname, "uploads"); if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const dataFile = path.join(__dirname, "data.json"); if (!fs.existsSync(dataFile)) { const initialData = { adminPasswordHash: bcrypt.hashSync("admin123", 10), products: [ { id: 1, title: "Кабель ВВГнг-LS 3х2.5", brand: "ВВГнг-LS", cores: 3, section: "2.5", material: "Медь", price: 12.50, unit: "сом/м", description: "Силовой кабель для внутренней проводки, негорючий.", image: "https://via.placeholder.com/300x200?text=Кабель+ВВГ" } ] }; fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2)); }
function getData() { return JSON.parse(fs.readFileSync(dataFile)); }
function saveData(data) { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); }
const storage = multer.diskStorage({ destination: (req, file, cb) => cb(null, uploadDir), filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) }); const upload = multer({ storage });
app.use(express.json()); app.use(express.urlencoded({ extended: true })); app.use("/uploads", express.static(uploadDir));
app.use(session({ secret: "kabel_super_secret_key", resave: false, saveUninitialized: false, cookie: { maxAge: 3600000 * 24 } }));
function checkAuth(req, res, next) { if (req.session.isAdmin) next(); else res.status(401).json({ error: "Auth error" }); }
app.get("/api/products", (req, res) => { const { search, brand, cores, material } = req.query; let { products } = getData();
if (search) { const q = search.toLowerCase(); products = products.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)); } if (brand) products = products.filter(p => p.brand === brand); if (cores) products = products.filter(p => String(p.cores) === String(cores)); if (material) products = products.filter(p => p.material === material);
res.json(products); });
app.post("/api/login", (req, res) => { const { password } = req.body; if (bcrypt.compareSync(password, getData().adminPasswordHash)) { req.session.isAdmin = true; res.json({ success: true }); } else { res.status(400).json({ error: "Неверный пароль" }); } });
app.post("/api/logout", (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.post("/api/products/save", checkAuth, upload.single("image"), (req, res) => { const data = getData(); const { id, title, brand, cores, section, material, price, unit, description } = req.body; let imageUrl = req.file ? "/uploads/" + req.file.filename : null;
if (id) { const idx = data.products.findIndex(p => p.id == id); if (idx !== -1) { data.products[idx] = { ...data.products[idx], title, brand, cores: Number(cores), section, material, price: Number(price), unit, description, image: imageUrl || data.products[idx].image }; } } else { data.products.push({ id: Date.now(), title, brand, cores: Number(cores), section, material, price: Number(price), unit, description, image: imageUrl || "https://via.placeholder.com/300x200?text=Нет+Фото" }); }
saveData(data); res.json({ success: true }); });
app.delete("/api/products/:id", checkAuth, (req, res) => { const data = getData(); data.products = data.products.filter(p => p.id != req.params.id); saveData(data); res.json({ success: true }); });
app.get("*", (req, res) => { res.send(`<!DOCTYPE html>
const burgerBtn = document.getElementById('burgerBtn');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
function toggleMenu() {
  sideMenu.classList.toggle('active');
  overlay.classList.toggle('active');
}
if (burgerBtn) burgerBtn.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

async function loadProducts() {
  const search = document.getElementById("searchInput").value;
  const brand = document.getElementById("filterBrand").value;
  const cores = document.getElementById("filterCores").value;
  const material = document.getElementById("filterMaterial").value;
  const res = await fetch("/api/products?" + new URLSearchParams({ search, brand, cores, material }));
  const products = await res.json();
  document.getElementById("productsGrid").innerHTML = products.map(p => \`
    <div class="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm hover:shadow-md transition">
      <div class="h-48 bg-[#F9F6F0] flex items-center justify-center overflow-hidden">
        <img src="\${p.image}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/300x200?text=Кабель'">
      </div>
      <div class="p-5">
        <span class="text-xs font-semibold uppercase tracking-wider text-[#D97706]">\${p.material}</span>
        <h3 class="text-lg font-bold text-[#1A1A1A] mt-1">\${p.title}</h3>
        <p class="text-xs text-gray-500 mt-1">\${p.description}</p>
        <div class="mt-4 flex items-baseline justify-between">
          <div>
            <span class="text-2xl font-black text-[#1A1A1A]">\${p.price}</span>
            <span class="text-sm text-gray-500"> \${p.unit}</span>
          </div>
          <button onclick="alert('Для заказа свяжитесь с продавцом')" class="bg-[#2D3748] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#1A1A1A] transition">Заказать</button>
        </div>
      </div>
    </div>
  \`).join("");
  if (isAdmin) renderAdminList(products);
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
  document.getElementById("pUnit").value = p.unit;
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
app.listen(PORT, '0.0.0.0', () => console.log('Сайт запущен на http://localhost:' + PORT));
