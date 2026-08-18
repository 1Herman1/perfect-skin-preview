import { readFileSync, writeFileSync } from 'node:fs';

const DEPLOY = new URL('..', import.meta.url).pathname;
const logos = JSON.parse(readFileSync(new URL('./logos.json', import.meta.url), 'utf8'));

// Утверждённая палитра «Старое золото и морская синь» — витрина показывает
// логотипы ровно в тех цветах, что на боевом сайте.
const PALETTE = `
			--color-bg: #F4F2EC;
			--color-text: #14202E;
			--color-text-muted: #55606E;
			--color-accent: #E4D3AC;
			--color-accent-ink: #1F3A5F;
			--color-accent-text: #F6F1E3;
			--color-divider: #D8D1BE;
			--color-muted: #EAE6DA;
			--rgb-bg: 244, 242, 236;
			--rgb-text: 20, 32, 46;
			--rgb-accent: 228, 211, 172;
			--font-heading: 'Montserrat', sans-serif;
			--font-text: 'Golos Text', sans-serif;
			--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`;

const allCss = logos.map((l) => l.css).join('\n');

// В карточке логотип рендерится «как есть», но ссылки внутри знака кликать не
// нужно — оборачиваем в контейнер и гасим переход по внутреннему <a>.
// Карточка — уже ссылка, поэтому знак внутри рендерим без собственного <a>
// (вложенные ссылки недопустимы и ломают разметку): меняем на <span>.
const asSpan = (html) => html.trim().replace(/^<a /, '<span ').replace(/<\/a>$/, '</span>');

const cards = logos.map((l) => `
		<a class="card" href="${l.file}">
			<div class="card__stage">
				${asSpan(l.html)}
			</div>
			<div class="card__body">
				<div class="card__n">Лого ${l.n}</div>
				<h2>${l.name}</h2>
				<p>${l.note}</p>
				<span class="card__cta">Открыть макет →</span>
			</div>
		</a>`).join('\n');

const html = `<!doctype html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Perfect Skin — варианты логотипа</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;900&family=Golos+Text:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
	<style>
		:root {${PALETTE}}
		*, *::before, *::after { box-sizing: border-box; }
		body {
			margin: 0; padding: clamp(32px, 6vw, 80px) clamp(20px, 5vw, 64px);
			background: #14131A; color: #F4EFE8;
			font-family: 'Golos Text', sans-serif; line-height: 1.5;
			-webkit-font-smoothing: antialiased;
		}
		header { max-width: 720px; margin-bottom: clamp(32px, 5vw, 56px); }
		.kicker { font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #9A948C; margin-bottom: 16px; }
		h1 { font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.02; letter-spacing: -0.02em; text-transform: uppercase; margin: 0 0 16px; }
		header p { color: #B5AFA6; margin: 0; max-width: 60ch; }
		.grid { display: flex; flex-direction: column; gap: 20px; }
		.card { display: grid; grid-template-columns: minmax(0, 1fr) 340px; border-radius: 16px; overflow: hidden; text-decoration: none; background: #1E1C24; color: inherit; transition: transform 200ms var(--ease-out); }
		.card:hover { transform: translateY(-4px); }
		.card:focus-visible { outline: 2px solid #F4EFE8; outline-offset: 3px; }
		.card__stage { display: flex; align-items: center; min-height: 160px; padding: 40px; background: var(--color-bg); }
		/* Знак внутри карточки — не интерактивен, вся карточка и есть ссылка. */
		.card__stage .brandmark { pointer-events: none; }
		.card__body { padding: 28px; display: flex; flex-direction: column; }
		@media (max-width: 720px) { .card { grid-template-columns: 1fr; } }
		.card__n { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #9A948C; margin-bottom: 8px; }
		.card h2 { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 1.25rem; line-height: 1.15; margin: 0 0 12px; }
		.card p { font-size: 14px; color: #B5AFA6; margin: 0 0 16px; }
		.card__cta { font-size: 14px; font-weight: 600; color: #F4EFE8; margin-top: auto; }
		footer { margin-top: clamp(32px, 5vw, 56px); font-size: 13px; color: #6E6A66; max-width: 70ch; }

${allCss}
		@media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }
	</style>
</head>
<body>
	<header>
		<div class="kicker">Perfect Skin · знак</div>
		<h1>Варианты логотипа</h1>
		<p>Одна и та же главная страница в утверждённой палитре — меняется только логотип в шапке. Внутри каждого макета справа снизу переключатель: можно прыгать между знаками, не возвращаясь сюда.</p>
	</header>
	<main class="grid">${cards}
	</main>
	<footer>
		Знаки собраны из шрифтов (Playfair Display для засечных начертаний, Montserrat для модерна) — масштабируются без потери качества и перекрашиваются вместе с палитрой. Для печати и фавикона победивший знак отрисуем в вектор отдельно.
	</footer>
</body>
</html>
`;

writeFileSync(`${DEPLOY}logos.html`, html);
console.log('logos.html собран,', logos.length, 'вариантов');
