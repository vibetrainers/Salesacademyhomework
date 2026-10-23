// Домашние задания: статический сайт (GitHub Pages) + Supabase.
// Все данные идут через функции базы (supabase/schema.sql): участник передаёт свой код, админ — пароль.

// Уроки 1–6 — уровень MASTER, 7–12 — EXPERT (номер урока внутри уровня — num)
const LEVELS = {
  master: { name: "MASTER", description: "Базовый уровень · уверенная работа с клиентом и эффективные продажи" },
  expert: { name: "EXPERT", description: "Продвинутый уровень · сложные продажи, экспертность и влияние" },
};

const LESSONS = [
  { id: 1, level: "master", num: 1, description: "Понимание клиента и выявление потребностей", textOnly: true,
    homework: ["Разобрать 2 реальных диалога из своей практики", "Подготовить список уточняющих вопросов для типовых ситуаций"] },
  { id: 2, level: "master", num: 2, description: "Презентация решений и аргументация",
    homework: ["Подготовить короткую презентацию одобренного решения по шаблону", "Практика: записать и разобрать свой диалог (аудио/текст)"] },
  { id: 3, level: "master", num: 3, description: "Работа с возражениями",
    homework: ["Выбрать 3 сложных возражения из своей практики", "Подготовить варианты ответов и отработать их на практике"] },
  { id: 4, level: "master", num: 4, description: "Завершение сделки и следующий шаг",
    homework: ["Разобрать 1 случай с одобренным кредитом: как довести клиента до принятия решения", "Составить план сопровождения клиента после встречи"] },
  { id: 5, level: "master", num: 5, description: "Клиентский сервис и лояльность",
    homework: ["Найти 1 ситуацию, где клиенту не подошёл основной продукт", "Предложить альтернативное решение и описать результат/выводы"] },
  { id: 6, level: "master", num: 6, description: "Практика и разбор кейсов",
    homework: ["Подготовить кейс из своей практики (успешный или сложный)", "Выявить, что можно было сделать иначе, и сформулировать 3 ключевых инсайта"] },
  { id: 7, level: "expert", num: 1, description: "Сложные продажи и комплексные решения",
    homework: ["Разобрать сложный кейс (много продуктов / особые условия)", "Подготовить предложение комплексного решения"] },
  { id: 8, level: "expert", num: 2, description: "Финансовые решения и продуктовая экспертиза",
    homework: ["Изучить и сравнить 2–3 продукта Банка и конкурентов", "Подготовить рекомендации для клиента с разными сценариями"] },
  { id: 9, level: "expert", num: 3, description: "Переговоры и достижение договорённостей",
    homework: ["Разобрать свой переговорный кейс по шаблону", "Подготовить план переговоров"] },
  { id: 10, level: "expert", num: 4, description: "Эмоциональный интеллект и влияние в коммуникации",
    homework: ["Проанализировать свою реакцию в сложной ситуации", "Применить 2 техники управления эмоциями и описать результат"] },
  { id: 11, level: "expert", num: 5, description: "Омниканальный клиентский опыт и цифровые инструменты",
    homework: ["Использовать цифровой инструмент в своей работе", "Найти точку улучшения в клиентском пути и предложить решение"] },
  { id: 12, level: "expert", num: 6, description: "Экспертность в продукте и создание ценности",
    homework: ["Подготовить мини-консультацию для клиента (финансовый план / персональная рекомендация)", "Защитить решение на финальной сессии"] },
].map((l) => ({ ...l, title: `Урок ${l.num}`, label: `${LEVELS[l.level].name} · Урок ${l.num}` }));

const MAX_FILE_MB = 10;
const ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.mp3,.m4a,.aac,.wav,.ogg";
const TZ = "Asia/Almaty";

const { supabaseUrl: API, supabaseKey: KEY } = window.APP_CONFIG || {};
const app = document.getElementById("app");

const store = {
  get: (k, s = localStorage) => { try { return s.getItem(k); } catch { return null; } },
  set: (k, v, s = localStorage) => { try { v == null ? s.removeItem(k) : s.setItem(k, v); } catch {} },
};

const state = {
  code: store.get("dz_code"),
  filePrefix: store.get("dz_prefix"),
  tab: store.get("dz_tab") === "expert" ? "expert" : "master",
  adminPassword: store.get("dz_admin", sessionStorage),
  config: { branches: [], products: [], deadlines: {} },
  answers: [],
};

// ---------- Помощники ----------

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lessonById = (id) => LESSONS.find((l) => l.id === Number(id));
const lessonsOf = (level) => LESSONS.filter((l) => l.level === level);
const levelOptions = (selected = "") =>
  Object.entries(LEVELS).map(([k, v]) => `<option value="${k}" ${k === selected ? "selected" : ""}>${v.name}</option>`).join("");
const lessonOptions = () =>
  Object.entries(LEVELS).map(([k, v]) => `<optgroup label="${v.name}">${lessonsOf(k).map((l) => `<option value="${l.id}">${esc(l.title)} — ${esc(l.description)}</option>`).join("")}</optgroup>`).join("");
