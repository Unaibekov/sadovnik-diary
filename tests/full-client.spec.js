const { test, expect } = require('@playwright/test');

const AUTH_TEST_LOGIN = 'login';
const AUTH_TEST_PASSWORD = 'pass';
const CULTURE_CARDS_STORAGE_KEY = 'sadovnikDiary:cultureCards';
const CULTURE_CARDS_RESET_KEY = 'sadovnikDiary:cultureCardsReset:2026-05-25-clear-stage-cards';
const INTRO_STAGE = 'Введение в культуру';

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildSeededCards() {
  const today = new Date();
  const todayIso = localIsoDate(today);
  const nowIso = today.toISOString();

  return [{
    id: 'e2e-plant-001',
    createdAt: todayIso,
    updatedAt: nowIso,
    createdBy: 'local-user',
    createdByName: 'E2E Test',
    updatedBy: 'local-user',
    cultureName: 'Томат',
    speciesName: 'Solanum lycopersicum',
    varietyName: 'Ранний',
    name: 'Томат Solanum lycopersicum Ранний',
    code: 'E2E-0001',
    quantity: 20,
    sourceMaterial: 'Маточное растение',
    parentBatch: '',
    sterilityStatus: 'unchecked',
    batchStatus: 'active',
    status: 'active',
    qrStatus: 'pending_print',
    qrPrinted: false,
    qrPrintedAt: '',
    qrPrintedBy: null,
    startPhotoUri: '',
    startPhotoUris: [],
    locationDescription: 'Тестовая полка',
    stage: INTRO_STAGE,
    stageChangedAt: todayIso,
    stageHistory: [],
    operations: [{
      id: 'e2e-plant-001-batch-created',
      type: 'batchCreated',
      title: 'Создание партии',
      stage: INTRO_STAGE,
      date: todayIso,
      createdAt: nowIso,
      createdBy: 'local-user',
      createdByName: 'E2E Test',
      quantity: 20,
      code: 'E2E-0001',
      qrStatus: 'pending_print',
    }],
  }];
}

async function seedLocalStorage(page) {
  const cards = buildSeededCards();
  await page.addInitScript(
    ({ cardsKey, resetKey, cards: seededCards }) => {
      localStorage.setItem(resetKey, 'true');
      localStorage.setItem(cardsKey, JSON.stringify(seededCards));
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      resetKey: CULTURE_CARDS_RESET_KEY,
      cards,
    },
  );
}

async function login(page) {
  await page.goto('/');
  await page.getByTestId('auth-login-input').fill(AUTH_TEST_LOGIN);
  await page.getByTestId('auth-password-input').fill(AUTH_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByPlaceholder('Имя')).toBeVisible();
  await page.getByPlaceholder('Имя').fill('Иван');
  await page.getByPlaceholder('Фамилия').fill('Тестов');
  await page.getByRole('button', { name: 'Продолжить' }).click();

  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit }).click();
  }

  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit }).click();
  }

  await expect(page.getByTestId('stage-home-clone')).toBeVisible();
}

async function openIntroStage(page) {
  await page.getByTestId('stage-home-intro').click();
  await expect(page.getByTestId('culture-card')).toBeVisible();
}

async function openFirstCard(page) {
  await page.getByTestId('culture-card').first().click();
  await expect(page.getByTestId('calendar-add-event')).toBeVisible();
}

async function saveCurrentStatusForm(page) {
  const problemQuantityInput = page.getByText('Количество растений с проблемой, шт. *')
    .locator('..')
    .getByPlaceholder('0');

  if (await problemQuantityInput.isVisible().catch(() => false)) {
    await problemQuantityInput.fill('2');
  }
  await page.getByRole('button', { name: 'Сохранить' }).click();
  await expect(page.getByTestId('calendar-add-event')).toBeVisible();
}

async function openAddEvent(page, eventLabel) {
  await page.getByTestId('calendar-add-event').click();
  await page.getByRole('button', { name: eventLabel }).click();
}

async function fillSelect(page, triggerLabel, optionLabel) {
  await page.getByRole('button', { name: triggerLabel }).click();
  await page.getByRole('button', { name: optionLabel, exact: true }).click();
}

async function moveToNextStage(page) {
  await page.getByTestId('stage-move-button').click();
  await page.getByTestId('confirm-stage-move').click();
  await expect(page.getByTestId('culture-card')).toBeVisible();
}

async function openCurrentCardCalendar(page) {
  await openFirstCard(page);
  await expect(page.getByTestId('calendar-add-event')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await seedLocalStorage(page);
  await login(page);
});

