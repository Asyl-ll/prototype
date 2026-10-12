# Lecture+

Lecture+ — учебный веб-сервис: запись, файл или заметки превращаются в транскрипт, понятный анализ, будущие темы, квиз, задания и напоминания.

- Сайт: https://lecture-plus-ict.vercel.app
- Публичная модель БД: https://lecture-plus-ict.vercel.app/database.html
- Редактируемая ER-модель: https://lecture-plus-ict.vercel.app/lecture-plus.dbml

Код доступа не нужен. AI работает и без аккаунта. Бесплатный аккаунт нужен только для приватной истории между устройствами.

## Что показать на защите

1. Нажать **Try sample notes** или загрузить короткую запись.
2. Нажать **Analyze lecture** и показать полный разбор материала.
3. Открыть **What may come next**, затем отдельный **Quiz**.
4. Показать **Tasks**: задания преподавателя и необязательную AI-практику.
5. Открыть **Profile**: локальная история, вход и приватная синхронизация.
6. Открыть **Database model**: 12 таблиц, связи, бизнес-правила и сценарий.

Короткий текст B1: “Lecture+ is a web service for students. We upload a lecture or paste our notes. AI finds the main ideas and makes a clear study guide. It also creates a quiz, tasks and possible future topics. A student can use the service without an account. With a free account, private history can be opened on another device.”

## Основные функции

- MP3, M4A, WAV, WEBM, OGG, MP4, запись микрофона, PDF, DOCX, PPTX, TXT и обычный текст.
- Полный анализ: обзор, понятия, объяснения, примеры, связи и материал для повторения.
- Прогноз следующих тем с причиной и уровнем уверенности.
- Отдельный квиз с объяснением ошибок.
- Задания преподавателя с цитатой из лекции и отдельная AI-практика.
- Локальная история до 10 лекций без регистрации.
- Опциональная приватная синхронизация через Supabase Auth и PostgreSQL.
- Экспорт Markdown и календарного файла ICS.
- Публичная страница БД показывает только структуру и безопасные примеры, без данных студентов.

## База данных

Supabase PostgreSQL содержит 12 прикладных таблиц: `profiles`, `lectures`, `transcripts`, `analyses`, `topics`, `lecture_topics`, `questions`, `answer_options`, `quiz_attempts`, `attempt_answers`, `tasks`, `reminders`.

Row Level Security разрешает пользователю читать и менять только свои строки. Реальные лекции, email и транскрипты не публикуются. Исходники находятся в [db/schema.sql](db/schema.sql) и [db/lecture-plus.dbml](db/lecture-plus.dbml), миграция — в `supabase/migrations`.

## Локальный запуск

Нужен Node.js 22.12+.

```powershell
npm install
npm run dev
```

Открыть http://localhost:5173. Секреты хранятся только в исключённом из Git файле `.env.local`:

```env
GROQ_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Локальная страница `/__setup` помогает записать ключ Groq. Она не попадает в production-сборку.

## Проверка

```powershell
npm test
npm run test:cloud
npm run build
npm audit
```

`test:cloud` создаёт временных пользователей, проверяет сохранение и загрузку лекции, изоляцию RLS, публичный статус БД и удаляет тестовые данные.

## Бесплатные сервисы

- Vercel Hobby — хостинг сайта и serverless API.
- Groq Free — распознавание аудио и обработка текста.
- Supabase Free — PostgreSQL, вход и приватная синхронизация.

У бесплатных тарифов есть квоты. Код проекта не включает автоматическую оплату.

## Ограничения

- Аудио: до 30 минут и 50 МБ; документы: до 15 МБ; текст: до 100 000 символов.
- Будущие темы являются рекомендациями AI, а не точным планом преподавателя.
- Бесплатные квоты Groq могут временно замедлить анализ.
- Lecture+ не хранит аудиофайл: он отправляется в Groq для обработки. В Supabase сохраняются результаты только после входа и включения синхронизации.

## IPO

**Input:** lecture audio, document or notes; language; lecture date; optional course outline.

**Process:** text extraction, audio transcription, AI analysis, validation, structured storage and Row Level Security.

**Output:** transcript, learning guide, future topics, quiz, tasks, reminders, exports and private history.