const formatDate = (iso) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const formatFull = (iso) => new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const formatDay = (iso) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: TZ });
const prettyCode = (c) => (c && c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c || "");
const fileUrl = (path) => `${API}/storage/v1/object/public/answers/${path.split("/").map(encodeURIComponent).join("/")}`;
const isAdmin = () => Boolean(state.adminPassword);

function deadlineOf(lessonId) {
  const iso = state.config.deadlines?.[lessonId];
  return iso ? { iso, passed: Date.now() > Date.parse(iso) } : null;
}

function toast(text) {
  const el = document.getElementById("toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 3500);
}

const ERRORS = {
  invalid_code: "Код не найден или отключён. Проверьте код или обратитесь к организатору.",
  invalid_password: "Неверный пароль.",
  deadline_passed: "Срок сдачи этого урока уже прошёл.",
  bad_branch: "Выберите филиал из списка.",
  bad_products: "Отметьте хотя бы один продукт.",
  empty_answer: "Напишите ответ или прикрепите файл.",
  lesson1_text_only: "В первом уроке ответ принимается только текстом.",
  text_too_long: "Слишком длинный ответ — сократите до 20 000 символов.",
  bad_file: "Не получилось прикрепить файл. Попробуйте ещё раз.",
  password_too_short: "Пароль должен быть не короче 8 символов.",
  bad_count: "Можно создать от 1 до 500 кодов за раз.",
};

async function rpc(fn, args = {}) {
  let res;
  try {
    res = await fetch(`${API}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
  }
  const body = await res.text();
  const data = body ? JSON.parse(body) : null;
  if (!res.ok) {
    const code = data?.message || "";
    if (code === "invalid_code" && state.code) logout();
    if (code === "invalid_password" && state.adminPassword) logout();
    const err = new Error(ERRORS[code] || "Что-то пошло не так. Попробуйте ещё раз.");
    err.code = code;
    throw err;
  }
  return data;
}

// Фото с телефона уменьшаем до ~1600px, чтобы не забивать хранилище
async function prepareFile(file) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function uploadFile(file) {
  const ext = (file.name.match(/\.(\w{1,5})$/)?.[1] || "bin").toLowerCase();
  const path = `${state.filePrefix}/${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`${API}/storage/v1/object/answers/${path}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!res.ok) {
    const msg = await res.text();
    if (/mime|type/i.test(msg)) throw new Error("Такой тип файла не принимается. Подойдут PDF, Word, PowerPoint, фото или аудио.");
    if (/size|large|exceed/i.test(msg)) throw new Error(`Файл больше ${MAX_FILE_MB} МБ.`);
    throw new Error("Не получилось загрузить файл. Попробуйте ещё раз.");
  }
  return { path, name: file.name, type: file.type };
}

async function loadData() {
  const [config, answers] = await Promise.all([
    rpc("get_config"),
    isAdmin() ? rpc("admin_answers", { p_password: state.adminPassword }) : rpc("list_answers", { p_code: state.code }),
  ]);
  state.config = config;
  state.answers = answers;
}

function logout() {
  store.set("dz_code", null);
  store.set("dz_prefix", null);
  store.set("dz_admin", null, sessionStorage);
  Object.assign(state, { code: null, filePrefix: null, adminPassword: null, answers: [] });
  if (location.hash !== "#/") location.hash = "#/";
  else route();
}
document.getElementById("logoutBtn").addEventListener("click", logout);

// ---------- Вход ----------

function renderAuth() {
  document.getElementById("topbar").hidden = true;
  app.innerHTML = "";
  if (!API || !KEY) {
    app.innerHTML = `<div class="card empty">Сайт ещё не подключён к базе. Администратору: заполните docs/config.js (см. README).</div>`;
    return;
  }
  app.append(document.getElementById("tpl-auth").content.cloneNode(true));
  const codeForm = document.getElementById("codeForm");
  const adminForm = document.getElementById("adminForm");
  const switchBtn = document.getElementById("authSwitch");

  switchBtn.addEventListener("click", () => {
    const toAdmin = adminForm.hidden;
    adminForm.hidden = !toAdmin;
    codeForm.hidden = toAdmin;
    switchBtn.textContent = toAdmin ? "← Вход по коду участника" : "Вход для администратора";
    (toAdmin ? adminForm.password : codeForm.code).focus();
  });

  codeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = document.getElementById("codeError");
    const btn = codeForm.querySelector("button");
    error.textContent = "";
    btn.disabled = true;
    try {
      const { code, file_prefix } = await rpc("login", { p_code: codeForm.code.value });
      store.set("dz_code", code);
      store.set("dz_prefix", file_prefix);
      Object.assign(state, { code, filePrefix: file_prefix });
      location.hash = "#/";
      route();
    } catch (err) {
      error.textContent = err.message;
      btn.disabled = false;
    }
  });

  adminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = document.getElementById("adminError");
    error.textContent = "";
    try {
      await rpc("admin_login", { p_password: adminForm.password.value });
      state.adminPassword = adminForm.password.value;
      store.set("dz_admin", state.adminPassword, sessionStorage);
      location.hash = "#/admin";
      route();
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

// ---------- Карточка ответа ----------

function answerCard(a, { showLesson = false, allowDelete = false } = {}) {
  const lesson = lessonById(a.lesson_id);
  const long = a.text.length > 500;
  const isImage = /^image\//.test(a.file_type || "");
  return `
    <article class="card ${a.is_mine ? "my-answer" : ""}" data-id="${esc(a.id)}">
      <div class="answer-head">
        <div>
          <div class="author">${esc(a.branch)}${a.is_mine ? ' <span class="badge ok">ваш ответ</span>' : ""}${a.code ? ` <span class="badge off">${esc(prettyCode(a.code))}</span>` : ""}</div>
          <div class="answer-sub">${showLesson && lesson ? esc(lesson.label) + " · " : ""}${formatDate(a.updated_at)}</div>
        </div>
      </div>
      <div>${a.products.map((p) => `<span class="tag">${esc(p)}</span>`).join("")}</div>
      ${a.text ? `<div class="answer-text ${long ? "clamped" : ""}">${esc(a.text)}</div>${long ? `<button class="linkish" data-expand>Показать полностью</button>` : ""}` : ""}
      ${a.file_path && isImage ? `<a href="${esc(fileUrl(a.file_path))}" target="_blank" rel="noopener"><img class="thumb" src="${esc(fileUrl(a.file_path))}" alt="Фото к ответу" loading="lazy"></a>` : ""}
      <div class="actions">
        ${a.file_path ? `<a href="${esc(fileUrl(a.file_path))}" target="_blank" rel="noopener">📎 ${esc(a.file_name || "файл")}</a>` : ""}
        ${allowDelete ? `<button class="linkish" data-admin-delete style="color:var(--danger)">Удалить</button>` : ""}
      </div>
    </article>`;
}

function bindCards(container, reload) {
  container.onclick = async (e) => {
    const card = e.target.closest("[data-id]");
    if (!card) return;
    if (e.target.matches("[data-expand]")) {
      card.querySelector(".answer-text").classList.remove("clamped");
      e.target.remove();
    } else if (e.target.matches("[data-admin-delete]")) {
      if (!confirm("Удалить этот ответ? Отменить будет нельзя.")) return;
      try {
        await rpc("admin_delete_answer", { p_password: state.adminPassword, p_id: card.dataset.id });
        toast("Ответ удалён");
        reload();
      } catch (err) {
        toast(err.message);
      }
    }
  };
}

function deadlineText(lessonId) {
  const d = deadlineOf(lessonId);
  if (!d) return `<span class="deadline">Срок не назначен</span>`;
  return d.passed
    ? `<span class="deadline passed">Срок прошёл ${formatDay(d.iso)}</span>`
    : `<span class="deadline">Сдать до ${formatDate(d.iso)}</span>`;
}

// ---------- Уроки ----------

function renderHome() {
  const mine = new Set(state.answers.filter((a) => a.is_mine).map((a) => a.lesson_id));
  const lv = state.tab;
  const card = (l) => {
    const total = state.answers.filter((a) => a.lesson_id === l.id).length;
    return `
        <a class="card" href="#/lesson/${l.id}">
          <div class="lesson-num">${esc(l.title)}${l.textOnly ? " · только текст" : ""}</div>
          <h2>${esc(l.description)}</h2>
          <ul class="hw-list">${l.homework.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          <div class="lesson-meta">
            <span>${deadlineText(l.id)}<br>${total} ${plural(total, "ответ", "ответа", "ответов")}</span>
            ${isAdmin() ? "" : mine.has(l.id) ? '<span class="badge ok">Сдано</span>' : '<span class="badge todo">Не сдано</span>'}
          </div>
        </a>`;
  };
  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Уроки</h1>
        <p class="muted">Выберите свой уровень и урок, чтобы сдать домашнее задание. До срока ответ можно менять.</p>
      </div>
      <a href="#/base"><button class="primary">База ответов</button></a>
    </div>
    <div class="level-tabs" role="tablist" aria-label="Уровень">
      ${Object.entries(LEVELS).map(([k, v]) => `
        <button role="tab" data-level-tab="${k}" class="level-tab ${k} ${k === lv ? "active" : ""}" aria-selected="${k === lv}">
          <span class="level-tab-name">${v.name}</span><span class="level-tab-desc">${esc(v.description.split(" · ")[0])}</span>
        </button>`).join("")}
    </div>
    <p class="muted level-note">${esc(LEVELS[lv].description)}</p>
    <div class="grid">${lessonsOf(lv).map(card).join("")}</div>`;
  app.querySelector(".level-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-level-tab]");
    if (!b || b.dataset.levelTab === state.tab) return;
    state.tab = b.dataset.levelTab;
    store.set("dz_tab", state.tab);
    renderHome();
  });
}

function plural(n, one, few, many) {
  return n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;
}

// ---------- Страница урока ----------

function renderLesson(id, { editing = false } = {}) {
  const lesson = lessonById(id);
  if (!lesson) return (location.hash = "#/");
  if (state.tab !== lesson.level) { state.tab = lesson.level; store.set("dz_tab", state.tab); }
  const mine = state.answers.find((a) => a.is_mine && a.lesson_id === id);
  const others = state.answers.filter((a) => a.lesson_id === id && !a.is_mine);
  const d = deadlineOf(id);
  const open = !d?.passed;
  const showForm = !isAdmin() && open && (editing || !mine);

  let mySection = "";
  if (isAdmin()) {
    mySection = `<div class="card muted">Вы вошли как администратор. Ответы участников — справа и в «Базе ответов».</div>`;
  } else if (showForm) {
    mySection = answerForm(lesson, mine);
  } else if (mine) {
    mySection = `
      <div>
        <h2>Мой ответ</h2>
        ${answerCard(mine)}
        ${open
          ? `<div class="actions"><button class="primary" id="editBtn">Изменить ответ</button><button class="linkish" id="deleteBtn" style="color:var(--danger)">Удалить</button></div>`
          : `<p class="muted small-note">Срок прошёл — ответ больше нельзя изменить.</p>`}
      </div>`;
  } else {
    mySection = `<div class="card muted">Срок сдачи прошёл, ответ не был отправлен.</div>`;
  }

  app.innerHTML = `
    <a href="#/" class="back">← Все уроки</a>
    <div class="page-head"><div>
      <div class="lesson-num">${esc(lesson.label)}</div>
      <h1>${esc(lesson.description)}</h1>
      ${deadlineText(id)}
    </div></div>
    <div class="card hw-card">
      <span class="label">Домашнее задание</span>
      <ul class="hw-list">${lesson.homework.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
    </div>
    <div class="two-col">
      <section class="sticky">${mySection}</section>
      <section>
        <h2>Ответы коллег · ${others.length}</h2>
        <div class="answers" id="lessonAnswers">
          ${others.length ? others.map((a) => answerCard(a, { allowDelete: isAdmin() })).join("") : `<div class="card empty">Пока никто не сдал. Будьте первым.</div>`}
        </div>
      </section>
    </div>`;

  bindCards(document.getElementById("lessonAnswers"), refreshLesson(id));
  document.getElementById("editBtn")?.addEventListener("click", () => renderLesson(id, { editing: true }));
  document.getElementById("deleteBtn")?.addEventListener("click", async () => {
    if (!confirm("Удалить ваш ответ на этот урок?")) return;
    try {
      await rpc("delete_answer", { p_code: state.code, p_lesson: id });
      toast("Ответ удалён");
      await refreshLesson(id)();
    } catch (err) {
      toast(err.message);
    }
  });
  if (showForm) bindAnswerForm(lesson, mine);
}

const refreshLesson = (id) => async () => {
  await loadData();
  renderLesson(id);
};

function lastBranch() {
  const latest = [...state.answers].filter((a) => a.is_mine).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  return latest?.branch || store.get("dz_branch") || "";
}

function answerForm(lesson, mine) {
  const { branches, products } = state.config;
  if (!branches.length || !products.length) {
    return `<div class="card muted">Сдача откроется, когда администратор добавит списки филиалов и продуктов.</div>`;
  }
  const branch = mine?.branch || lastBranch();
  const chosen = new Set(mine?.products || []);
  return `
    <form class="card" id="answerForm" novalidate>
      <h2>${mine ? "Изменить ответ" : "Мой ответ"}</h2>
      <div class="form-row">
        <label class="field-label" for="branchSelect">Филиал</label>
        <select id="branchSelect" name="branch" required>
          <option value="">— выберите филиал —</option>
          ${branches.map((b) => `<option ${b === branch ? "selected" : ""}>${esc(b)}</option>`).join("")}
        </select>
      </div>
      <div class="form-row">
        <span class="field-label" id="productsLabel">Продукт, по которому ответ</span>
        <div class="product-picks" role="group" aria-labelledby="productsLabel">
          ${products.map((p, i) => `<label><input type="checkbox" name="product" value="${esc(p)}" id="pr${i}" ${chosen.has(p) ? "checked" : ""}><span>${esc(p)}</span></label>`).join("")}
        </div>
      </div>
      <div class="form-row">
        <label class="field-label" for="answerText">Ответ${lesson.textOnly ? "" : " текстом"}</label>
        <textarea id="answerText" name="text" placeholder="${lesson.textOnly ? "В этом уроке ответ только текстом" : "Напишите ответ или прикрепите файл ниже"}">${esc(mine?.text || "")}</textarea>
      </div>
      ${lesson.textOnly ? "" : `
        <input type="file" id="fileInput" hidden accept="${ACCEPT}" />
        <div class="dropzone" id="dropzone" tabindex="0" role="button">
          ${mine?.file_path
            ? `<div class="file-picked"><span>📎 ${esc(mine.file_name || "файл")}</span><button type="button" class="linkish" id="clearFile">убрать</button></div>`
            : `<strong>Прикрепить файл</strong><br>Фото, PDF, Word, PowerPoint или аудио — до ${MAX_FILE_MB} МБ`}
        </div>`}
      <p class="error" id="formError"></p>
      <button class="primary wide" type="submit">${mine ? "Сохранить изменения" : "Отправить ответ"}</button>
      ${mine ? `<button type="button" class="linkish switch" id="cancelEdit">Отменить</button>` : ""}
    </form>`;
}

function bindAnswerForm(lesson, mine) {
  const form = document.getElementById("answerForm");
  if (!form) return;
  const fileInput = document.getElementById("fileInput");
  const dropzone = document.getElementById("dropzone");
  let picked = null;
  let removeFile = false;
  const emptyZone = `<strong>Прикрепить файл</strong><br>Фото, PDF, Word, PowerPoint или аудио — до ${MAX_FILE_MB} МБ`;

  const showFile = () => {
    const name = picked?.name || (!removeFile && mine?.file_path ? mine.file_name : null);
    dropzone.innerHTML = name
      ? `<div class="file-picked"><span>📎 ${esc(name)}</span><button type="button" class="linkish" id="clearFile">убрать</button></div>`
      : emptyZone;
  };
  if (dropzone) {
    dropzone.addEventListener("click", (e) => {
      if (e.target.id === "clearFile") {
        picked = null;
        removeFile = true;
        fileInput.value = "";
        return showFile();
      }
      fileInput.click();
    });
    dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener("change", () => { picked = fileInput.files[0] || null; showFile(); });
    dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag"); });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag");
      if (e.dataTransfer.files.length) { picked = e.dataTransfer.files[0]; showFile(); }
    });
  }
  document.getElementById("cancelEdit")?.addEventListener("click", () => renderLesson(lesson.id));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("formError");
    err.textContent = "";
    const branch = form.branch.value;
    const products = [...form.querySelectorAll('input[name="product"]:checked')].map((i) => i.value);
    const text = form.text.value.trim();
    const hasFile = Boolean(picked) || (!removeFile && mine?.file_path);
    if (!branch) return (err.textContent = ERRORS.bad_branch);
    if (!products.length) return (err.textContent = ERRORS.bad_products);
    if (!text && !hasFile) return (err.textContent = lesson.textOnly ? "Напишите ответ." : ERRORS.empty_answer);

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = picked ? "Загружаем файл…" : "Сохраняем…";
    try {
      let file = null;
      if (picked) {
        const prepared = await prepareFile(picked);
        if (prepared.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Файл больше ${MAX_FILE_MB} МБ.`);
        file = await uploadFile(prepared);
      }
      await rpc("save_answer", {
        p_code: state.code, p_lesson: lesson.id, p_branch: branch, p_products: products, p_text: text,
        p_file: file, p_remove_file: removeFile && !file,
      });
      store.set("dz_branch", branch);
      toast(mine ? "Изменения сохранены" : "Ответ отправлен");
      await refreshLesson(lesson.id)();
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false;
      btn.textContent = mine ? "Сохранить изменения" : "Отправить ответ";
    }
  });
}

// ---------- База ответов ----------

const filters = { level: "", lesson: "", branch: "", product: "", q: "" };

function renderBase() {
  const { branches, products } = state.config;
  app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>База ответов</h1>
        <p class="muted">Ответы всех участников. Ищите по продукту, уровню, уроку и филиалу.</p>
      </div>
    </div>
    <div class="filters">
      <label class="sr-only" for="fq">Поиск</label>
      <input type="search" id="fq" placeholder="Поиск по тексту…" value="${esc(filters.q)}" />
      <label class="sr-only" for="fLevel">Уровень</label>
      <select id="fLevel"><option value="">Все уровни</option>${levelOptions()}</select>
      <label class="sr-only" for="fLesson">Урок</label>
      <select id="fLesson"><option value="">Все уроки</option>${lessonOptions()}</select>
      <label class="sr-only" for="fBranch">Филиал</label>
      <select id="fBranch">
        <option value="">Все филиалы</option>
        ${branches.map((b) => `<option>${esc(b)}</option>`).join("")}
      </select>
    </div>
    <div class="chips" id="productChips"></div>
    <div class="answers" id="baseAnswers"></div>`;

  const fq = document.getElementById("fq");
  const fLevel = document.getElementById("fLevel");
  const fLesson = document.getElementById("fLesson");
  const fBranch = document.getElementById("fBranch");
  fLevel.value = filters.level;
  fLesson.value = filters.lesson;
  fBranch.value = filters.branch;
  const list = document.getElementById("baseAnswers");
  const chips = document.getElementById("productChips");

  const draw = () => {
    const q = filters.q.toLowerCase();
    const scoped = state.answers.filter(
      (a) =>
        (!filters.level || lessonById(a.lesson_id)?.level === filters.level) &&
        (!filters.lesson || a.lesson_id === Number(filters.lesson)) &&
        (!filters.branch || a.branch === filters.branch) &&
        (!q || `${a.text} ${a.file_name ?? ""} ${a.branch}`.toLowerCase().includes(q))
    );
    const shown = filters.product ? scoped.filter((a) => a.products.includes(filters.product)) : scoped;
    const counts = {};
    scoped.forEach((a) => a.products.forEach((p) => (counts[p] = (counts[p] || 0) + 1)));
    const allProducts = [...new Set([...products, ...Object.keys(counts)])];
    chips.innerHTML =
      `<button class="chip ${!filters.product ? "active" : ""}" data-product="">Все продукты<span class="n">${scoped.length}</span></button>` +
      allProducts
        .filter((p) => counts[p] || p === filters.product)
        .map((p) => `<button class="chip ${p === filters.product ? "active" : ""}" data-product="${esc(p)}">${esc(p)}<span class="n">${counts[p] || 0}</span></button>`)
        .join("");
    list.innerHTML = shown.length
      ? shown.map((a) => answerCard(a, { showLesson: true, allowDelete: isAdmin() })).join("")
      : `<div class="card empty">${state.answers.length ? "Ничего не найдено. Измените фильтры." : "Ответов пока нет."}</div>`;
  };

  chips.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-product]");
    if (!chip) return;
    filters.product = chip.dataset.product;
    draw();
  });
  let t;
  fq.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { filters.q = fq.value.trim(); draw(); }, 250); });
  fLevel.addEventListener("change", () => { filters.level = fLevel.value; draw(); });
  fLesson.addEventListener("change", () => { filters.lesson = fLesson.value; draw(); });
  fBranch.addEventListener("change", () => { filters.branch = fBranch.value; draw(); });
  bindCards(list, async () => { await loadData(); draw(); });
  draw();
}

