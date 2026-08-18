import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
import { readFileSync } from 'node:fs';

const { chromium } = pkg;
const DEPLOY = new URL('..', import.meta.url).pathname;

const VARIANTS = [
	{ file: 'logo-1.html', weight: 'thin' },
	{ file: 'logo-2.html', weight: 'bold' },
];
const SHOWCASE = 'logos.html';
const WIDTHS = [1440, 1024, 390];

const results = [];
const ok = (name) => results.push([true, name]);
const fail = (name, why) => results.push([false, name, why]);
const check = (cond, name, why) => (cond ? ok(name) : fail(name, why));

const url = (f) => `file://${DEPLOY}${f}`;

// ---------- статический разбор разметки ----------

function parseChecks() {
	const skeletons = {};

	for (const v of VARIANTS) {
		const src = readFileSync(`${DEPLOY}${v.file}`, 'utf8');
		const tag = `[разметка ${v.file}]`;

		const headers = src.match(/<header[\s>]/g) || [];
		check(headers.length === 1, `${tag} ровно один <header>`, `найдено ${headers.length}`);

		const ids = [...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
		const dupes = [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];
		check(dupes.length === 0, `${tag} нет дублирующихся id`, `дубли: ${dupes.join(', ')}`);

		check(!/class="[^"]*\blogo(-sub)?\b[^"]*"/.test(src),
			`${tag} старая разметка .logo/.logo-sub удалена`, 'в HTML остались элементы старой заглушки');
		const deadCss = ['.logo', '.logo-sub'].filter((s) => new RegExp(`^\\s*\\${s} \\{`, 'm').test(src));
		check(deadCss.length === 0, `${tag} мёртвые CSS-правила старой заглушки удалены`,
			`остались правила: ${deadCss.join(', ')} — генератор заменяет только разметку, стили не чистит`);

		const favicon = src.match(/<link[^>]*rel="icon"[^>]*>/i);
		const href = favicon && favicon[0].match(/href="([^"]*)"/);
		check(!!favicon, `${tag} объявлен link[rel=icon]`, 'фавикон не найден');
		check(!!(href && href[1].trim().length > 10), `${tag} фавикон непустой`, 'href фавикона пуст');

		// скелет знака: теги + классы без вариантных модификаторов
		const mark = src.match(/<a class="brandmark[\s\S]*?<\/a>/);

		// тексты проверяем внутри самого знака: .pv-switch — служебный виджет
		// предпросмотра и законно упоминает оба варианта в title.
		const markHtml = mark ? mark[0] : '';
		check(markHtml.includes('Perfect Skin'), `${tag} в знаке присутствует «Perfect Skin»`, 'название не найдено');
		// Заказчик убрал строку-дескриптор из знака: в лок-апе остаются
		// только монограмма и название.
		for (const tagline of ['Cosmeceuticals', 'космецевтика', 'КОСМЕЦЕВТИКА']) {
			check(!markHtml.includes(tagline), `${tag} в знаке нет подписи «${tagline}»`,
				'строка-дескриптор осталась в знаке');
		}
		check(!/bm__sub/.test(src), `${tag} нет мёртвых стилей подписи`,
			'класс .bm__sub остался в файле');

		if (!mark) {
			fail(`${tag} блок .brandmark разобран`, 'не найден в исходнике');
			continue;
		}
		skeletons[v.file] = [...mark[0].matchAll(/<(\w+)\s+class="([^"]*)"/g)]
			.map((m) => `${m[1]}.${m[2].split(/\s+/).filter((c) => !c.includes('--')).join('.')}`)
			.join(' > ');
	}

	const [a, b] = VARIANTS.map((v) => skeletons[v.file]);
	check(a && b && a === b, '[разметка] структура знака одинакова в обоих вариантах',
		`logo-1: ${a}\n     logo-2: ${b}`);

	// витрина
	const show = readFileSync(`${DEPLOY}${SHOWCASE}`, 'utf8');
	for (const v of VARIANTS) {
		const n = (show.match(new RegExp(`href="${v.file}"`, 'g')) || []).length;
		check(n === 1, `[витрина] ровно одна ссылка на ${v.file}`, `найдено ${n}`);
	}
	const others = [...show.matchAll(/href="([a-z0-9-]+\.html)"/gi)].map((m) => m[1])
		.filter((f) => !VARIANTS.some((v) => v.file === f));
	check(others.length === 0, '[витрина] нет ссылок на посторонние страницы', `лишние: ${[...new Set(others)].join(', ')}`);
}

// ---------- браузерные проверки ----------

async function runPage(browser, v) {
	const tag = `[${v.file}]`;
	const weights = {};

	for (const width of WIDTHS) {
		const ctx = await browser.newContext({ viewport: { width, height: 900 } });
		const page = await ctx.newPage();
		const errors = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await page.goto(url(v.file), { waitUntil: 'load' });
		// Размеры знака зависят от загрузки веб-шрифтов — иначе замеры плавают.
		await page.evaluate(() => document.fonts.ready).catch(() => {});
		await page.waitForTimeout(300);

		const d = await page.evaluate(() => {
			const marks = document.querySelectorAll('.brandmark');
			const m = marks[0];
			const nav = document.querySelector('.nav');
			const navVisible = nav && nav.getBoundingClientRect().width > 0 &&
				getComputedStyle(nav).display !== 'none';
			const r = (el) => {
				if (!el) return null;
				const b = el.getBoundingClientRect();
				return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, bo: b.bottom };
			};
			const name = document.querySelector('.bm__name');
			const sw = document.querySelectorAll('.pv-switch');
			return {
				markCount: marks.length,
				inHeader: !!(m && m.closest('header')),
				hasMono: !!(m && m.querySelector('.bm__mono')),
				hasRule: !!(m && m.querySelector('.bm__rule')),
				hasWords: !!(m && m.querySelector('.bm__words')),
				aria: m ? (m.getAttribute('aria-label') || '') : '',
				monoHidden: !!(m && m.querySelector('.bm__mono[aria-hidden="true"]')),
				ruleHidden: !!(m && m.querySelector('.bm__rule[aria-hidden="true"]')),
				nameWeight: name ? getComputedStyle(name).fontWeight : null,
				markBox: r(m),
				navBox: navVisible ? r(nav) : null,
				scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
				switchCount: sw.length,
				switchLinks: sw.length ? sw[0].querySelectorAll('a').length : 0,
			};
		});

		if (width === WIDTHS[0]) {
			check(d.markCount === 1, `${tag} ровно один .brandmark`, `найдено ${d.markCount}`);
			check(d.inHeader, `${tag} знак находится в <header>`, 'знак вне шапки');
			check(d.hasMono && d.hasRule && d.hasWords, `${tag} внутри знака .bm__mono, .bm__rule, .bm__words`,
				`mono=${d.hasMono} rule=${d.hasRule} words=${d.hasWords}`);
			check(d.aria.trim().length >= 8 && /Perfect Skin/i.test(d.aria),
				`${tag} внятный aria-label у знака`, `aria-label="${d.aria}"`);
			check(d.monoHidden && d.ruleHidden, `${tag} декоративные части помечены aria-hidden`,
				`mono=${d.monoHidden} rule=${d.ruleHidden}`);
			check(d.switchCount === 1, `${tag} переключатель .pv-switch присутствует`, `найдено ${d.switchCount}`);
			check(d.switchLinks === 2, `${tag} в .pv-switch ровно 2 ссылки`, `найдено ${d.switchLinks}`);
			weights.value = d.nameWeight;
		}

		const box = d.markBox;
		check(!!box && box.w > 0 && box.h > 0, `${tag} @${width} знак имеет ненулевые размеры`,
			box ? `${box.w}×${box.h}` : 'элемент не найден');

		if (d.navBox && box) {
			const overlap = box.r > d.navBox.x + 1 && d.navBox.r > box.x + 1 &&
				box.bo > d.navBox.y + 1 && d.navBox.bo > box.y + 1;
			check(!overlap, `${tag} @${width} знак не перекрывает .nav`,
				`знак [${box.x.toFixed(0)}..${box.r.toFixed(0)}] пересекается с nav [${d.navBox.x.toFixed(0)}..${d.navBox.r.toFixed(0)}]`);
		}

		check(d.scrollX <= 0, `${tag} @${width} нет горизонтальной прокрутки`, `переполнение ${d.scrollX}px`);

		if (width === 390) {
			check(!!box && box.h >= 44, `${tag} @390 тач-таргет знака ≥44px по высоте`,
				box ? `высота ${box.h.toFixed(1)}px` : 'элемент не найден');
		}

		check(errors.length === 0, `${tag} @${width} нет JS-ошибок`, errors.join(' | '));
		await ctx.close();
	}
	return weights.value;
}

