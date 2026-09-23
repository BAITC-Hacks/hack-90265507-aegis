# EKTiQ
Electrical procurement assistant for the EKT hackathon case.

## Run locally
Requires Node.js 22+ and npm. Install dependencies with `npm ci` separately in `backend` and `frontend`.
Copy `backend/.env.example` to `backend/.env`, and fill in the EKT API credentials.
For conversational AI, also set `OPENAI_API_KEY` and `OPENAI_MODEL` to a model available to your account supporting Responses structured outputs. Keep credentials on the backend; never use a VITE variable for secrets.

From `backend`: `npm run sync:catalog` when a catalog snapshot is needed, then `npm run dev` (port 3001).
From `frontend`: `npm run dev` (port 5173). Optional `VITE_API_URL` overrides the backend URL.

## Architecture and data
React UI → Express API → local EKT catalog index for candidate search → authenticated EKT detail API for prices, stock and specifications.
The assistant first produces a structured intent using recent conversation history. Deterministic code retrieves products and evaluates constraints. A second model request explains that evidence. AI requests disable response storage. Dialogues remain in process memory for 30 minutes (20 turns; at most 1000 conversations).
Without AI configuration the UI explicitly shows limited catalog mode. This mode handles basic product parameters and commands, not unrestricted conversation.
Product detail requests have a 10-second timeout, 30-second bounded cache and concurrency limit. Unknown prices/stock remain unknown; conflicting specification and description values remain visible.

## Product comparison
Select products from the catalog or assistant. /compare displays up to four products with specification differences, stock by warehouse, available certificates, source links, data timestamps and conflicting facts. “Only differences” reduces the table; refresh fetches fresh data.
The cart confirmation fetches fresh price/stock. Changed data requires another explicit confirmation. Chat messages cannot mutate the cart.

## Checks
Backend: `npm run typecheck`, `npm test`.
Frontend: `npm run build`, `npm run lint`.
Tests use fixtures for EKT; they do not verify a live AI account.

## Prototype boundaries
Cart, favorites and comparison are browser-memory state; no EKT checkout/order API is connected. A cart check is a snapshot, not a stock reservation. Production needs authenticated sessions, durable storage and a server-authoritative checkout.
Payment, delivery and minimum-order policies require verified partner data. Candidate suggestions do not certify electrical interchangeability. AI-generated explanations can be wrong; inspect the visible source facts before purchase.
Production deployment also needs an access-controlled AI endpoint, distributed rate limiting and monitoring; the current process-local limits are for a prototype.

## Functional buttons and imports
The header city selector updates the procurement city used in the request draft. Delivery, business and contact buttons open information pages, with a link to the official EKT site; unverified commercial terms are not invented.
Home search submits its input. Category buttons filter by explicit name-based rules because the index has no category IDs. Brand and sort selections reset pagination.
The analogue page accepts a source article or technical requirements. Source products are excluded from suggestions; disputed source characteristics require clarification.
The local project page saves its name in this browser and exports the current selection as JSON. This is not an authenticated EKT account.
Checkout prepares a downloadable text request from the cart, city and comment. No order is submitted, no stock is reserved and no payment is accepted.

Document import supports XLSX, DOCX, text-layer PDF (up to 50 pages), CSV and TXT, up to 10 MB. Old XLS/DOC must be resaved. It extracts text for review, not an automatic guaranteed bill-of-materials match. Leave article/name only on each line, remove quantity/price columns, then search up to 30 lines. Formulas and document macros are not executed.
Photo import recognizes Russian/English marking text from JPG/PNG using Tesseract.js locally. It does not identify equipment solely by appearance. First use downloads OCR language data over the internet; the image itself is processed in the browser.
Documents/photos are not uploaded to the backend. Only the user-reviewed search lines are sent after clicking search. Scanned PDFs need separate OCR or manual transcription.

Browser checks: from frontend, run `npx playwright install chromium`, then `npm run test:e2e`.
For installed Edge use `PLAYWRIGHT_CHANNEL=msedge`; set `OCR_LIVE=1` to include the test that downloads real OCR language models.
Most browser tests stub product API responses; they test UI flows, not partner availability.

## Verified filters and city stock
Local catalog entries have id, name, article, price, image, URL and offers, but no warehouse quantities or technical properties. Detail API responses provide price, quantity, stores and properties (including TORGOVAYA_MARKA, OBYEM, NOMINALNYY_TOK, NOMINALNOE_NAPRYAZHENIE and KOLICHESTVO_POLYUSOV).
The retrieval timestamp is generated locally. EKT does not provide a price update timestamp in the inspected response. “Confirmed” identifies the EKT response and its retrieval time, not an independent guarantee of EKT's own data freshness. Each product has its own timestamp; a long search is not an atomic snapshot of prices and stock. Cart confirmation fetches fresh data again.