// ---------- Админка ----------

let adminTab = "progress";

async function renderAdmin() {
  if (!isAdmin()) return (location.hash = "#/");
  const overview = await rpc("admin_overview", { p_password: state.adminPassword });
  state.config = overview.settings;
  const tabs = [["progress", "Сдача"], ["codes", "Коды участников"], ["export", "Выгрузка"], ["settings", "Сроки и списки"]];
  app.innerHTML = `
    <div class="page-head"><div><h1>Админка</h1></div></div>
    <div class="tabs-row" role="tablist">
      ${tabs.map(([k, label]) => `<button data-tab="${k}" class="${k === adminTab ? "active" : ""}" role="tab" aria-selected="${k === adminTab}">${label}</button>`).join("")}
    </div>
    <div id="adminBody"></div>`;
  app.querySelector(".tabs-row").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (!b) return;
    adminTab = b.dataset.tab;
    renderAdmin();
  });
  const body = document.getElementById("adminBody");
  ({ progress: adminProgress, codes: adminCodes, export: adminExport, settings: adminSettings })[adminTab](body, overview);
}

// Сданные участником уроки уровня (MASTER — 1–6, EXPERT — 7–12): уровень участник выбирает сам
const doneIn = (p, lv) => p.lessons.filter((id) => lessonById(id)?.level === lv);

