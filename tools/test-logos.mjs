// Проверка знака Perfect Skin: разметка, пути к файлам, вёрстка, доступность.
// Запуск: node tools/test-logos.mjs   (из папки deploy). Код выхода 1 при провале.
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = pkg;

const ROOT = new URL('..', import.meta.url).pathname;
const PAGES = ['index.html', 'palette-1.html', 'palette-2.html', 'palette-3.html', 'palette-4.html', 'palette-5.html'];
const TAGLINE = ['Назначают врачи.', 'Любит ваша кожа'];
const ASSETS = [
	'media/logo/logo-wordmark.png',
	'media/logo/logo-wordmark.webp',
	'media/logo/favicon-16.png',
	'media/logo/favicon-32.png',
	'media/logo/apple-touch-icon.png',
];

const results = [];
const check = (ok, name, why = '') => results.push([!!ok, name, why]);

// ── Файлы на месте ────────────────────────────────────────────────────────
for (const a of ASSETS) check(existsSync(ROOT + a), `[файлы] ${a} существует`, 'файла нет на диске');

// ── Разметка ──────────────────────────────────────────────────────────────
for (const page of PAGES) {
	const src = readFileSync(ROOT + page, 'utf8');
	const tag = `[${page}]`;
	const marks = src.match(/<a class="brandmark"/g) || [];
	check(marks.length === 1, `${tag} ровно один .brandmark`, `найдено ${marks.length}`);
	check(!/class="logo(-sub)?"/.test(src), `${tag} старая текстовая заглушка убрана`, 'остался .logo/.logo-sub');
	check(/<source srcset="media\/logo\/logo-wordmark\.webp"/.test(src), `${tag} подключён WebP-вариант`);
	check(/src="media\/logo\/logo-wordmark\.png"/.test(src), `${tag} путь к названию верный`);
	check(/rel="icon"[^>]*favicon-32\.png/.test(src), `${tag} фавикон 32px объявлен`);
	check(/rel="apple-touch-icon"/.test(src), `${tag} иконка для телефона объявлена`);
	for (const part of TAGLINE) check(src.includes(part), `${tag} подпись содержит «${part}»`);
	check(/alt="Perfect Skin"/.test(src), `${tag} у картинки осмысленный alt`);
}

// ── Поведение в браузере ──────────────────────────────────────────────────
const b = await chromium.launch();
for (const width of [1440, 1024, 768, 390, 360]) {
	const p = await b.newPage({ viewport: { width, height: 800 } });
	const errs = [];
	p.on('pageerror', (e) => errs.push(String(e)));
	await p.goto(`file://${ROOT}index.html`);
	await p.evaluate(() => document.fonts.ready);
	await p.waitForTimeout(500);

	const r = await p.evaluate(() => {
		const mark = document.querySelector('.brandmark');
		const img = document.querySelector('.brandmark__name');
		const burger = document.querySelector('.nav-details');
		const nav = document.querySelector('.nav');
		const box = mark.getBoundingClientRect();
		const ib = img.getBoundingClientRect();
		const hits = (a, c) => c && !(a.right <= c.left || a.left >= c.right || a.bottom <= c.top || a.top >= c.bottom);
		const bb = burger?.getBoundingClientRect();
		const nb = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
		return {
			h: box.height, w: box.width,
			imgW: ib.width, imgH: ib.height,
			ratio: img.naturalWidth / img.naturalHeight,
			loaded: img.complete && img.naturalWidth > 0,
			overBurger: hits(ib, bb), overNav: hits(ib, nb),
			hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
			label: mark.getAttribute('aria-label') || '',
		};
	});

	const t = `@${width}`;
	check(r.loaded, `${t} картинка знака загрузилась`, 'файл не найден или битый');
	check(!r.hscroll, `${t} нет горизонтальной прокрутки`);
	check(!r.overBurger, `${t} знак не наезжает на бургер`);
	check(!r.overNav, `${t} знак не наезжает на меню`);
	check(r.h >= 44, `${t} тач-таргет знака ≥44px`, `высота ${r.h.toFixed(1)}px`);
	check(Math.abs(r.imgW / r.imgH - r.ratio) < 0.05, `${t} пропорции знака не искажены`,
		`показано ${(r.imgW / r.imgH).toFixed(2)}, исходно ${r.ratio.toFixed(2)}`);
	check(r.label.includes('Perfect Skin'), `${t} внятный aria-label`, `«${r.label}»`);
	check(errs.length === 0, `${t} нет ошибок JS`, errs.join('; '));
	await p.close();
}
await b.close();

console.log('\n=== ТЕСТ ЗНАКА PERFECT SKIN ===\n');
for (const [ok, name, why] of results) {
	console.log(`${ok ? '✓' : '✗'} ${name}`);
	if (!ok && why) console.log(`     └─ ${why}`);
}
const failed = results.filter((r) => !r[0]).length;
console.log(`\nВсего: ${results.length}, провалено: ${failed}\n`);
process.exit(failed ? 1 : 0);