GET /api/catalog/search accepts q, page, limit, brand, category, productType, minPrice, maxPrice, city, inStock, current, poles, voltage, scan and sort (relevance, price-asc, price-desc, name, stock). Invalid numeric ranges/sort values return 400.
Price, stock and requested specifications are checked against detail responses before pagination. Missing prices, nonpositive request-only prices, expired snapshots and conflicting/missing requested specifications are excluded from strict filters. Name-based category grouping remains explicitly labelled.
For unfiltered browsing, only the requested page is enriched. For filtering/price/stock sorting, the default search verifies all text/category/brand candidates in the local catalog snapshot with bounded concurrency before pagination. An explicit scan limit can request partial coverage. Coverage is returned and shown; failed API requests do not become confirmed results. Large searches can take minutes. This covers matching entries in the local snapshot, not products absent from it, and is not an unrestricted semantic search or a full-catalog stock index.
City stock sums only warehouses explicitly naming that city. Астана matches Нур-Султан; both named Шымкент warehouses are summed. An unnamed/missing city warehouse is unknown, never substituted with the national total.
Product detail requests accept city; quantity is then city-specific, totalQuantity retains the global figure and stockCity identifies the scope. Cart confirmation re-fetches that city's quantity; changes require reconfirmation. A product already in the cart for another city must be removed explicitly before replacement.

Chat price filters use {operator, value, max?, currency:"KZT"} with lt/lte/gt/gte/eq/between. Inclusive ranges and thousands are normalized. Bare money values are not interpreted as articles. Price, stock, city and technical requirements survive follow-ups; changing category or explicitly clearing a price limit removes the relevant constraints.
Examples: “автоматические выключатели дешевле 50 000 ₸” → price < 50000; “только Legrand” retains this price; “только в наличии” additionally requires positive city stock; “от 30 до 50 тыс.” includes both limits.
GET /api/assistant/status exposes only configuration status and missing variable names. Set OPENAI_API_KEY and OPENAI_MODEL in backend/.env and restart the backend to enable LLM interpretation. Deterministic filtering works without those credentials.

Inspected catalog snapshot: 203 entries have no image. Product 25397 also returns image:null from EKT detail. Missing images are represented by placeholders, never generated or borrowed from another product.

## Требования прототипа и полный поиск

Архитектура: React/Vite отвечает за интерфейс, Express — за разбор запроса, фильтрацию и обращение к EKT. Локальный `backend/data/catalog.json` используется как индекс названий и артикулов; цены, остатки и характеристики для строгой фильтрации проверяются по API EKT. Инструкция запуска приведена в разделе Run locally; ключи находятся только в `backend/.env` и не передаются браузеру.

Запрос «дай светильник от 40000 до 50000 тенге» задаёт включительный диапазон `40000 <= price <= 50000`. Запрос «светильник меньше 50000 тенге» задаёт `price < 50000`: 49 999 подходит, 50 000 исключается. Поиск в чате проходит весь список кандидатов из локального индекса, соответствующих распознанному типу и бренду, а не первые 120 записей. Все подходящие результаты доступны через «Показать ещё»; число карточек на экране не ограничивает проверяемый список. Цена сама по себе не означает предпочтение товаров ближе к верхней границе бюджета.

Проверка выполняется с ограниченным числом одновременных обращений к EKT. Для широкого запроса она может занять несколько минут. Если EKT не ответил или не подтвердил обязательный параметр, товар не считается подходящим; сообщение и сведения об охвате показывают ограничения проверки. Нельзя утверждать, что получены все товары внешней платформы: охват ограничен текущим локальным снимком и правилами текстового поиска. Для обновления снимка используется `npm run sync:catalog`.

Состав корзины изменяется только после явного действия и подтверждения клиента; сообщения ассистенту не управляют корзиной. Перед добавлением повторно запрашиваются цена и остаток, а изменение данных требует повторного подтверждения. Изменение количества и удаление также запрашивают подтверждение. Прототип подготавливает файл заявки, но не создаёт заказ на стороне EKT и не резервирует остаток. Подключение реального заказа требует авторизации пользователя и проверки полномочий и подтверждения на сервере платформы.

Платёжные данные не запрашиваются и не должны попадать в чат, названия проектов, комментарии или импортируемые файлы. Распознаваемые сообщения с платёжными реквизитами отклоняются до отправки модели и сохранения в истории; такой фильтр не гарантирует распознавание всех возможных форматов. Форм оплаты в прототипе нет. Диалоги хранятся в памяти сервера до 30 минут, последние сообщения могут передаваться AI для обработки запроса; запросы к AI используют отключённое сохранение ответов. Это не заявление о полном отсутствии хранения у внешнего провайдера. Исходные документы и фотографии обрабатываются в браузере, на сервер отправляются только подтверждённые пользователем строки поиска. Для реального размещения нужны уведомление клиента об обработке данных, контроль доступа, настройка журналов и согласованная политика удаления.

Объяснение кандидатов опирается на проверенные параметры: карточки показывают совпадения, различия, неизвестные или противоречивые характеристики, цену и источник. Аналог подбирается по типу и обязательным параметрам исходного товара с учётом наличия; совпадения не являются гарантией технической взаимозаменяемости. Неизвестная цена или остаток не заменяются вымышленными значениями.

Интерфейс предназначен для десктопа и мобильного браузера. Совместимость с текущим сайтом предусмотрена через отдельный фронтенд и HTTP API с настраиваемым `VITE_API_URL`; встроенная интеграция с авторизацией, корзиной и оформлением заказа действующего сайта не реализована. Перед внедрением необходимо проверить стили, маршрутизацию, CORS, сессию сайта и отображение на целевых мобильных устройствах. Команды проверок перечислены в разделе Checks; их наличие не означает успешную проверку конкретного развёртывания.