function adminProgress(body, { participants, answers }) {
  const levelSection = (lv) => {
    const people = participants.filter((p) => doneIn(p, lv).length);
    const active = people.filter((p) => p.active);
    const lessons = lessonsOf(lv);
    const all6 = active.filter((p) => doneIn(p, lv).length === lessons.length).length;
    return `
      <section class="level-block">
        <div class="level-head"><span class="level-badge ${lv}">${LEVELS[lv].name}</span>
          <span class="muted">участников: ${active.length} · сдали все ${lessons.length} уроков: ${all6}</span></div>
        ${lessons.map((l) => {
          const n = active.filter((p) => p.lessons.includes(l.id)).length;
          return `<div class="deadline-row"><span>${esc(l.title)}: сдали ${n}</span>${deadlineText(l.id)}</div>`;
        }).join("")}
        <div class="card table-wrap" style="margin-top:12px">
          ${people.length ? `
          <table class="progress">
            <thead><tr><th>Код</th><th>Филиал</th>${lessons.map((l) => `<th title="${esc(l.description)}">У${l.num}</th>`).join("")}<th>Сдано</th></tr></thead>
            <tbody>${people.map((p) => `<tr>
              <td>${esc(prettyCode(p.code))}${p.active ? "" : ' <span class="badge off">откл.</span>'}</td>
              <td>${esc(p.branch || "—")}</td>
              ${lessons.map((l) => (p.lessons.includes(l.id) ? '<td class="done">✓</td>' : '<td class="miss">—</td>')).join("")}
              <td>${doneIn(p, lv).length} / ${lessons.length}</td>
            </tr>`).join("")}</tbody>
          </table>` : `<div class="empty">Ответов по уровню ${LEVELS[lv].name} пока нет.</div>`}
        </div>
      </section>`;
  };
  body.innerHTML = `
    <div class="stats">
      <div class="card stat"><div class="value">${participants.filter((p) => p.active).length}</div><div class="label">активных кодов</div></div>
      <div class="card stat"><div class="value">${answers}</div><div class="label">ответов</div></div>
      <div class="card stat"><div class="value">${participants.filter((p) => p.active && !p.lessons.length).length}</div><div class="label">ещё ничего не сдали</div></div>
    </div>
    ${Object.keys(LEVELS).map(levelSection).join("")}`;
}