test('logout and reload return to the PIN screen when quick auth is configured', async ({ page }) => {
  await expect(page.getByTestId('stage-home-clone')).toBeVisible();

  await page.getByRole('button', { name: 'Меню' }).click();
  await page.getByRole('button', { name: 'Выйти' }).click();

  await expect(page.getByText('Введите пин-код')).toBeVisible();

  await page.reload();

  await expect(page.getByText('Введите пин-код')).toBeVisible();
});

test('intro stage card is available from the seeded data', async ({ page }) => {
  await openIntroStage(page);
  await expect(page.getByTestId('culture-card').first()).toContainText('Томат');
  await expect(page.getByTestId('culture-card').first()).toContainText('20 шт.');
  await expect(page.getByTestId('culture-card').first()).toContainText('QR ожидает печати');
});

test('full client flow moves one card through all stages and writes records', async ({ page }) => {
  await openIntroStage(page);
  await openCurrentCardCalendar(page);

  await moveToNextStage(page);
  await openCurrentCardCalendar(page);

  await openAddEvent(page, 'Укоренение');
  await page.getByPlaceholder('0').fill('3');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Потери');
  await page.getByPlaceholder('0').fill('1');
  await page.getByPlaceholder('Укажите причину потерь').fill('E2E loss');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Продажа');
  await page.getByPlaceholder('0').fill('1');
  await saveCurrentStatusForm(page);

  await moveToNextStage(page);
  await openCurrentCardCalendar(page);

  await openAddEvent(page, 'Наблюдение');
  await fillSelect(page, 'Выберите уровень стресса', 'Средний');
  await fillSelect(page, 'Выберите тургор', 'Нормальный');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Уход');
  await fillSelect(page, 'Выберите тип ухода', 'Полив');
  await saveCurrentStatusForm(page);

  await moveToNextStage(page);
  await openCurrentCardCalendar(page);

  await openAddEvent(page, 'Наблюдение');
  await page.getByPlaceholder('Например: активный рост, замедление').fill('Стабильный рост');
  await page.getByPlaceholder('Листья, тургор, прирост, общее состояние').fill('Состояние ровное');
  await fillSelect(page, 'Выберите уровень стресса', 'Низкий');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Уход');
  await fillSelect(page, 'Выберите тип ухода', 'Подкормка');
  await saveCurrentStatusForm(page);

  await moveToNextStage(page);
  await openCurrentCardCalendar(page);

  await openAddEvent(page, 'Наблюдение');
  await fillSelect(page, 'Выберите уровень стресса', 'Низкий');
  await fillSelect(page, 'Выберите тургор', 'Нормальный');
  await fillSelect(page, 'Выберите готовность к высадке', 'Готова');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Уход');
  await fillSelect(page, 'Выберите тип ухода', 'Профилактика');
  await saveCurrentStatusForm(page);

  await moveToNextStage(page);
  await openCurrentCardCalendar(page);

  await openAddEvent(page, 'Высадка');
  await page.getByPlaceholder('Грядка, кассета, контейнер').fill('Тестовая грядка');
  await page.getByPlaceholder('Например: 30x40 см').fill('30x40 см');
  await page.getByPlaceholder('Например: участок 2, 12 м2').fill('Участок A1');
  await page.getByPlaceholder('Грунт, субстрат, смесь').fill('Субстрат для теста');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Наблюдение');
  await fillSelect(page, 'Выберите приживаемость', 'Хорошая');
  await fillSelect(page, 'Выберите уровень стресса', 'Низкий');
  await fillSelect(page, 'Выберите тургор', 'Нормальный');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Уход');
  await fillSelect(page, 'Выберите тип ухода', 'Полив');
  await page.getByPlaceholder('Препарат').fill('E2E препарат');
  await page.getByPlaceholder('Дозировка').fill('1 мл/л');
  await page.getByPlaceholder('Способ внесения').fill('Капельно');
  await page.getByPlaceholder('Реакция растений').fill('Без стресса');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Проблема');
  await fillSelect(page, 'Выберите тип проблемы', 'Погодный стресс');
  await fillSelect(page, 'Выберите уровень риска', 'Высокий');
  await page.getByPlaceholder('Опишите проблему').fill('Проверка проблемной записи');
  await saveCurrentStatusForm(page);

  await openAddEvent(page, 'Завершение');
  await fillSelect(page, 'Выберите итог высадки', 'Прижилась');
  await saveCurrentStatusForm(page);

  await page.getByRole('button', { name: 'Журнал' }).click();

  await expect(page.getByText('Создание партии')).toBeVisible();
  await expect(page.getByText('Укоренение')).toBeVisible();
  await expect(page.getByText('Потери')).toBeVisible();
  await expect(page.getByText('Продажа')).toBeVisible();
  await expect(page.getByText('Наблюдение', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Уход', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Высадка', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Проблема', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Завершение', { exact: true }).first()).toBeVisible();
});
