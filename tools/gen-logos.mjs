import { readFileSync, writeFileSync } from 'node:fs';
import { SHARED_CSS, HEADER_ONLY_CSS, requireBrand } from './logo-shared.mjs';

const DEPLOY = new URL('..', import.meta.url).pathname;
const base = readFileSync(`${DEPLOY}index.html`, 'utf8');
const logos = JSON.parse(readFileSync(new URL('./logos.json', import.meta.url), 'utf8'));
const brand = requireBrand(JSON.parse(readFileSync(new URL('./brand.json', import.meta.url), 'utf8')),
	['goldOnDark', 'goldOnLight', 'faviconNavy', 'faviconGold']);

const OLD_LOGO = /<div class="logo">PERFECT SKIN<\/div>\s*<div class="logo-sub">Испанская космецевтика<\/div>/;

// Фавикон по клиентскому образцу: тёмно-синяя скруглённая плитка, золотая PS.
const enc = (hex) => hex.replace('#', '%23');
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${enc(brand.faviconNavy)}"/><text x="32" y="45" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="36" font-weight="700" fill="${enc(brand.faviconGold)}">PS</text></svg>`;

const HEAD_EXTRA = `\t<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Montserrat:wght@300;400;700;800;900&display=swap" rel="stylesheet">
\t<link rel="icon" href="data:image/svg+xml,${FAVICON_SVG}">
</head>`;


if (!OLD_LOGO.test(base)) throw new Error('Не найден блок логотипа в шапке');
if (!base.includes('</head>')) throw new Error('Не найден </head>');

// Разметка старой текстовой заглушки заменена знаком, поэтому её правила
// становятся мёртвым грузом — вырезаем, чтобы в файле не оставалось стилей
// без владельца.
const DEAD_RULES = [
	/\n\t\t\.logo \{[^}]*\}\n/,
	/\n\t\t\.logo-sub \{[^}]*\}\n/,
	/\n\t\t\t\.logo \{[^}]*\}\n/,
];

for (const l of logos) {
	let out = base.replace(OLD_LOGO, l.html);
	out = out.replace('</head>', HEAD_EXTRA);
	for (const rule of DEAD_RULES) out = out.replace(rule, '\n');

	const links = logos.map((q) => `\t\t<a href="${q.file}"${q.file === l.file ? ' aria-current="page"' : ''} title="${q.name}">${q.n}</a>`).join('\n');
	const block = `
	<style>
		:root {
			--color-gold: ${brand.goldOnDark};
			--color-gold-ink: ${brand.goldOnLight};
			--color-mark: var(--color-gold-ink);
		}
		/* На тёмных поверхностях знак возвращается к золоту борда. */
		footer, .pro-section, .cta-box, .bs { --color-mark: var(--color-gold); }
${SHARED_CSS}
${l.css}
${HEADER_ONLY_CSS}

		.pv-switch {
			position: fixed; z-index: 999; right: 16px; bottom: 16px;
			display: flex; align-items: center; gap: 4px;
			padding: 6px 14px 6px 6px; border-radius: 999px;
			background: rgba(var(--rgb-text), 0.92);
			box-shadow: 0 8px 24px -8px rgba(var(--rgb-text), 0.5);
			font-family: var(--font-text);
		}
		.pv-switch b {
			font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
			text-transform: uppercase; color: var(--color-bg);
			padding: 0 8px; opacity: 0.7;
		}
		.pv-switch a {
			display: grid; place-items: center;
			min-width: 44px; min-height: 44px;
			border-radius: 999px; text-decoration: none;
			font-size: 13px; font-weight: 600; color: var(--color-bg);
			transition: background-color 160ms var(--ease-out);
		}
		.pv-switch a:hover { background: rgba(var(--rgb-bg), 0.16); }
		.pv-switch a[aria-current="page"] { background: rgba(var(--rgb-bg), 0.24); }
		.pv-switch a:focus-visible { outline: 2px solid var(--color-bg); outline-offset: 2px; }
		@media print { .pv-switch { display: none; } }
	</style>
	<nav class="pv-switch" aria-label="Выбор логотипа">
		<b>Лого</b>
${links}
	</nav>
`;
	out = out.replace('</body>', `${block}</body>`);
	writeFileSync(`${DEPLOY}${l.file}`, out);
}

console.log('логотипы собраны:', logos.map((l) => l.file).join(', '));