async function showcaseChecks(browser) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await ctx.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto(url(SHOWCASE), { waitUntil: 'load' });

	const d = await page.evaluate(() => ({
		nested: document.querySelectorAll('a a').length,
		hrefs: [...document.querySelectorAll('a[href$=".html"]')].map((a) => a.getAttribute('href')),
	}));

	check(d.nested === 0, '[витрина] нет вложенных <a> внутри <a>', `найдено ${d.nested}`);
	const set = new Set(d.hrefs);
	check(VARIANTS.every((v) => set.has(v.file)) && set.size === VARIANTS.length,
		'[витрина] ссылается ровно на оба варианта', `ссылки: ${[...set].join(', ')}`);
	check(errors.length === 0, '[витрина] нет JS-ошибок', errors.join(' | '));
	await ctx.close();
}

// ---------- прогон ----------

parseChecks();

const browser = await chromium.launch();
const w1 = await runPage(browser, VARIANTS[0]);
const w2 = await runPage(browser, VARIANTS[1]);
await showcaseChecks(browser);
await browser.close();

const n1 = Number(w1);
const n2 = Number(w2);
check(!!w1 && !!w2 && n1 !== n2, '[оба] начертания надписи РАЗНЫЕ у двух вариантов',
	`logo-1 font-weight=${w1}, logo-2 font-weight=${w2}`);
check(n1 < n2, '[оба] logo-1 тоньше, logo-2 жирнее', `logo-1=${w1}, logo-2=${w2}`);

console.log('\n=== ТЕСТ ЛОГОТИПОВ PERFECT SKIN ===\n');
for (const [pass, name, why] of results) {
	console.log(`${pass ? '✓' : '✗'} ${name}`);
	if (!pass && why) console.log(`     └─ ${why}`);
}
const failed = results.filter((r) => !r[0]).length;
console.log(`\nВсего: ${results.length}, провалено: ${failed}\n`);
process.exit(failed ? 1 : 0);
