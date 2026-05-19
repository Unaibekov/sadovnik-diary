# Sadovnik diary: notes from specification

Source document: `c:\Users\uin-a\OneDrive\Документы\works\Приложение АДС\Описание приложения ТЗ.docx`

## Current setup

- React Native project scaffolded with Expo and JavaScript.
- Main entry files: `App.jsx`, `index.js`, `app.json`.
- First authorization screen implemented in JavaScript.
- Stage selection screen implemented with six stage cards.
- Planting card list screen implemented for `Введение в культуру` only.
- Temporary local data storage connected through `@react-native-async-storage/async-storage`.
- Static planting cards were removed; the first stage list now reads from local storage.
- `Введение в культуру` add-card form now saves cards to local storage.
- Creation date is stored as `YYYY-MM-DD`, displayed as `ДД.ММ.ГГГГ`, and uses native date picker on mobile with web text fallback.
- Plant catalog imported from `растения_разбиты_с_расширенными_требованиями.xlsx` into `data/plantsCatalog.js`; add-card form uses cascading dropdowns: culture -> species -> variety.
- Plant catalog now stores clone/adaptation recommendations per plant: temperature range, humidity range, PPFD range, photoperiod, fertilizers, chemicals, stimulators, application rate, and frequency.
- `Код культуры посадки` can be generated locally in `VK-YYYYMMDD-HHMMSS` format for the temporary local workflow.
- New cards store QR print state: `qrPrinted`, `qrPrintedAt`, `qrPrintedBy`.
- Future edit rule: after QR is printed, identity fields such as creation date, culture, species, variety, and code can be changed only by admin or superadmin.
- Planting cards in `Введение в культуру` can be opened for editing from the list; edit form reuses the add-card form and updates local storage.
- Opening a planting card now shows a basic care calendar. The `Ещё` button opens the edit/common-info form, and selecting a date can add a stage-change operation.
- `Клонирование` stage receives cards through stage transition from `Введение в культуру`; direct add is hidden there. Clone-specific edit fields are temperature and light requirements, and calendar dates can add stage/status change operations.
- Stage transition stores the selected calendar date as `stageChangedAt`, records `stageChangedBy`, and appends a `stageHistory` entry. These fields should be sent to the future admin backend so admin views can see the actual date of entering the current stage separately from the original card creation date.
- In clone-stage editing, identity fields are displayed as read-only text for operator flow; temperature and light requirements are selected from catalog recommendations, shared presets, or custom values.
- Clone-stage calendar has a status-change flow for the selected date: transplant count, propagation count, sale count, and death count. Saving writes a `statusChange` operation to the card operation journal; it must not overwrite the initial card quantity.
- Adaptation stage uses the shared stage list and care calendar flow. Cards enter adaptation through a stage transition from cloning, keep `stageChangedAt` as the adaptation entry date, and can be moved onward to greenhouse.
- Adaptation also supports direct card creation from the stage list. The form uses planting date, catalog-based culture/species/variety selection, code, quantity, editable auto-filled temperature/light/humidity requirements, and editable prevention items with name, application rate, and frequency.
- Quantity should be treated as the initial batch quantity after creation. Future quantity changes such as deaths, sales, write-offs, propagation, or division should be recorded through an operation journal instead of overwriting the card quantity.
- Cards can be safely cancelled from the edit form. Cancelled cards stay in local storage with audit fields but are hidden from normal stage lists.
- `Введение в культуру` was tightened as the batch passport stage: creating a card now records a `batchCreated` journal event, old local cards are normalized with the same event in memory, the calendar view shows the passport, initial/current quantity, days in the current stage, and the event journal.
- The intro stage now follows the user scenario more closely: create action is labeled `Создать партию`, the form includes source material, parent batch, sterility status, start photo note, batch status, unique code validation, positive quantity validation, `qrStatus: pending_print`, and a `qrGenerated` journal event. Intro cards support status filtering and date-based journal actions for comments, photo notes, contamination, quarantine, and transition blocking for non-active or QR-less batches.
- Intro-stage UX was tightened: the calendar card now keeps only a compact batch summary, while full identity/passport fields are opened through the explicit `Паспорт` button instead of a vague `Ещё` action.
- Production-stage UX was tightened similarly: cloning, adaptation, and greenhouse calendar cards now show compact operational summaries instead of long recommendation/passport panels; detailed passport/settings data stays behind the `Паспорт` action.
- Legacy local cards with an existing code but missing `qrStatus` are treated as `pending_print` and normalized with a `qrGenerated` event, so old batches are not blocked as QR-less after the intro-stage update.
- `Клонирование` now has the production core from the latest user scenario: status filters, card/list clone metrics, Excel recommendation block, current quantity/rooting/loss/risk calculations, date-based production events for rooting, death, discard, sale, and propagation, quantity validation against current remainder, sale-to-archive behavior at zero remainder, and transition blocking to adaptation when quarantine/problem/no rooting/zero remainder applies.
- `Адаптация` now follows the latest scenario core: passport stays read-only, list/status filters show survival, stress, risk, and days in stage; the card shows adaptation state, Excel recommendations, stress/turgor/stability, and current remainder; events cover stress/state, environment changes, care actions, death, discard, and sale; sale/death/discard validate against current remainder and zero-remainder sale archives the batch; transition to greenhouse is blocked by quarantine, active contamination, critical stress, missing stability, or zero remainder.
- `Теплица` now has the first MVP production core: cards arrive from adaptation, list/status filters show growth, losses, risk, and days in stage; the card shows greenhouse state, Excel recommendation placeholders, current remainder, losses, sales, transplants, stress, stability, and risk; events cover observation/state, care, environment, diseases/pests, transplant, death, discard, sale, and quarantine; transition to hardening is blocked by quarantine, critical disease/risk, missing stable growth, or zero remainder. Greenhouse care now has the first planning layer: `Уход -> Полив/Подкормка/Профилактика/Лечение` stores an interval in days, the card calculates last action, next action, due-today/overdue status, and the greenhouse list highlights any overdue care. The main stage-selection screen now shows `Задачи ухода` for greenhouse care due today or overdue, with quick open into the relevant card. Native push/local notifications are the next layer.
- Started dev-architecture cleanup: domain constants, date helpers, empty form factories, batch/event calculations, and AsyncStorage access were moved out of `App.jsx` into `src/domain/*` and `src/services/cultureCardsStorage.js`. `App.jsx` still owns screens/UI and some catalog dropdown helpers.
- `git` is not available in the current shell PATH.
- Initial TypeScript scaffold was converted to JavaScript because the project owner prefers JS.

