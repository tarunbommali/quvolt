import { expect, test } from '@playwright/test';

const persistedAuthState = {
  state: {
    user: {
      _id: 'user-e2e-1',
      name: 'E2E Participant',
      email: 'e2e.participant@example.com',
      role: 'participant',
      plan: 'FREE',
    },
  },
  version: 0,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((authState) => {
    localStorage.setItem('qb_auth_store', JSON.stringify(authState));
  }, persistedAuthState);
});

const readTimerSeconds = async (timerLocator) => {
  const label = await timerLocator.getAttribute('aria-label');
  const match = /Time remaining:\s*(\d+)\s*seconds/i.exec(label || '');
  expect(match, `Expected timer aria-label but received: ${label}`).toBeTruthy();
  return Number(match[1]);
};

test('join room transitions from waiting lobby to live question', async ({ page }) => {
  await page.goto('/quiz/E2E123');

  await expect(page.getByText('Waiting for host')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'E2E Quiz' })).toBeVisible();
  await expect(page.getByLabel(/Time remaining:\s*\d+\s*seconds/i)).toHaveCount(0);
  await expect(page.getByText(/QNaN/i)).toHaveCount(0);

  await expect(page.getByText('Question 1: Launch')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Q1 \/ 2/i)).toBeVisible();
});

test('recovers after socket transport disruption and resumes live state', async ({ page }) => {
  await page.goto('/quiz/E2E123');

  await expect(page.getByText('Question 1: Launch')).toBeVisible({ timeout: 15_000 });

  const disruptResponse = await page.request.post('/api/e2e/disrupt-socket');
  expect(disruptResponse.ok()).toBeTruthy();

  // Re-establish the participant session after transport disruption.
  await page.reload();

  await expect(page.getByText('Question 2: Reconnected')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Q2 \/ 2/i)).toBeVisible();
});

test('reconnects mid-timer without resetting current question state', async ({ page }) => {
  await page.goto('/quiz/E2E123');

  await expect(page.getByText('Question 1: Launch')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Q1 \/ 2/i)).toBeVisible();

  const timer = page.getByLabel(/Time remaining:\s*\d+\s*seconds/i);
  const timerBeforeDisruption = await readTimerSeconds(timer);

  await page.waitForTimeout(2_200);

  const disruptResponse = await page.request.post('/api/e2e/disrupt-socket?mode=continuity');
  expect(disruptResponse.ok()).toBeTruthy();

  await page.reload();

  await expect(page.getByText('Question 1: Launch')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Q1 \/ 2/i)).toBeVisible();

  const timerAfterReconnect = await readTimerSeconds(timer);
  expect(timerAfterReconnect).toBeGreaterThan(0);
  expect(timerAfterReconnect).toBeLessThan(timerBeforeDisruption);
});

test('reconnect timer drift stays within +/-1 second of expected remaining time', async ({ page }) => {
  await page.goto('/quiz/E2E123');

  await expect(page.getByText('Question 1: Launch')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Q1 \/ 2/i)).toBeVisible();

  const timer = page.getByLabel(/Time remaining:\s*\d+\s*seconds/i);
  const timerBeforeDisruption = await readTimerSeconds(timer);
  const measurementStartMs = Date.now();

  await page.waitForTimeout(2_200);

  const disruptResponse = await page.request.post('/api/e2e/disrupt-socket?mode=continuity');
  expect(disruptResponse.ok()).toBeTruthy();

  await page.reload();

  await expect(page.getByText('Question 1: Launch')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Q1 \/ 2/i)).toBeVisible();

  const timerAfterReconnect = await readTimerSeconds(timer);
  const elapsedSeconds = Math.floor((Date.now() - measurementStartMs) / 1_000);
  const expectedRemaining = Math.max(1, timerBeforeDisruption - elapsedSeconds);

  expect(timerAfterReconnect).toBeLessThan(timerBeforeDisruption);
  expect(Math.abs(timerAfterReconnect - expectedRemaining)).toBeLessThanOrEqual(1);
});
