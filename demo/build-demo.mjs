// Собирает демо-версию одним файлом: node demo/build-demo.mjs → dist/Sales-Academy-demo.html
// Это тот же сайт из docs/, но вместо Supabase — вымышленные данные в браузере (demo-backend.js).
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const patch = (src, from, to) => {
  if (!src.includes(from)) throw new Error("Не найдено для замены: " + from.slice(0, 60));
  return src.replace(from, to);
};

let app = read("../docs/app.js");
app = patch(app, "async function rpc(fn, args = {}) {\n", `async function rpc(fn, args = {}) {
  if (window.DEMO) {
    try { return await DEMO.rpc(fn, args); }
    catch (e) {
      const code = e.message;
      if (code === "invalid_code" && state.code) logout();
      const err = new Error(ERRORS[code] || code);
      err.code = code;
      throw err;
    }
  }
`);
app = patch(app, "async function uploadFile(file) {\n", "async function uploadFile(file) {\n  if (window.DEMO) return DEMO.upload(file, state.filePrefix);\n");
app = patch(app, "const fileUrl = (path) =>", "const fileUrl = (path) => window.DEMO ? DEMO.fileUrl(path) :");

const banner = `
  <div class="demo-bar">
    Демо-версия: данные вымышленные и сохраняются только на этом компьютере.
    Код участника — <b>DEMO-2026</b> (уровень выбирается на странице «Уроки»). Пароль администратора — <b>demo2026</b>.
    <button type="button" class="linkish" onclick="DEMO.reset()">Сбросить демо</button>
  </div>`;

const css = read("../docs/styles.css") + `
.demo-bar { background: var(--accent-soft); color: var(--text); font-size: 13px; text-align: center;
  padding-block: 8px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.demo-bar .linkish { font-size: 13px; margin-left: 6px; }
.topbar { top: 0; }
`;

const safe = (js) => js.replace(/<\/script/gi, "<\\/script");
// номер версии (?v=…) на файлах нужен только опубликованному сайту
let html = read("../docs/index.html").replace(/\?v=\d+/g, "");
html = patch(html, '<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`);
html = patch(html, "<title>Домашние задания</title>", "<title>Домашние задания — демо</title>");
html = patch(html, "<body>\n", `<body>\n${banner}\n`);
html = patch(
  html,
  '<script src="config.js"></script>\n  <script src="app.js"></script>',
  `<script>window.APP_CONFIG = { supabaseUrl: "demo", supabaseKey: "demo" };</script>
  <script>${safe(read("./demo-backend.js"))}</script>
  <script>${safe(app)}</script>`
);

fs.mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../dist/Sales-Academy-demo.html", import.meta.url), html);
console.log(`dist/Sales-Academy-demo.html: ${(html.length / 1024).toFixed(0)} KB`);
