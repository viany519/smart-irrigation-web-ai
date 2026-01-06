// ======================
// Greenpulse Prototype (localStorage auth + plants + profile)
// ======================

const GP_KEYS = {
  users: "gp_users",
  session: "gp_session",
};

function loadUsers() {
  return JSON.parse(localStorage.getItem(GP_KEYS.users) || "[]");
}
function saveUsers(users) {
  localStorage.setItem(GP_KEYS.users, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(GP_KEYS.session) || "null");
}
function setSession(email) {
  localStorage.setItem(GP_KEYS.session, JSON.stringify({ email }));
}
function clearSession() {
  localStorage.removeItem(GP_KEYS.session);
}

function normEmail(email) {
  return (email || "").trim().toLowerCase();
}

function findUserByEmail(email) {
  const users = loadUsers();
  const e = normEmail(email);
  return users.find(u => normEmail(u.email) === e);
}

function updateUser(updatedUser) {
  const users = loadUsers();
  const idx = users.findIndex(u => normEmail(u.email) === normEmail(updatedUser.email));
  if (idx >= 0) {
    users[idx] = updatedUser;
    saveUsers(users);
  }
}

function replaceUserEmail(oldEmail, newEmail) {
  const users = loadUsers();
  const oldE = normEmail(oldEmail);
  const newE = normEmail(newEmail);

  const exists = users.some(u => normEmail(u.email) === newE);
  if (exists) return { ok: false, message: "Email baru sudah dipakai user lain." };

  const idx = users.findIndex(u => normEmail(u.email) === oldE);
  if (idx < 0) return { ok: false, message: "User tidak ditemukan." };

  users[idx].email = newEmail;
  saveUsers(users);

  // update session biar tetap login
  setSession(newEmail);
  return { ok: true };
}

function getCurrentUser() {
  const sess = getSession();
  if (!sess?.email) return null;
  return findUserByEmail(sess.email);
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "./login.html";
    return false;
  }
  return true;
}

// ===== UI: active sidebar =====
function setActiveNav() {
  const file = (location.pathname.split("/").pop() || "").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a => {
    const target = (a.getAttribute("href") || "").toLowerCase();
    a.classList.toggle("active", target === file);
  });
}

// ===== UI: hydrate user (ALL occurrences) =====
function hydrateUserUI() {
  const user = getCurrentUser();
  if (!user) return;

  document.querySelectorAll("[data-user-name]").forEach(el => {
    el.textContent = user.name || "User";
  });

  document.querySelectorAll("[data-user-email]").forEach(el => {
    el.textContent = user.email || "-";
  });

  const fallback = "./assets/avatar-default.png";
  document.querySelectorAll("[data-user-photo]").forEach(img => {
    img.src = user.photo || fallback;
  });
}

// ===== Logout =====
function bindLogout() {
  const el = document.querySelector("[data-logout]");
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    clearSession();
    window.location.href = "./login.html";
  });
}

// ===== Clock =====
function initClock() {
  const el = document.querySelector("[data-clock]");
  if (!el) return;

  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    el.textContent = `${hh} : ${mm} : ${ss}`;
  };

  tick();
  setInterval(tick, 1000);
}

// ======================
// Plants (stored per user)
// ======================

function ensureUserDefaults(user) {
  // supaya user lama tetap kompatibel
  if (!Array.isArray(user.plants)) user.plants = [];
  if (user.selectedPlantId === undefined) user.selectedPlantId = null;

  // biodata tambahan
  if (user.country === undefined) user.country = "";
  if (user.city === undefined) user.city = "";
  if (user.about === undefined) user.about = "";
  if (user.units === undefined) user.units = "metric"; // metric/imperial
  return user;
}

function saveUserWithDefaults(user) {
  user = ensureUserDefaults(user);
  // update by email (yang sekarang)
  updateUser(user);
}

function getPlants() {
  const user = getCurrentUser();
  if (!user) return [];
  ensureUserDefaults(user);
  return user.plants;
}

