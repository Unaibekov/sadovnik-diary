const { test, expect } = require('@playwright/test');

const AUTH_TEST_LOGIN = 'login';
const AUTH_TEST_PASSWORD = 'pass';
const CULTURE_CARDS_STORAGE_KEY = 'sadovnikDiary:cultureCards';
const CULTURE_CARDS_RESET_KEY = 'sadovnikDiary:cultureCardsReset:2026-05-25-clear-stage-cards';
const CULTURE_CARDS_STORAGE_SCHEMA_VERSION = 1;
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
      if (!localStorage.getItem(cardsKey)) {
        localStorage.setItem(resetKey, 'true');
        localStorage.setItem(cardsKey, JSON.stringify(seededCards));
      }
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      resetKey: CULTURE_CARDS_RESET_KEY,
      cards,
    },
  );
}

function buildFullyIsolatedProblemCards() {
  const [parentCard] = buildSeededCards();
  const problemDate = localIsoDate();
  const problemCreatedAt = `${problemDate}T16:16:00.000Z`;
  const isolationCreatedAt = `${problemDate}T16:21:00.000Z`;

  return [
    {
      ...parentCard,
      id: 'problem-parent-001',
      code: 'VK-20260727-191538',
      quantity: 1234,
      currentQuantity: 234,
      batchStatus: 'problem',
      sterilityStatus: 'contaminated',
      operations: [
        {
          id: 'problem-isolation-001',
          type: 'problemIsolation',
          title: 'Изолировать растения',
          stage: INTRO_STAGE,
          date: problemDate,
          count: 1000,
          quantity: 1000,
          currentQuantity: 234,
          sourceProblemEventId: 'problem-001',
          childCardId: 'problem-child-001',
          childCode: 'VK-20260727-192105',
          location: 'Изолятор 1',
          nextLocation: 'Изолятор 1',
          createdAt: isolationCreatedAt,
          createdBy: 'local-user',
        },
        {
          id: 'problem-001',
          type: 'problem',
          title: 'Проблема',
          stage: INTRO_STAGE,
          date: problemDate,
          problemType: 'Контаминация',
          riskLevel: 'Высокий',
          affectedQuantity: 1000,
          currentQuantity: 1234,
          problemDescription: 'Заражение',
          createdAt: problemCreatedAt,
          createdBy: 'local-user',
        },
        ...parentCard.operations,
      ],
    },
    {
      ...parentCard,
      id: 'problem-child-001',
      code: 'VK-20260727-192105',
      quantity: 1000,
      currentQuantity: 1000,
      batchStatus: 'problem',
      sterilityStatus: 'contaminated',
      healthStatus: 'problem',
      activeProblemQuantity: 1000,
      originType: 'problemIsolation',
      isolationStatus: 'isolated',
      parentCardId: 'problem-parent-001',
      parentCode: 'VK-20260727-191538',
      sourceEventId: 'problem-isolation-001',
      sourceProblemEventId: 'problem-001',
      locationDescription: 'Изолятор 1',
      operations: [
        {
          id: 'isolated-problem-problem-child-001',
          type: 'problem',
          title: 'Проблема',
          stage: INTRO_STAGE,
          date: problemDate,
          problemType: 'Контаминация',
          riskLevel: 'Высокий',
          affectedQuantity: 1000,
          currentQuantity: 1000,
          sourceProblemEventId: 'problem-001',
          parentProblemEventId: 'problem-001',
          createdAt: isolationCreatedAt,
          createdBy: 'local-user',
        },
        {
          id: 'isolated-from-parent-001',
          type: 'isolatedFromParent',
          title: 'Создана из изоляции проблемы',
          stage: INTRO_STAGE,
          date: problemDate,
          quantity: 1000,
          parentCardId: 'problem-parent-001',
          parentCode: 'VK-20260727-191538',
          sourceEventId: 'problem-isolation-001',
          sourceProblemEventId: 'problem-001',
          location: 'Изолятор 1',
          createdAt: isolationCreatedAt,
          createdBy: 'local-user',
        },
        {
          ...parentCard.operations[0],
          id: 'problem-child-001-batch-created',
          quantity: 1000,
          code: 'VK-20260727-192105',
          createdAt: isolationCreatedAt,
        },
      ],
    },
  ];
}