function adminCodes(body, { participants }) {
  const done = (p) => Object.keys(LEVELS).map((lv) => `${LEVELS[lv].name} ${doneIn(p, lv).length}/${lessonsOf(lv).length}`).join(" · ");
  body.innerHTML = `
    <form class="card" id="genForm">
      <h2>Создать коды</h2>
      <p class="muted">Каждому участнику — свой код. Раздайте коды и запишите у себя, кому какой выдан: в системе хранятся только коды. Уровень (MASTER или EXPERT) участник выбирает сам на сайте.</p>
      <div class="inline-form">
        <label for="genCount">Сколько кодов<input id="genCount" type="number" min="1" max="500" value="10" required></label>
        <button class="primary" type="submit">Создать</button>
      </div>
      <div id="newCodes"></div>
    </form>
    <div class="card" style="margin-top:16px">
      <div class="page-head" style="margin-bottom:8px">
        <h2>Все коды · ${participants.length}</h2>
        <button id="codesXlsx" ${participants.length ? "" : "disabled"}>Скачать список (Excel)</button>
      </div>
      <div class="table-wrap">
        <table class="progress">
          <thead><tr><th>Код</th><th>Статус</th><th>Сдано</th><th></th></tr></thead>
          <tbody>${participants.map((p) => `<tr>
            <td>${esc(prettyCode(p.code))}</td>
            <td>${p.active ? '<span class="badge ok">активен</span>' : '<span class="badge off">отключён</span>'}</td>
            <td>${done(p)}</td>
            <td><button class="linkish" data-toggle="${esc(p.code)}" data-active="${p.active}">${p.active ? "Отключить" : "Включить"}</button></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;

  document.getElementById("genForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = Number(document.getElementById("genCount").value);
    try {
      const codes = await rpc("admin_generate_codes", { p_password: state.adminPassword, p_count: n });
      await renderAdmin();
      document.getElementById("newCodes").innerHTML = `
        <p class="ok-text">Создано кодов: ${codes.length}</p>
        <div class="code-list">${codes.map((c) => `<span>${esc(prettyCode(c))}</span>`).join("")}</div>
        <button type="button" id="newCodesXlsx">Скачать новые коды (Excel)</button>`;
      document.getElementById("newCodesXlsx").onclick = () =>
        downloadXlsx("novye-kody", [["Новые коды", codes.map((c) => ({ "Код": prettyCode(c), "Кому выдан (заполните сами)": "" }))]]);
    } catch (err) {
      toast(err.message);
    }
  });
  document.getElementById("codesXlsx").onclick = () =>
    downloadXlsx("kody-uchastnikov", [["Коды", participants.map((p) => ({
      "Код": prettyCode(p.code), "Статус": p.active ? "активен" : "отключён",
      "Сдано MASTER": doneIn(p, "master").length, "Сдано EXPERT": doneIn(p, "expert").length,
      "Создан": formatFull(p.created_at), "Кому выдан (заполните сами)": "",
    }))]]);
  body.querySelectorAll("[data-toggle]").forEach((b) =>
    b.addEventListener("click", async () => {
      const turnOff = b.dataset.active === "true";
      if (turnOff && !confirm(`Отключить код ${prettyCode(b.dataset.toggle)}? Участник не сможет войти, его ответы останутся в базе.`)) return;
      try {
        await rpc("admin_set_active", { p_password: state.adminPassword, p_code: b.dataset.toggle, p_active: !turnOff });
        renderAdmin();
      } catch (err) {
        toast(err.message);
      }
    })
  );
}