function getSelectedPlant() {
  const user = getCurrentUser();
  if (!user) return null;
  ensureUserDefaults(user);
  if (!user.selectedPlantId) return null;
  return user.plants.find(p => p.id === user.selectedPlantId) || null;
}

function setSelectedPlant(id) {
  const user = getCurrentUser();
  if (!user) return { ok: false, message: "Belum login." };
  ensureUserDefaults(user);

  const found = user.plants.find(p => p.id === id);
  if (!found) return { ok: false, message: "Plant tidak ditemukan." };

  user.selectedPlantId = id;
  saveUserWithDefaults(user);
  return { ok: true };
}

function addPlant(data) {
  const user = getCurrentUser();
  if (!user) return null;

  const plant = {
    id: Date.now().toString(),
    name: data.name || "",
    species: data.species || "",
    plantedOn: data.plantedOn || "",
    description: data.description || "",

    // tambahan:
    growth: data.growth || "Healthy — Growing steadily",
    minMoisture: Number.isFinite(data.minMoisture) ? data.minMoisture : 30,
    notes: data.notes || "",
    photo: data.photo || ""
  };

  user.plants.push(plant);
  user.selectedPlantId = plant.id;
  updateUser(user);
  return plant;
}


// ======================
// Dashboard render: show plant only if exists
// (butuh element id="emptyPlant" dan id="plantCard")
// ======================
function renderDashboardPlant() {
  const emptyEl = document.getElementById("emptyPlant");
  const plantEl = document.getElementById("plantCard");
  if (!emptyEl || !plantEl) return;

  const plant = getSelectedPlant();

  if (!plant) {
    emptyEl.hidden = false;
    plantEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  plantEl.hidden = false;

  // ✅ update foto plant di dashboard
const img = plantEl.querySelector("img"); // atau ganti ke selector khusus kalau kamu kasih atribut
if (img) {
  const raw = (plant.photo || plant.image || plant.img || "").toString().trim();

  const ok =
    raw.startsWith("data:image/") ||     // base64 dari FileReader
    raw.startsWith("./") ||              // relative path
    raw.startsWith("assets/") ||
    /^https?:\/\//.test(raw);            // url online

  img.src = ok ? raw : "./assets/basil.png"; // fallback
}


  // fill text
  const setText = (sel, val) => {
    const el = document.querySelector(sel);
    if (el) el.textContent = val ?? "";
  };

  setText("[data-plant-title]", `${plant.name}${plant.species ? ` (${plant.species})` : ""}`);
  setText("[data-plant-planted]", plant.plantedOn || "-");
  setText("[data-plant-desc]", plant.description || "-");
}

// ======================
// Auth API (prototype)
// ======================
window.GPAuth = {
  signUp: ({ name, email, password }) => {
    const users = loadUsers();
    const e = normEmail(email);

    const exists = users.some(u => normEmail(u.email) === e);
    if (exists) return { ok: false, message: "Email sudah terdaftar. Silakan sign in." };

    users.push({
      name: name?.trim() || "User",
      email: email?.trim() || "",
      password: password || "",
      photo: "",

      // biodata
      country: "",
      city: "",
      about: "",
      units: "metric",

      // plants
      plants: [],
      selectedPlantId: null
    });

    saveUsers(users);
    return { ok: true };
  },

  signIn: ({ email, password }) => {
    const user = findUserByEmail(email);
    if (!user) return { ok: false, message: "Akun belum ada. Kamu harus Sign up dulu." };
    if (user.password !== password) return { ok: false, message: "Password salah." };

    setSession(user.email);
    return { ok: true };
  },

  updatePhoto: async (file) => {
    const user = getCurrentUser();
    if (!user) return { ok: false, message: "Belum login." };
    ensureUserDefaults(user);

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    user.photo = dataUrl;
    saveUserWithDefaults(user);
    return { ok: true };
  }
};

// ======================
// Data/Profile API (prototype)
// ======================
window.GPData = {
  getCurrentUser,
  getPlants,
  getSelectedPlant,
  setSelectedPlant,
  addPlant,

  updateProfile: ({ name, email, country, city, about, units }) => {
    const user = getCurrentUser();
    if (!user) return { ok: false, message: "Belum login." };
    ensureUserDefaults(user);

    // update name, country, city, about, units
    user.name = (name ?? user.name).trim();
    user.country = (country ?? user.country).trim();
    user.city = (city ?? user.city).trim();
    user.about = (about ?? user.about).trim();
    user.units = units ?? user.units;

    // kalau email diganti: handle khusus biar tidak konflik
    const newEmail = (email ?? user.email).trim();
    if (normEmail(newEmail) !== normEmail(user.email)) {
      const res = replaceUserEmail(user.email, newEmail);
      if (!res.ok) return res;
      // setelah replace, user.email sudah berubah di storage,
      // tapi object "user" ini perlu diset juga:
      user.email = newEmail;
    }

    // save
    saveUserWithDefaults(user);
    return { ok: true };
  }
};

// ===== Boot =====
document.addEventListener("DOMContentLoaded", () => {
  const file = (location.pathname.split("/").pop() || "").toLowerCase();
  const publicPages = ["login.html", "signup.html"];

  if (!publicPages.includes(file)) {
    if (!requireAuth()) return;
  }

  setActiveNav();
  hydrateUserUI();
  bindLogout();
  initClock();

  // khusus dashboard: render plant/empty state
  renderDashboardPlant();
});

/* ===============================
   GPPlants (localStorage per user)
   Paste di paling bawah app.js
================================= */
(function () {
  function getSession() {
    try { return JSON.parse(localStorage.getItem("gp_session")); }
    catch { return null; }
  }

  function requireAuth() {
    const s = getSession();
    if (!s || !s.email) window.location.href = "./login.html";
    return s;
  }

  function keyPlants(email) { return `gp_plants_${email}`; }
  function keyActive(email) { return `gp_active_plant_${email}`; }
  function keyPump(email) { return `gp_pump_${email}`; }

  function readPlants(email) {
    try { return JSON.parse(localStorage.getItem(keyPlants(email))) || []; }
    catch { return []; }
  }
  function writePlants(email, plants) {
    localStorage.setItem(keyPlants(email), JSON.stringify(plants));
  }

  function upsertPlant(plant) {
    const s = requireAuth();
    const plants = readPlants(s.email);

    const idx = plants.findIndex(p => p.id === plant.id);
    if (idx >= 0) plants[idx] = plant;
    else plants.push(plant);

    writePlants(s.email, plants);
    localStorage.setItem(keyActive(s.email), plant.id);
    return plant;
  }

  function listPlants() {
    const s = requireAuth();
    return readPlants(s.email);
  }

  function getActivePlant() {
    const s = requireAuth();
    const plants = readPlants(s.email);
    const activeId = localStorage.getItem(keyActive(s.email));
    return plants.find(p => p.id === activeId) || plants[0] || null;
  }

  function setActivePlant(id) {
    const s = requireAuth();
    localStorage.setItem(keyActive(s.email), id);
  }

  function setPumpStatus(plantId, status) {
    const s = requireAuth();
    const all = JSON.parse(localStorage.getItem(keyPump(s.email)) || "{}");
    all[plantId] = status; // "ON" / "OFF"
    localStorage.setItem(keyPump(s.email), JSON.stringify(all));
  }

  function getPumpStatus(plantId) {
    const s = requireAuth();
    const all = JSON.parse(localStorage.getItem(keyPump(s.email)) || "{}");
    return all[plantId] || "OFF";
  }

  // Expose
  window.GPPlants = {
    requireAuth,
    upsertPlant,
    listPlants,
    getActivePlant,
    setActivePlant,
    setPumpStatus,
    getPumpStatus
  };
})();

/* ======================================================
   FIX HISTORY METRIC (AMAN, TIDAK RUSAK BAGIAN LAIN)
   ====================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // pastikan hanya jalan di halaman history
  if (!location.pathname.endsWith("history.html")) return;

  let currentMetric = "temp";

  const tbody = document.getElementById("tbody");
  const thValue = document.getElementById("thValue");
  const chartTitle = document.getElementById("chartTitle");
  const emptyState = document.getElementById("emptyState");

  if (!tbody || !thValue) return;

function getActivePlantIdByEmail(email) {
  return localStorage.getItem(`gp_active_plant_${email}`);
}

function getLogSafe() {
  try {
    const session = getSession();
    if (!session?.email) return [];

    const email = session.email;
    const plantId = getActivePlantIdByEmail(email);
    if (!plantId) return [];

    const key = `gp_history_${email}_${plantId}`;
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

window.renderHistoryByMetric = function () {
    const log = getLogSafe();
    tbody.innerHTML = "";

    thValue.textContent =
      currentMetric === "temp"  ? "Soil Temperature (°C)" :
      currentMetric === "moist" ? "Soil Moisture" :
                                  "Air Humidity (%)";

    chartTitle.textContent =
      currentMetric === "temp"  ? "Soil Temperature" :
      currentMetric === "moist" ? "Soil Moisture" :
                                  "Air Humidity";

    if (!log.length) {
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";

   log.slice(-10).reverse().forEach(r => {
  let value =
    currentMetric === "temp"
      ? `${r.soil_temperature} °C`
      : currentMetric === "moist"
      ? r.soil_moisture
      : `${r.air_humidity} %`;

 const tr = document.createElement("tr");
tr.innerHTML = `
  <td>${new Date(r.ts).toLocaleString()}</td>
  <td>${value}</td>
  <td>
    ${r.ai_need_water
      ? '<span class="badge need">Needs watering</span>'
      : '<span class="badge ok">Healthy</span>'}
  </td>
`;
tbody.appendChild(tr);


  renderSummaryAndDecision(log);

});

  }

  // TAB CLICK (INI KUNCI)
  document.querySelectorAll(".pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentMetric = btn.dataset.metric; // temp | moist | hum
      renderHistoryByMetric();
    });
  });

  // render awal
  renderHistoryByMetric();
});
function renderSummaryAndDecision(log) {
  if (!log.length) return;

  const last = log[log.length - 1];
  const plant = getSelectedPlant?.();

  document.getElementById("sumPlant").textContent =
    `Plant: ${plant?.name || "—"}`;

  document.getElementById("sumCount").textContent =
    `Records: ${log.length}`;

  document.getElementById("sumLast").textContent =
    `Last update: ${new Date(last.ts).toLocaleString()}`;

  document.getElementById("sumNeed").textContent =
    last.ai_need_water ? "Yes" : "No";

  document.getElementById("sumProb").textContent =
    Math.round(last.ai_probability * 100) + "%";

}



// ===== Sidebar auto-active based on data-page =====
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (!page) return;

  document.querySelectorAll("[data-nav]").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (href.includes(page)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});






//buat notif
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector(".search");
  if (!searchInput) return;

  searchInput.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;

    const keyword = searchInput.value.trim();
    if (!keyword) return;

    // simpan keyword
    localStorage.setItem("searchPlant", keyword);

    // pindah ke history
    window.location.href = "./history.html";
  });
});

// ===== kode lama kamu =====
// sidebar
// navbar
// active menu
// dll
// (SEMUA BIARIN, JANGAN DIUBAH)


/* ======================================================
   DASHBOARD ↔ MONITORING ADAPTER (READ ONLY)
   TIDAK MENYENTUH MONITORING
====================================================== */

(function dashboardMonitoringAdapter() {

  function getSessionSafe() {
    try {
      return JSON.parse(localStorage.getItem("gp_session"));
    } catch {
      return null;
    }
  }

  function getActivePlantId(email) {
    return (
      localStorage.getItem(`gp_active_plant_${email}`) ||
      JSON.parse(localStorage.getItem("gp_users") || "[]")
        .find(u => u.email === email)?.selectedPlantId ||
      null
    );
  }

  function readMonitoringSensor(email, plantId) {
    try {
      return JSON.parse(
        localStorage.getItem(`gp_sensor_${email}_${plantId}`) || "null"
      );
    } catch {
      return null;
    }
  }

  function updateDashboardMonitoring() {
    const session = getSessionSafe();
    if (!session?.email) return;

    const email = session.email;
    const plantId = getActivePlantId(email);
    if (!plantId) return;

    const sensor = readMonitoringSensor(email, plantId);
    if (!sensor) return;

    // === MAP DATA KE DASHBOARD ===
    setText("[data-moist]", sensor.moistPct);
    setText("[data-temp]", sensor.tempC);
    setText("[data-hum]", sensor.humPct);
    setText("[data-atemp]", sensor.tempC);

    // simpan telemetry versi dashboard (biar AI & reminder hidup)
    localStorage.setItem(
      `gp:telemetry:${email}:${plantId}`,
      JSON.stringify({
        soilMoisture: sensor.moistPct,
        soilTemperature: sensor.tempC,
        airHumidity: sensor.humPct,
        ts: sensor.ts
      })
    );

    localStorage.setItem(
      "gp:telemetry:last",
      JSON.stringify({
        soilMoisture: sensor.moistPct,
        soilTemperature: sensor.tempC,
        airHumidity: sensor.humPct,
        ts: sensor.ts
      })
    );
  }

  // helper aman
  function setText(sel, val) {
    document.querySelectorAll(sel).forEach(el => {
      el.textContent = val ?? "—";
    });
  }

  document.addEventListener("DOMContentLoaded", updateDashboardMonitoring);
  window.addEventListener("storage", updateDashboardMonitoring);

})();



function renderNotifications() {
  const tbody = document.getElementById("notifBody");
  const empty = document.getElementById("notifEmpty");
  if (!tbody) return;

  const session = JSON.parse(localStorage.getItem("gp_session"));
  if (!session?.email) return;

  const notifKey = `gp_notifications_${session.email}`;
  const notifs = JSON.parse(localStorage.getItem(notifKey) || "[]");

  tbody.innerHTML = "";

  if (!notifs.length) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  notifs.slice().reverse().forEach(n => {
    const kondisi =
      n.type === "NEED_WATER"
        ? `<span class="badge need">Needs watering</span>`
        : `<span class="badge ok">Healthy</span>`;

    const aktivitas = n.user_watered
      ? `💧 Disiram (${new Date(n.user_watered_at).toLocaleTimeString()})`
      : `Belum disiram`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${n.plantName}</b></td>
      <td>${new Date(n.ts).toLocaleString()}</td>
      <td>${kondisi}</td>
      <td>${aktivitas}</td>
    `;
    tbody.appendChild(tr);
  });
}


document.addEventListener("DOMContentLoaded", renderNotifications);
window.addEventListener("storage", renderNotifications);

function logHistory(sensor, aiResult) {
  const session = JSON.parse(localStorage.getItem("gp_session"));
  if (!session?.email) return;

  const user = getCurrentUser();
  if (!user || !user.selectedPlantId) return;

  const plantId = user.selectedPlantId;
  const key = `gp_history_${session.email}_${plantId}`;

  const history = JSON.parse(localStorage.getItem(key) || "[]");

  history.push({
    ts: Date.now(),
    soil_temperature: sensor.soil_temperature,
    soil_moisture: sensor.soil_moisture,
    air_humidity: sensor.air_humidity,

    ai_need_water: aiResult.need_water,
    ai_probability: aiResult.probability,

    user_watered: false,
    user_watered_at: null
  });

  localStorage.setItem(key, JSON.stringify(history));
}
