# HLEB HLYABA — Interactive Portfolio

An experimental single-page portfolio built around cinematic scroll choreography, liquid-glass interfaces and interactive project studies.

**Live site:** https://lomatoq.github.io/Portfolio-Website/

Touch scrolling and Safari composition fixes: [FLOW63](docs/FLOW63_SAFARI_RU.md). Career glass now moves with its DOM text on touch screens; 3D resolution and MSAA are unchanged. Project entrances and nested media viewer: [FLOW62](docs/FLOW62_PERFORMANCE_RU.md). Earlier measurements: [FLOW61](docs/FLOW61_PERFORMANCE_RU.md).

## What is inside

- Animated professional journey and project chapters
- Responsive desktop and mobile layouts
- Interactive visual studies and media galleries
- Nested case-study overlays with translucent glass styling
- Keyboard, touch and reduced-motion support
- A self-contained `index.html` that can also be opened locally

The current project imagery and videos are illustrative placeholders. They are clearly labelled in the interface and can be replaced through `content/media.json`.

## Run locally

Open `index.html` directly, or serve the repository from any static server:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

## Editing

Editable CSS and JavaScript live in `src/`. After changing them, rebuild the embedded single-file version:

```bash
python rebuild.py
```

Media configuration and replacement notes are documented in `content/media.json` and `docs/MEDIA_SCHEMA_RU.md`.

## Deployment

Every push to `main` deploys the repository to GitHub Pages through `.github/workflows/pages.yml`. The same public URL works on desktop and mobile.

## Русское описание

Экспериментальное портфолио с кинематографичной прокруткой, интерактивными проектами и полупрозрачным liquid-glass интерфейсом. Сайт адаптирован для компьютеров и телефонов, поддерживает touch-навигацию, клавиатуру и режим уменьшенной анимации.

Текущие изображения и видео используются как демонстрационные материалы и подписаны внутри интерфейса. Инструкция по замене контента находится в `docs/MEDIA_SCHEMA_RU.md`.

На телефоне вертикальные свайпы используют штатную прокрутку браузера и его инерцию в обеих ориентациях. Незавершённый вход в проект доводится до полной композиции после отпускания пальца. На компьютере обычный скролл плавно раскрывает проект; быстрый ввод и разворот сразу принимают управление. Внутренние карточки можно листать непрерывно.

Подробности последнего обновления и проверки: [FLOW62](docs/FLOW62_PERFORMANCE_RU.md). Предыдущие изменения: `docs/FLOW60_TOUCH_RU.md`, `docs/FLOW59_QA_RU.md`.
