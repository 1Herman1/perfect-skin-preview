import { readFileSync, writeFileSync } from 'node:fs';

const DEPLOY = new URL('..', import.meta.url).pathname;
const base = readFileSync(`${DEPLOY}index.html`, 'utf8');
const logos = JSON.parse(readFileSync(new URL('./logos.json', import.meta.url), 'utf8'));

const OLD_LOGO = /<div class="logo">PERFECT SKIN<\/div>\s*<div class="logo-sub">Испанская космецевтика<\/div>/;

const FONT_LINK = `\t<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">\n</head>`;

if (!OLD_LOGO.test(base)) throw new Error('Не найден блок логотипа в шапке');
if (!base.includes('</head>')) throw new Error('Не найден </head>');

for (const l of logos) {
	let out = base.replace(OLD_LOGO, l.html);
	out = out.replace('</head>', FONT_LINK);

	// Переключатель логотипов — только для превью.
	const links = logos.map((q) => `\t\t<a href="${q.file}"${q.file === l.file ? ' aria-current="page"' : ''} title="${q.name}">${q.n}</a>`).join('\n');
	const switcher = `
	<style>
${l.css}

		.pv-switch {
			position: fixed; z-index: 999; right: 16px; bottom: 16px;
			display: flex; align-items: center; gap: 4px;
			padding: 6px 14px 6px 6px; border-radius: 999px;
			background: rgba(var(--rgb-text), 0.92);
			box-shadow: 0 8px 24px -8px rgba(var(--rgb-text), 0.5);
			font-family: var(--font-text);
		}
		.pv-switch b { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-bg); padding: 0 8px; opacity: 0.7; }
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
	out = out.replace('</body>', `${switcher}</body>`);
	writeFileSync(`${DEPLOY}${l.file}`, out);
}

console.log('логотипы собраны:', logos.map((l) => l.file).join(', '));
