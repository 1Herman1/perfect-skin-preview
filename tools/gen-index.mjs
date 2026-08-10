import { readFileSync, writeFileSync } from 'node:fs';

const DEPLOY = new URL('..', import.meta.url).pathname;
const palettes = JSON.parse(readFileSync(new URL('./palettes.json', import.meta.url), 'utf8'));

const NOTES = {
	1: 'Насыщенный кобальт на холодном фарфоровом фоне. Один акцент, без второго цвета — премиум держат воздух и типографика.',
	2: 'Приглушённое старое золото и глубокая морская синь. Мягкие тона, «тихая роскошь», благородство без блеска.',
	3: 'Белизна как основной материал, синий работает каплями: кнопка, цифра, бейдж. Аптечная точность и чистота.',
	4: 'Тёплое молоко вместо бежевой бумаги, настоящий горький шоколад вместо почти-чёрного, карамель в середине.',
	5: 'Предложение дизайнеров: лавровый зелёный и известковая стена. Зелёный крест — знак аптеки и намёк на активные растительные компоненты.',
};

const SWATCHES = ['color-bg', 'color-accent', 'color-accent-ink', 'color-text', 'color-dark-bg'];

const cards = palettes.map((p) => `
		<a class="card" href="${p.file}">
			<div class="card__swatches" aria-hidden="true">
${SWATCHES.map((k) => `\t\t\t\t<span style="background:${p.tokens[k]}"></span>`).join('\n')}
			</div>
			<div class="card__body">
				<div class="card__n">Вариант ${p.n}</div>
				<h2>${p.name}</h2>
				<p>${NOTES[p.n]}</p>
				<div class="card__hex">${SWATCHES.map((k) => p.tokens[k]).join(' · ')}</div>
				<span class="card__cta">Открыть макет →</span>
			</div>
		</a>`).join('\n');

const html = `<!doctype html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Perfect Skin — пять цветовых палитр</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&family=Golos+Text:wght@400;500;600&display=swap" rel="stylesheet">
	<style>
		*, *::before, *::after { box-sizing: border-box; }
		body {
			margin: 0; padding: clamp(32px, 6vw, 80px) clamp(20px, 5vw, 64px);
			background: #14131A; color: #F4EFE8;
			font-family: 'Golos Text', sans-serif; line-height: 1.5;
			-webkit-font-smoothing: antialiased;
		}
		header { max-width: 720px; margin-bottom: clamp(32px, 5vw, 56px); }
		.kicker {
			font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
			color: #9A948C; margin-bottom: 16px;
		}
		h1 {
			font-family: 'Montserrat', sans-serif; font-weight: 900;
			font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.02; letter-spacing: -0.02em;
			text-transform: uppercase; margin: 0 0 16px;
		}
		header p { color: #B5AFA6; margin: 0; max-width: 60ch; }
		.grid {
			display: grid; gap: 20px;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		}
		.card {
			display: flex; flex-direction: column;
			border-radius: 16px; overflow: hidden; text-decoration: none;
			background: #1E1C24; color: inherit;
			transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
		}
		.card:hover { transform: translateY(-4px); }
		.card:focus-visible { outline: 2px solid #F4EFE8; outline-offset: 3px; }
		.card__swatches { display: flex; height: 96px; }
		.card__swatches span { flex: 1; }
		.card__body { padding: 24px; display: flex; flex-direction: column; flex: 1; }
		.card__n {
			font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
			text-transform: uppercase; color: #9A948C; margin-bottom: 8px;
		}
		.card h2 {
			font-family: 'Montserrat', sans-serif; font-weight: 700;
			font-size: 1.25rem; line-height: 1.15; margin: 0 0 12px;
		}
		.card p { font-size: 14px; color: #B5AFA6; margin: 0 0 16px; }
		.card__hex {
			font-size: 11px; letter-spacing: 0.02em; color: #6E6A66;
			margin-top: auto; padding-bottom: 12px; word-spacing: 0.1em;
		}
		.card__cta { font-size: 14px; font-weight: 600; color: #F4EFE8; }
		footer { margin-top: clamp(32px, 5vw, 56px); font-size: 13px; color: #6E6A66; max-width: 70ch; }
		@media (prefers-reduced-motion: reduce) {
			.card { transition: none; }
			.card:hover { transform: none; }
		}
	</style>
</head>
<body>
	<header>
		<div class="kicker">Perfect Skin · ребрендинг</div>
		<h1>Пять цветовых палитр</h1>
		<p>Одна и та же главная страница в пяти цветовых решениях. Вёрстка, тексты и структура везде одинаковые — сравнивается только цвет. Внутри каждого макета справа снизу есть переключатель: можно прыгать между палитрами, не возвращаясь сюда.</p>
	</header>
	<main class="grid">${cards}
	</main>
	<footer>
		Контрастность всех палитр проверена расчётом по WCAG 2.1: основной текст, вторичный текст, кнопки, бейджи и тёмные секции проходят норму 4.5:1 с запасом.
	</footer>
</body>
</html>
`;

writeFileSync(`${DEPLOY}palettes.html`, html);
console.log('palettes.html собран,', palettes.length, 'вариантов');
