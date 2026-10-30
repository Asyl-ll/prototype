# Lecture+ — Figma brand kit

Готовые ресурсы для постера и презентационных материалов. Все SVG можно перетащить прямо в Figma.

## Быстрый старт

1. Установите шрифты **Bricolage Grotesque** и **Public Sans** из Google Fonts.
2. Импортируйте `lecture-plus-brand-board.svg` — это общая доска со знаком, палитрой, типографикой и параметрами стекла.
3. Для постера на белом фоне используйте `logos/lecture-plus-wordmark-light.svg`.
4. Для маленького обозначения используйте `logos/lecture-plus-mark-color.svg`.
5. Для favicon/app tile используйте `logos/lecture-plus-app-icon.svg`.

## Основная палитра — светлая тема

| Роль | HEX | RGB | CMYK (приблизительно) |
|---|---|---|---|
| Canvas | `#EDF4FF` | 237, 244, 255 | 7, 4, 0, 0 |
| Paper | `#FFFFFF` | 255, 255, 255 | 0, 0, 0, 0 |
| Ink | `#10182B` | 16, 24, 43 | 63, 44, 0, 83 |
| Ink soft | `#52617A` | 82, 97, 122 | 33, 20, 0, 52 |
| Accent | `#397FF2` | 57, 127, 242 | 76, 48, 0, 5 |
| Accent light | `#8CC1FF` | 140, 193, 255 | 45, 24, 0, 0 |
| Success | `#167452` | 22, 116, 82 | 81, 0, 29, 55 |
| Error | `#B43A47` | 180, 58, 71 | 0, 68, 61, 29 |

CMYK — стартовые значения. Для печати A1 обязательно используйте ICC-профиль типографии и сделайте цветопробу.

## Типографика

- Display / headings: **Bricolage Grotesque**, 700 или 600.
- Body / labels: **Public Sans**, 400, 500 или 600.
- Заголовки: плотный трекинг от `-2%` до `-4%`.
- Основной текст: трекинг `0%`, line-height 130–150%.

## Liquid Glass для Figma

### Standard glass

- Fill 1: `#FFFFFF`, 82%.
- Fill 2 / gradient end: `#F2F7FF`, 52%.
- Stroke: Inside, 1 px, `#FFFFFF`, 78%.
- Background blur: 24 px.
- Drop shadow: X 0, Y 12, Blur 35, Spread 0, `#2B426B`, 11%.
- Inner shadow/highlight: X 0, Y 1, Blur 0, `#FFFFFF`, 85%.
- Radius: 24 px for cards, 999 px for compact buttons.

### Strong glass

- Fill 1: `#FFFFFF`, 94%.
- Fill 2 / gradient end: `#EFF6FF`, 70%.
- Stroke: Inside, 1 px, `#FFFFFF`, 82%.
- Background blur: 30 px.
- Drop shadow: X 0, Y 24, Blur 70, `#294170`, 14%.
- Inner highlight: X 0, Y 1, Blur 0, `#FFFFFF`, 95%.

Для печати уменьшите blur до визуального минимума и увеличьте непрозрачность белой заливки: печать не воспроизводит живой backdrop blur.

## Использование логотипа

- Минимальная ширина wordmark в печати: 35 мм.
- Минимальный размер круглого знака: 8 мм.
- Защитное поле: не меньше диаметра знака `+` вокруг логотипа.
- Не растягивать, не менять пропорции, не использовать другой шрифт и не набирать `+` текстовым символом.
- На светлом фоне используйте тёмный wordmark; на тёмном или фото — reversed.

## Что отразить в постере

- Логотип и обещание: **From what you learned to what comes next.**
- Короткая проблема: scattered recordings, slides and notes.
- Поток: **Upload → Analysis → Next → Quiz → Tasks → Remind**.
- Одна крупная демонстрация интерфейса.
- Три результата: clear summary, likely next topics, checkable tasks and deadlines.
- QR-код и короткий адрес `lecture-plus-ict.vercel.app`.

Не перегружайте A1 технической архитектурой, лимитами файлов, формами авторизации и длинными юридическими текстами.
