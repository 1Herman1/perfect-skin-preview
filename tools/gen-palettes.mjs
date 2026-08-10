import { readFileSync, writeFileSync } from 'node:fs';

const DEPLOY = new URL('..', import.meta.url).pathname;
const base = readFileSync(`${DEPLOY}index.html`, 'utf8');
const palettes = JSON.parse(readFileSync(new URL('./palettes.json', import.meta.url), 'utf8'));

const KEYS = [
	'color-bg', 'color-text', 'color-text-muted', 'color-accent', 'color-accent-ink',
	'color-accent-text', 'color-divider', 'color-muted', 'color-dark-bg', 'color-dark-text',
	'color-photo-bg', 'rgb-bg', 'rgb-text', 'rgb-accent',
];

// Контраст по WCAG 2.1.
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
	const [r, g, b] = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16));
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
	const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
};

const CHECKS = [
	['текст / фон', 'color-text', 'color-bg', 4.5],
	['вторичный текст / фон', 'color-text-muted', 'color-bg', 4.5],
	['текст кнопки / кнопка', 'color-accent-text', 'color-accent-ink', 4.5],
	['акцент / фон', 'color-accent-ink', 'color-bg', 4.5],
	['текст / тёмная секция', 'color-dark-text', 'color-dark-bg', 4.5],
	['текст / бейдж', 'color-text', 'color-accent', 4.5],
];

let failures = 0;
for (const p of palettes) {
	for (const k of KEYS) {
		if (!p.tokens[k]) throw new Error(`${p.file}: нет токена --${k}`);
	}

	const block = KEYS.map((k) => `\t\t\t--${k}: ${p.tokens[k]};`).join('\n');
	let out = base.replace(
		/(\t\t:root \{\n)[\s\S]*?(\n\n\t\t\t--radius-pill)/,
		`$1${block}$2`
	);
	if (out === base) throw new Error(`${p.file}: блок :root не найден`);

	// Переопределения конкретной палитры (файл в tools/overrides/), идут
	// последними в <style> и перебивают базовые правила.
	if (p.overrides) {
		const css = readFileSync(new URL(`./overrides/${p.overrides}`, import.meta.url), 'utf8');
		const marked = out.replace('\t</style>', `\n\t\t/* --- Переопределения палитры «${p.name}» --- */\n${css}\n\t</style>`);
		if (marked === out) throw new Error(`${p.file}: не найден конец <style>`);
		out = marked;
	}

	// Переключатель палитр — только для превью, в боевую вёрстку не идёт.
	const links = palettes.map((q) => `\t\t<a href="${q.file}"${q.file === p.file ? ' aria-current="page"' : ''} title="${q.name}"><span style="background:${q.tokens['color-accent-ink']}"></span>${q.n}</a>`).join('\n');
	const switcher = `
	<style>
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
			display: flex; flex-direction: column; align-items: center; justify-content: center;
			gap: 3px; min-width: 44px; min-height: 44px;
			border-radius: 999px; text-decoration: none;
			font-size: 11px; font-weight: 600; color: var(--color-bg);
			transition: background-color 160ms var(--ease-out);
		}
		.pv-switch a span { width: 16px; height: 16px; border-radius: 999px; display: block; }
		.pv-switch a:hover { background: rgba(var(--rgb-bg), 0.16); }
		.pv-switch a[aria-current="page"] { background: rgba(var(--rgb-bg), 0.24); }
		.pv-switch a:focus-visible { outline: 2px solid var(--color-bg); outline-offset: 2px; }
		@media print { .pv-switch { display: none; } }
	</style>
	<nav class="pv-switch" aria-label="Выбор цветовой палитры">
		<b>Палитра</b>
${links}
	</nav>
`;
	out = out.replace('</body>', `${switcher}</body>`);
	writeFileSync(`${DEPLOY}${p.file}`, out);

	const rows = CHECKS.map(([name, a, b, min]) => {
		const r = ratio(p.tokens[a], p.tokens[b]);
		const ok = r >= min;
		if (!ok) failures++;
		return `    ${ok ? '✓' : '✗'} ${name.padEnd(26)} ${r.toFixed(2)}:1`;
	});
	console.log(`\n${p.file} — ${p.name}`);
	console.log(rows.join('\n'));
}

console.log(failures ? `\n✗ провалов контраста: ${failures}` : '\n✓ все контрасты в норме');
process.exit(failures ? 1 : 0);