function buildRiskAndActiveProblemCards() {
  const [baseCard] = buildSeededCards();
  const todayIso = localIsoDate();

  return [
    {
      ...baseCard,
      id: 'critical-risk-card',
      code: 'RISK-0001',
      varietyName: 'Risk Only',
      name: 'Томат Solanum lycopersicum Risk Only',
      quantity: 20,
      currentQuantity: 12,
      batchStatus: 'active',
      sterilityStatus: 'unchecked',
      operations: [
        {
          id: 'risk-loss-001',
          type: 'introLoss',
          title: 'Потери',
          stage: INTRO_STAGE,
          date: todayIso,
          count: 8,
          previousQuantity: 20,
          currentQuantity: 12,
          reason: 'Высокие потери',
          createdAt: `${todayIso}T10:00:00.000Z`,
          createdBy: 'local-user',
        },
        ...baseCard.operations,
      ],
    },
    {
      ...baseCard,
      id: 'active-problem-card',
      code: 'PROBLEM-0001',
      varietyName: 'Active Problem',
      name: 'Томат Solanum lycopersicum Active Problem',
      quantity: 20,
      currentQuantity: 20,
      batchStatus: 'problem',
      sterilityStatus: 'contaminated',
      operations: [
        {
          id: 'active-problem-001',
          type: 'problem',
          title: 'Проблема',
          stage: INTRO_STAGE,
          date: todayIso,
          problemType: 'Контаминация',
          riskLevel: 'Высокий',
          affectedQuantity: 3,
          currentQuantity: 20,
          problemDescription: 'Активная проблема',
          createdAt: `${todayIso}T11:00:00.000Z`,
          createdBy: 'local-user',
        },
        ...baseCard.operations,
      ],
    },
  ];
}

function buildParentWithSpentChildCards() {
  const [baseCard] = buildSeededCards();
  const todayIso = localIsoDate();
  const parentCard = {
    ...baseCard,
    id: 'stage5-parent-card',
    code: 'STAGE5-PARENT',
    varietyName: 'Parent Stage5',
    name: 'Томат Solanum lycopersicum Parent Stage5',
    locationDescription: 'Старое место',
    operations: [
      {
        id: 'stage5-old-movement',
        type: 'movement',
        title: 'Перемещение',
        stage: INTRO_STAGE,
        date: todayIso,
        previousLocation: 'Старт',
        nextLocation: 'Теплица Старая · Стеллаж A · Полка 1',
        createdAt: `${todayIso}T08:00:00.000Z`,
        createdBy: 'local-user',
      },
      {
        id: 'stage5-new-movement',
        type: 'movement',
        title: 'Перемещение',
        stage: INTRO_STAGE,
        date: todayIso,
        previousLocation: 'Теплица Старая · Стеллаж A · Полка 1',
        nextLocation: 'Теплица Новая · Стеллаж N · Полка 2',
        createdAt: `${todayIso}T12:00:00.000Z`,
        createdBy: 'local-user',
      },
      ...baseCard.operations,
    ],
  };
  const childCard = {
    ...baseCard,
    id: 'stage5-child-card',
    code: 'STAGE5-CHILD',
    varietyName: 'Child Stage5',
    name: 'Томат Solanum lycopersicum Child Stage5',
    quantity: 10,
    currentQuantity: 10,
    parentCardId: parentCard.id,
    parentCode: parentCard.code,
    originType: 'cloned',
    operations: [
      {
        id: 'stage5-child-sale',
        type: 'sale',
        title: 'Продажа',
        stage: INTRO_STAGE,
        date: todayIso,
        count: 3,
        currentQuantity: 7,
        createdAt: `${todayIso}T10:00:00.000Z`,
        createdBy: 'local-user',
      },
      {
        ...baseCard.operations[0],
        id: 'stage5-child-created',
        quantity: 10,
        code: 'STAGE5-CHILD',
        createdAt: `${todayIso}T09:00:00.000Z`,
      },
    ],
  };

  return [parentCard, childCard];
}