## Core product scope

The application is a gardener diary for managing plant/crop batches across production stages, with calendars, operation history, notifications, photo evidence, code scanning, role-based access, and an AI assistant chat.

## Main stages

- Введение в культуру
- Клонирование
- Адаптация
- Теплица
- Закалка
- Высадка

## Main flows

- Authentication:
  - login and password with error state
  - password recovery by email
  - registration with repeated password and email confirmation
  - user rights are assigned by the superadmin
- Stage selection:
  - list of stages
  - profile exit action
  - card search by code
- Planting cards:
  - list by selected stage
  - add card
  - search by name
  - scan code to open the matching care calendar
- Card creation:
  - creation date
  - culture, species, variety
  - planting/culture code
  - quantity
  - stage-specific fields
  - card name generated from species and code
- Care calendar:
  - month navigation
  - date markers for recorded actions
  - add changes for a selected date
  - open full card information
  - open assistant chat
- Card information:
  - editable general fields
  - operations grouped by date
  - creation entry
  - operation-specific details
- AI assistant:
  - chat screen from the calendar
  - user sends text question and receives text response
  - future implementation should start with GigaChat API as the primary Russian AI provider for gardening questions
  - YandexGPT / Alice AI Studio can be kept as a fallback provider if GigaChat quality, limits, or access are not enough
  - AI API keys must not be stored in the React Native app; use a small backend/proxy that receives chat messages from the app and calls the provider API server-side
  - base assistant prompt: answer in Russian as a gardener/nursery assistant; cover plant care, micropropagation, temperature, lighting, disease symptoms, transplanting, and adaptation; ask up to three clarifying questions when data is insufficient; do not invent exact norms for a variety when conditions are unknown

## Cross-cutting requirements

- Roles:
  - superadmin: full access, user role management, reports, all notifications, system settings
  - admin: manages care process, assigns and controls tasks, views and corrects operation history
  - operator: works on assigned cards/tasks, records operations, uploads photos, receives task notifications
- Photo evidence:
  - required around care operations such as профилактика and лечение
  - before photo, optional process photo, after photo after a configured period such as 7 days
  - missed required photos notify the superadmin
- Notifications:
  - operators: planned actions, photo evidence, upcoming deadlines
  - admins: overdue and incomplete tasks
  - superadmins: missed actions, missing photos, repeated violations
- Code scanning:
  - scan code with camera and navigate to the matching care calendar
- Offline/data/backend details are not specified in the document and need separate decisions.

## Suggested next implementation step

Before coding screens, decide the first vertical slice. The safest first slice is:

1. Add navigation structure.
2. Add placeholder screens for auth, stage selection, card list, card form, calendar, card info, chat.
3. Define JavaScript domain structures for stages, cards, operations, roles, and notifications.
