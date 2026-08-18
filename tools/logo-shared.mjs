// Опечатка в имени ключа иначе молча подставляет undefined в CSS, и знак
// пропадает без единой ошибки — проверяем на входе.
export function requireBrand(brand, keys) {
	const missing = keys.filter((k) => !brand[k]);
	if (missing.length) throw new Error(`brand.json: нет ключей — ${missing.join(', ')}`);
	return brand;
}

// Общая геометрия знака: монограмма + волосяная черта + блок надписи.
// Между вариантами различается только начертание надписи (tools/logos.json).
// Импортируется и сборщиком макетов, и витриной — чтобы знак выглядел
// одинаково в обоих местах.
export const SHARED_CSS = `		.bm {
			display: flex;
			align-items: center;
			gap: 14px;
			text-decoration: none;
			/* Знак — ссылка на главную, поэтому держим тач-таргет. */
			min-height: 44px;
		}

		/* Монограмма: засечные P и S внахлёст, как в клиентском образце.
		   Нахлёст задан на P, а не на S: тогда он не «плывёт» при правке
		   кегля S. Сдвиг вниз компенсирует метрики Playfair — иначе знак
		   садится ниже надписи при выравнивании по центру. */
		.bm__mono {
			display: inline-flex;
			align-items: baseline;
			font-family: 'Playfair Display', Georgia, serif;
			font-weight: 500;
			font-size: 42px;
			line-height: 1;
			margin-bottom: 4px;
			color: var(--color-mark);
			white-space: nowrap;
		}
		.bm__p { margin-right: -0.34em; }
		.bm__s { font-size: 1.12em; }

		/* Высота черты = оптическая высота монограммы (cap-height S),
		   а не её кегль: иначе черта выпирает ниже знака. */
		.bm__rule { width: 1px; height: 32px; background: var(--color-mark); flex: none; }

		.bm__words { display: block; }
		.bm__name {
			display: block;
			text-transform: uppercase;
			color: var(--color-text);
			line-height: 1;
			white-space: nowrap;
		}
		.bm__sub {
			display: block;
			font-family: var(--font-heading);
			text-transform: uppercase;
			color: var(--color-text-muted);
			line-height: 1;
			margin-top: 5px;
			white-space: nowrap;
		}`;

// Поведение знака в шапке макета, где рядом теснится навигация.
// Название бренда живёт до 400px: мобильный — основной канал розницы,
// и оставлять там голое «PS» без названия нельзя.
export const HEADER_ONLY_CSS = `		@media (max-width: 900px) {
			.bm { gap: 10px; }
			.bm__mono { font-size: 34px; }
			.bm__rule { height: 26px; }
			.bm__name { font-size: 14px; letter-spacing: 0.16em; }
			.bm__sub { display: none; }
		}
		@media (max-width: 400px) {
			.bm__rule, .bm__words { display: none; }
		}`;