async function enterPin(page) {
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit }).click();
  }
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

  await enterPin(page);
  await enterPin(page);

  await expect(page.getByTestId('stage-home-clone')).toBeVisible();
}

async function openIntroStage(page) {
  await page.getByTestId('stage-home-intro').click();
  await expect(page.getByTestId('culture-card').first()).toBeVisible();
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
  await expect(page.getByTestId('culture-card').first()).toContainText('20 растений');
  await expect(page.getByTestId('culture-card').first()).toContainText('QR ожидает печати');
});

test('legacy culture cards load without the reset marker', async ({ page }) => {
  const cards = buildSeededCards();

  await page.evaluate(
    ({ cardsKey, resetKey, seededCards }) => {
      localStorage.removeItem(resetKey);
      localStorage.setItem(cardsKey, JSON.stringify(seededCards));
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      resetKey: CULTURE_CARDS_RESET_KEY,
      seededCards: cards,
    },
  );

  await page.reload();
  await expect(page.getByText('Введите пин-код')).toBeVisible();
  await enterPin(page);
  await openIntroStage(page);
  await expect(page.getByTestId('culture-card').first()).toContainText('Томат');
});

test('saved culture cards use the versioned storage envelope', async ({ page }) => {
  await openIntroStage(page);
  await openCurrentCardCalendar(page);
  await moveToNextStage(page);

  const savedCardsStorageValue = await page.evaluate(
    (cardsKey) => localStorage.getItem(cardsKey),
    CULTURE_CARDS_STORAGE_KEY,
  );
  const savedCardsStorage = JSON.parse(savedCardsStorageValue);

  expect(savedCardsStorage.schemaVersion).toBe(CULTURE_CARDS_STORAGE_SCHEMA_VERSION);
  expect(Array.isArray(savedCardsStorage.cards)).toBe(true);
});

test('repository-backed seed generation saves the versioned envelope', async ({ page }) => {
  await page.getByRole('button', { name: 'Меню' }).click();
  await page.getByTestId('menu-item-generateIntroSeedCards').click();
  await expect(page.getByText(/Создано 10 партий/)).toBeVisible();

  const savedCardsStorageValue = await page.evaluate(
    (cardsKey) => localStorage.getItem(cardsKey),
    CULTURE_CARDS_STORAGE_KEY,
  );
  const savedCardsStorage = JSON.parse(savedCardsStorageValue);

  expect(savedCardsStorage.schemaVersion).toBe(CULTURE_CARDS_STORAGE_SCHEMA_VERSION);
  expect(savedCardsStorage.cards).toHaveLength(11);
});

test('parent batch is healthy after all problem plants are isolated', async ({ page }) => {
  const cards = buildFullyIsolatedProblemCards();

  await page.evaluate(
    ({ cardsKey, seededCards }) => {
      localStorage.setItem(cardsKey, JSON.stringify({
        schemaVersion: 1,
        cards: seededCards,
      }));
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      seededCards: cards,
    },
  );

  await page.reload();
  await expect(page.getByText('Введите пин-код')).toBeVisible();
  await enterPin(page);
  await openIntroStage(page);

  const parentCard = page.getByTestId('culture-card').filter({ hasText: '234 растения' });

  await expect(parentCard).toBeVisible();
  await expect(parentCard).not.toContainText('Активная:');
  await expect(parentCard).not.toContainText('Изолировать:');

  await parentCard.click();
  await page.getByRole('button', { name: 'Паспорт' }).click();

  await expect(page.getByText('Без отклонений')).toBeVisible();
});