function adminExport(body, { participants }) {
  const { branches, products } = state.config;
  body.innerHTML = `
    <form class="card" id="exportForm">
      <h2>Выгрузка ответов в Excel</h2>
      <p class="muted">В файле листы: «Ответы» (с учётом фильтров) и «Сдача MASTER», «Сдача EXPERT» — кто какие уроки сдал.</p>
      <div class="filters">
        <select id="xLevel" aria-label="Уровень"><option value="">Все уровни</option>${levelOptions()}</select>
        <select id="xLesson" aria-label="Урок"><option value="">Все уроки</option>${lessonOptions()}</select>
        <select id="xBranch" aria-label="Филиал"><option value="">Все филиалы</option>${branches.map((b) => `<option>${esc(b)}</option>`).join("")}</select>
        <select id="xProduct" aria-label="Продукт"><option value="">Все продукты</option>${products.map((p) => `<option>${esc(p)}</option>`).join("")}</select>
      </div>
      <button class="primary" type="submit">Скачать Excel</button>
    </form>`;
  document.getElementById("exportForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const all = await rpc("admin_answers", { p_password: state.adminPassword });
      const level = document.getElementById("xLevel").value;
      const lesson = Number(document.getElementById("xLesson").value) || null;
      const branch = document.getElementById("xBranch").value;
      const product = document.getElementById("xProduct").value;
      const rows = all
        .filter((a) => (!level || lessonById(a.lesson_id)?.level === level) && (!lesson || a.lesson_id === lesson) &&
          (!branch || a.branch === branch) && (!product || a.products.includes(product)))
        .map((a) => {
          const l = lessonById(a.lesson_id);
          return {
            "Уровень": LEVELS[l?.level]?.name, "Урок": l?.title, "Тема урока": l?.description,
            "Код участника": prettyCode(a.code), "Филиал": a.branch, "Продукты": a.products.join(", "),
            "Ответ": a.text, "Файл": a.file_path ? fileUrl(a.file_path) : "",
            "Отправлен": formatFull(a.created_at), "Изменён": formatFull(a.updated_at),
          };
        });
      const progress = (lv) => participants.map((p) => {
        const row = { "Код": prettyCode(p.code), "Статус": p.active ? "активен" : "отключён", "Филиал": p.branch || "" };
        lessonsOf(lv).forEach((l) => (row[l.title] = p.lessons.includes(l.id) ? "сдано" : ""));
        row["Всего"] = doneIn(p, lv).length;
        return row;
      });
      const name = lesson ? `otvety-${lessonById(lesson).level}-urok-${lessonById(lesson).num}` : level ? `otvety-${level}` : "otvety";
      await downloadXlsx(name, [["Ответы", rows], ["Сдача MASTER", progress("master")], ["Сдача EXPERT", progress("expert")]]);
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

function adminSettings(body) {
  const { branches, products, deadlines } = state.config;
  // поле datetime-local показывает время Алматы (UTC+5)
  const dateValue = (iso) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T").slice(0, 16) : "");
  body.innerHTML = `
    <form class="card" id="settingsForm">
      <h2>Сроки сдачи</h2>
      <p class="muted">До указанных даты и времени (по Алматы) участники могут сдать и изменить ответ. Пустое поле — без срока.</p>
      ${LESSONS.map((l) => `
        ${l.num === 1 ? `<div class="level-head" style="margin-top:14px"><span class="level-badge ${l.level}">${LEVELS[l.level].name}</span></div>` : ""}
        <div class="deadline-row">
          <label for="dl${l.id}">${esc(l.title)} — ${esc(l.description)}</label>
          <input type="datetime-local" id="dl${l.id}" value="${dateValue(deadlines[l.id])}">
        </div>`).join("")}
      <div class="settings-grid" style="margin-top:16px">
        <label>Филиалы — каждый с новой строки<textarea id="branchesInput">${esc(branches.join("\n"))}</textarea></label>
        <label>Продукты — каждый с новой строки<textarea id="productsInput">${esc(products.join("\n"))}</textarea></label>
      </div>
      <p class="muted small-note">Переименование филиала или продукта не меняет уже отправленные ответы.</p>
      <p class="error" id="settingsMsg"></p>
      <button class="primary" type="submit">Сохранить</button>
    </form>
    <form class="card" id="pwForm" style="margin-top:16px">
      <h2>Пароль администратора</h2>
      <div class="inline-form">
        <label for="newPw">Новый пароль<input id="newPw" type="password" minlength="8" autocomplete="new-password" required></label>
        <button class="primary" type="submit">Сменить пароль</button>
      </div>
      <p class="error" id="pwMsg"></p>
    </form>`;

  const lines = (id) => [...new Set(document.getElementById(id).value.split("\n").map((s) => s.trim()).filter(Boolean))];
  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("settingsMsg");
    const newDeadlines = {};
    LESSONS.forEach((l) => {
      const v = document.getElementById(`dl${l.id}`).value;
      if (v) newDeadlines[l.id] = `${v}:00+05:00`;
    });
    try {
      state.config = await rpc("admin_save_settings", {
        p_password: state.adminPassword, p_branches: lines("branchesInput"), p_products: lines("productsInput"), p_deadlines: newDeadlines,
      });
      toast("Сохранено");
      renderAdmin();
    } catch (err) {
      msg.textContent = err.message;
    }
  });
  document.getElementById("pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("pwMsg");
    const pw = document.getElementById("newPw").value;
    try {
      await rpc("admin_set_password", { p_password: state.adminPassword, p_new: pw });
      state.adminPassword = pw;
      store.set("dz_admin", pw, sessionStorage);
      e.target.reset();
      toast("Пароль изменён");
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

// Excel собирается в браузере библиотекой SheetJS (грузится только для выгрузки)
async function downloadXlsx(name, sheets) {
  if (!window.XLSX) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.onload = resolve;
      s.onerror = () => reject(new Error("Не получилось загрузить модуль Excel. Проверьте интернет."));
      document.head.append(s);
    });
  }
  const wb = XLSX.utils.book_new();
  for (const [title, rows] of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "": "Нет данных" }]);
    const keys = Object.keys(rows[0] || { "": "" });
    ws["!cols"] = keys.map((k) => ({ wch: Math.min(60, Math.max(k.length + 2, ...rows.map((r) => String(r[k] ?? "").length / 3 + 8))) }));
    XLSX.utils.book_append_sheet(wb, ws, title);
  }
  XLSX.writeFile(wb, `${name}-${new Date().toLocaleDateString("sv-SE", { timeZone: TZ })}.xlsx`);
}

// ---------- Роутер ----------

async function route() {
  if (!state.code && !isAdmin()) return renderAuth();
  const hash = location.hash || "#/";
  document.getElementById("topbar").hidden = false;
  document.getElementById("adminNav").hidden = !isAdmin();
  document.getElementById("meName").textContent = isAdmin() ? "Администратор" : `Код ${prettyCode(state.code)}`;
  const section = hash.startsWith("#/base") ? "base" : hash.startsWith("#/admin") ? "admin" : "home";
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === section));

  try {
    if (section === "admin") return await renderAdmin();
    await loadData();
    const m = hash.match(/^#\/lesson\/(\d+)/);
    if (m) return renderLesson(Number(m[1]));
    if (section === "base") return renderBase();
    return renderHome();
  } catch (err) {
    if (!state.code && !isAdmin()) return;
    app.innerHTML = `<div class="card empty">${esc(err.message)}<br><br><button class="primary" onclick="route()">Повторить</button></div>`;
  }
}

window.addEventListener("hashchange", () => { window.scrollTo(0, 0); route(); });
route();
