// Демо-режим: те же функции, что в supabase/schema.sql, но в браузере (localStorage).
// Данные вымышленные и хранятся только на этом компьютере.
(function () {
  const KEY = "dz_demo_db_v1";
  const ADMIN_PASSWORD = "demo2026";
  const DAY = 864e5;

  const at18 = (daysFromNow) => {
    const d = new Date(Date.now() + daysFromNow * DAY);
    const ymd = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Almaty" });
    return `${ymd}T18:00:00+05:00`;
  };
  const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 36e5).toISOString();

  const BRANCHES = [
    "Астанинский городской филиал", "Актюбинский ОФ", "Алматинский городской филиал", "Атырауский ОФ",
    "Восточно-Казахстанский ОФ", "Жамбылский ОФ", "ОФ «Ұлытау»", "Западно-Казахстанский ОФ", "Карагандинский ОФ",
    "Кызылординский ОФ", "Костанайский ОФ", "Мангистауский ОФ", "Павлодарский ОФ", "Северо-Казахстанский ОФ",
    "ОФ «Абай»", "Шымкентский городской филиал", "ОФ «Жетісу»", "Акмолинский ОФ", "Байконырский РФ",
    "Жанаозенский РФ", "Экибастузский РФ", "Темиртауский РФ", "Балхашский РФ", "Туркестанский ОФ", "Алматинский ОФ",
  ];
  const PRODUCTS = [
    "БЗК", "Страхование", "Депозиты", "Карты", "Кредитные карты", "Halyk Super App", "Инвестиции",
    "Halyk Market", "Ипотека", "Автокредит", "Другие кредиты", "Halyk Travel", "Госуслуги", "Другое",
  ];

  function seed() {
    const codes = ["DEMO2026", "K7M4Q2XA", "P3RT8WZB", "H9NC2VKE", "Y5DF6GMJ", "T2QX7HRS"];
    const a = (code, lesson, branch, products, text, days, hours) => ({
      id: `demo-${code}-${lesson}`, code, lesson_id: lesson, branch, products, text,
      file_path: null, file_name: null, file_type: null, created_at: ago(days, hours), updated_at: ago(days, hours),
    });
    return {
      participants: codes.map((code, i) => ({ code, active: true, created_at: ago(9, i) })),
      answers: [
        a("K7M4Q2XA", 1, "Алматинский городской филиал", ["Депозиты"],
          "Диалог 1. Клиентка пришла закрыть депозит. Вместо того чтобы сразу оформлять, спросила, на что нужны деньги — ремонт через полгода. Предложила частичное снятие и оставить остаток на депозите.\n\nДиалог 2. Клиент спросил про курс валют. Уточнила, как часто делает переводы — выяснилось, что каждый месяц отправляет деньги сыну-студенту.\n\nУточняющие вопросы: «Для чего вам эти средства?», «Когда они понадобятся?», «Как вы сейчас делаете переводы?»", 3, 2),
        a("P3RT8WZB", 1, "Карагандинский ОФ", ["БЗК", "Кредитные карты"],
          "Клиент хотел БЗК на крупную покупку. Спросил, что именно покупает и когда — техника в рассрочку. Предложил сравнить БЗК и кредитную карту с льготным периодом.\n\nВопросы для типовых ситуаций: «Какую сумму рассматриваете?», «Какой платёж в месяц комфортен?», «Есть ли сейчас другие кредиты?»", 2, 5),
        a("H9NC2VKE", 1, "Шымкентский городской филиал", ["Halyk Super App", "Госуслуги"],
          "Пенсионерка пришла за справкой. Спросила, пользуется ли она приложением, — нет, боится. Показала на её телефоне, как заказать справку через Госуслуги в Halyk Super App, вместе установили приложение.", 1, 3),
        a("Y5DF6GMJ", 1, "ОФ «Абай»", ["Ипотека", "Страхование"],
          "Молодая семья спрашивала про ипотеку. Уточнила, есть ли первоначальный взнос, сколько детей, какой бюджет на платёж. Рассказала про страхование как защиту семьи, а не как обязательную услугу.", 1, 0),
        a("K7M4Q2XA", 2, "Алматинский городской филиал", ["Карты", "Halyk Travel"],
          "Презентация: клиент часто летает в командировки. Показала карту с бонусами за путешествия и бронирование через Halyk Travel. Аргумент — бонусы покрывают часть перелёта.", 0, 5),
        a("T2QX7HRS", 2, "Атырауский ОФ", ["Инвестиции"],
          "Клиент держит крупную сумму на текущем счёте. Предложил короткую презентацию инвестиционных продуктов по шаблону: цель, срок, риск. Записал диалог и разобрал — слишком много терминов в начале, в следующий раз начну с цели клиента.", 0, 2),
      ],
      settings: {
        branches: BRANCHES,
        products: PRODUCTS,
        deadlines: { 1: at18(4), 2: at18(11), 3: at18(18), 4: at18(25), 5: at18(32), 6: at18(39) },
      },
      files: {},
      adminHash: ADMIN_PASSWORD,
    };
  }

  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!db) db = seed();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
  save();

  const fail = (code) => { const e = new Error(code); e.message = code; throw e; };
  const norm = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = (code) => "demo_" + code.toLowerCase();
  const participant = (c) => {
    const code = norm(c);
    if (!db.participants.some((p) => p.code === code && p.active)) fail("invalid_code");
    return code;
  };
  const admin = (pw) => { if (pw !== db.adminHash) fail("invalid_password"); };
  const passed = (lesson) => { const d = db.settings.deadlines[lesson]; return d ? Date.now() > Date.parse(d) : false; };
  const view = (a, me) => ({ ...a, code: undefined, is_mine: a.code === me });
  const config = () => JSON.parse(JSON.stringify(db.settings));

  const api = {
    get_config: () => config(),
    login: ({ p_code }) => { const code = participant(p_code); return { code, file_prefix: prefix(code) }; },
    list_answers: ({ p_code }) => {
      const me = participant(p_code);
      return db.answers.map((a) => view(a, me)).sort((x, y) => y.updated_at.localeCompare(x.updated_at));
    },
    save_answer: ({ p_code, p_lesson, p_branch, p_products, p_text, p_file, p_remove_file }) => {
      const code = participant(p_code);
      const text = String(p_text || "").trim();
      if (passed(p_lesson)) fail("deadline_passed");
      if (!db.settings.branches.includes(p_branch)) fail("bad_branch");
      if (!p_products?.length || p_products.some((p) => !db.settings.products.includes(p))) fail("bad_products");
      const old = db.answers.find((a) => a.code === code && a.lesson_id === p_lesson);
      let file = { file_path: null, file_name: null, file_type: null };
      if (p_file) file = { file_path: p_file.path, file_name: p_file.name, file_type: p_file.type };
      else if (!p_remove_file && old) file = { file_path: old.file_path, file_name: old.file_name, file_type: old.file_type };
      if (p_lesson === 1 && file.file_path) fail("lesson1_text_only");
      if (!text && !file.file_path) fail("empty_answer");
      const now = new Date().toISOString();
      const row = { id: old?.id || `a-${Date.now()}`, code, lesson_id: p_lesson, branch: p_branch, products: p_products, text, ...file,
        created_at: old?.created_at || now, updated_at: now };
      db.answers = db.answers.filter((a) => a !== old).concat(row);
      save();
      return view(row, code);
    },
    delete_answer: ({ p_code, p_lesson }) => {
      const code = participant(p_code);
      if (passed(p_lesson)) fail("deadline_passed");
      db.answers = db.answers.filter((a) => !(a.code === code && a.lesson_id === p_lesson));
      save();
      return null;
    },
    admin_login: ({ p_password }) => (admin(p_password), true),
    admin_overview: ({ p_password }) => {
      admin(p_password);
      return {
        participants: db.participants.map((p) => {
          const mine = db.answers.filter((a) => a.code === p.code).sort((x, y) => y.updated_at.localeCompare(x.updated_at));
          return { ...p, lessons: mine.map((a) => a.lesson_id).sort(), branch: mine[0]?.branch || null };
        }),
        answers: db.answers.length,
        settings: config(),
      };
    },
    admin_answers: ({ p_password }) => (admin(p_password), db.answers.map((a) => ({ ...view(a, null), code: a.code }))),
    admin_generate_codes: ({ p_password, p_count }) => {
      admin(p_password);
      if (!(p_count >= 1 && p_count <= 500)) fail("bad_count");
      const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      const made = [];
      while (made.length < p_count) {
        const c = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => alphabet[b % alphabet.length]).join("");
        if (!db.participants.some((p) => p.code === c)) { db.participants.push({ code: c, active: true, created_at: new Date().toISOString() }); made.push(c); }
      }
      save();
      return made;
    },
    admin_set_active: ({ p_password, p_code, p_active }) => {
      admin(p_password);
      const p = db.participants.find((x) => x.code === norm(p_code));
      if (p) p.active = p_active;
      save();
      return null;
    },
    admin_delete_answer: ({ p_password, p_id }) => { admin(p_password); db.answers = db.answers.filter((a) => a.id !== p_id); save(); return null; },
    admin_save_settings: ({ p_password, p_branches, p_products, p_deadlines }) => {
      admin(p_password);
      db.settings = { branches: p_branches, products: p_products, deadlines: p_deadlines };
      save();
      return config();
    },
    admin_set_password: ({ p_password, p_new }) => {
      admin(p_password);
      if (String(p_new || "").length < 8) fail("password_too_short");
      db.adminHash = p_new;
      save();
      return null;
    },
  };

  window.DEMO = {
    async rpc(fn, args) {
      await new Promise((r) => setTimeout(r, 150));
      if (!api[fn]) fail("unknown");
      return api[fn](args || {});
    },
    async upload(file, filePrefix) {
      if (file.size > 3 * 1024 * 1024) throw new Error("В демо-версии файлы до 3 МБ. В рабочей версии — до 10 МБ.");
      const data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
      const path = `${filePrefix}/${Date.now()}`;
      db.files[path] = data;
      save();
      return { path, name: file.name, type: file.type };
    },
    fileUrl: (path) => db.files[path] || "#",
    reset() { try { localStorage.removeItem(KEY); } catch {} location.reload(); },
  };
})();