test('problem filter excludes critical risk cards without active problem', async ({ page }) => {
  const cards = buildRiskAndActiveProblemCards();

  await page.evaluate(
    ({ cardsKey, seededCards }) => {
      localStorage.setItem(cardsKey, JSON.stringify({
        schemaVersion: 1,
        cards: seededCards,
      }));
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      seededCards: cards,
    },
  );

  await page.reload();
  await expect(page.getByText('Введите пин-код')).toBeVisible();
  await enterPin(page);
  await openIntroStage(page);

  await expect(page.getByTestId('culture-card').filter({ hasText: 'Risk Only' })).toBeVisible();
  await expect(page.getByTestId('culture-card').filter({ hasText: 'Active Problem' })).toBeVisible();
  await expect(page.getByTestId('culture-card').filter({ hasText: 'Risk Only' })).toContainText('Риск: Критический');

  await page.getByRole('button', { name: /Проблема\s+1/ }).click();

  await expect(page.getByTestId('culture-card').filter({ hasText: 'Risk Only' })).toHaveCount(0);
  const problemCard = page.getByTestId('culture-card').filter({ hasText: 'Active Problem' });

  await expect(problemCard).toBeVisible();
  await expect(problemCard).toContainText('Контаминация · 3 шт. · высокий риск');
  await expect(problemCard).not.toContainText('Активна:');
  await expect(problemCard).not.toContainText('Изолировать:');
});

test('passport shows latest location and current child quantity', async ({ page }) => {
  const cards = buildParentWithSpentChildCards();

  await page.evaluate(
    ({ cardsKey, seededCards }) => {
      localStorage.setItem(cardsKey, JSON.stringify({
        schemaVersion: 1,
        cards: seededCards,
      }));
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      seededCards: cards,
    },
  );

  await page.reload();
  await expect(page.getByText('Введите пин-код')).toBeVisible();
  await enterPin(page);
  await openIntroStage(page);

  await page.getByTestId('culture-card').filter({ hasText: 'Parent Stage5' }).click();
  await page.getByRole('button', { name: 'Паспорт' }).click();

  await expect(page.getByText('Теплица Новая · Стеллаж N · Полка 2')).toBeVisible();
  await expect(page.getByText('STAGE5-CHILD')).toBeVisible();
  await expect(page.getByText('7 из 10 шт.')).toBeVisible();
});

test('generated culture code avoids existing code collision', async ({ page }) => {
  const cards = buildSeededCards().map((card) => ({
    ...card,
    code: 'VK-20260727-123456',
    operations: (card.operations || []).map((operation) => ({
      ...operation,
      code: operation.type === 'batchCreated' ? 'VK-20260727-123456' : operation.code,
    })),
  }));

  await page.addInitScript(() => {
    const OriginalDate = Date;
    const fixedDate = new OriginalDate(2026, 6, 27, 12, 34, 56);

    class FixedDate extends OriginalDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedDate.getTime()]));
      }

      static now() {
        return fixedDate.getTime();
      }
    }

    FixedDate.UTC = OriginalDate.UTC;
    FixedDate.parse = OriginalDate.parse;
    globalThis.Date = FixedDate;
  });

  await page.evaluate(
    ({ cardsKey, seededCards }) => {
      localStorage.setItem(cardsKey, JSON.stringify({
        schemaVersion: 1,
        cards: seededCards,
      }));
    },
    {
      cardsKey: CULTURE_CARDS_STORAGE_KEY,
      seededCards: cards,
    },
  );

  await page.reload();
  await expect(page.getByText('Введите пин-код')).toBeVisible();
  await enterPin(page);
  await openIntroStage(page);
  await page.getByRole('button', { name: 'Создать партию' }).click();
  await page.getByRole('button', { name: 'Сгенерировать код партии' }).click();

  const inputValues = await page.locator('input').evaluateAll((inputs) => (
    inputs.map((input) => input.value)
  ));

  expect(inputValues).toContain('VK-20260727-123456-01');
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
