// Собирает «просмотр» без скриптов из снимков экранов демо:
// node demo/build-view.mjs <screens.json> → dist/Sales-Academy-prosmotr.html
// Экраны переключаются ссылками (#s-…) и CSS :target — работает там, где скрипты в файлах запрещены.
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
const screens = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const ADMIN_TABS = { progress: "Сдача", codes: "Коды участников", export: "Выгрузка", settings: "Сроки и списки" };

function rewrite(html, home = "s-home") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/href="#\/lesson\/(\d+)"/g, 'href="#s-lesson-$1"')
    .replace(/href="#\/base"/g, 'href="#s-base"')
    .replace(/href="#\/admin"/g, 'href="#s-admin-progress"')
    .replace(/href="#\/"/g, `href="#${home}"`)
    // вкладки админки и кнопки входа/выхода — ссылки на соседние экраны
    .replace(/<button data-tab="(\w+)" class="([^"]*)"[^>]*>([^<]*)<\/button>/g, '<a class="tab-link $2" href="#s-admin-$1">$3</a>')
    .replace(/<button role="tab" data-level-tab="(\w+)" class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g,
      (_, lv, cls, inner) => `<a class="${cls}" href="#${lv === "expert" ? "s-home-expert" : "s-home"}">${inner}</a>`)
    .replace(/<button class="ghost small" id="logoutBtn">Выйти<\/button>/, '<a class="tab-link" href="#s-login">Выйти</a>')
    .replace(/<button type="submit" class="primary wide">Войти<\/button>/, '<a class="btn-link primary wide" href="#s-home">Войти</a>')
    .replace(/<button type="button" class="linkish switch" id="authSwitch">Вход для администратора<\/button>/,
      '<a class="linkish switch" href="#s-admin-progress">Вход для администратора</a>')
    .replace(/\sid="(topbar|app|meName|adminNav|logoutBtn|codeForm|adminForm|codeInput)"/g, "")
    .replace(/<form/g, '<form onsubmit="return false"');
}

const order = Object.keys(screens).filter((k) => k !== "login").concat("login"); // экран входа — последним, он показывается по умолчанию
const sections = order
  .map((id) => {
    const lessonNum = Number(id.match(/^lesson-(\d+)$/)?.[1]);
    const home = id === "home-expert" || lessonNum >= 7 ? "s-home-expert" : "s-home";
    return `<section class="screen" id="s-${id}">${rewrite(screens[id].top, home)}<main>${rewrite(screens[id].app, home)}</main></section>`;
  })
  .join("\n");

const css = read("../docs/styles.css") + `
.view-bar { background: var(--accent-soft); color: var(--text); font-size: 13px; text-align: center;
  padding-block: 8px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.screen { display: none; }
.screen:target, #s-login { display: block; }
.screen:target ~ #s-login { display: none; }
.topbar { top: 0; }
.tab-link, .btn-link { display: inline-block; font: inherit; border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface); color: var(--text); padding: 9px 16px; text-decoration: none; }
.tab-link.active { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-soft); font-weight: 600; }
.btn-link.primary { background: var(--accent); color: var(--accent-text); border-color: var(--accent); font-weight: 600; text-align: center; }
.btn-link.wide { display: block; width: 100%; }
.me .tab-link { padding: 5px 10px; font-size: 13px; }
`;

const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Домашние задания — просмотр</title>
<style>
${css}
</style>
</head>
<body>
<div class="view-bar">Просмотр платформы — ввод здесь не сохраняется, данные вымышленные. Посмотреть как:
  <a href="#s-home">уроки MASTER</a> · <a href="#s-home-expert">уроки EXPERT</a> · <a href="#s-admin-progress">администратор</a> · <a href="#s-login">экран входа</a></div>
${sections}
</body>
</html>
`.replace(/onsubmit="return false"/g, ""); // и без обработчиков: формы здесь только для вида

if (/<script/i.test(html) || /\son\w+=/i.test(html)) throw new Error("В просмотре остались скрипты");
fs.mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../dist/Sales-Academy-prosmotr.html", import.meta.url), html);
console.log(`dist/Sales-Academy-prosmotr.html: ${(html.length / 1024).toFixed(0)} KB, экранов: ${order.length}`);
