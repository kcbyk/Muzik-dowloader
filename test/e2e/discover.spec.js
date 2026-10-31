import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, locale: 'tr-TR', hasTouch: true, isMobile: true });

const results = Array.from({ length: 12 }, (_, n) => ({
    url: `https://www.youtube.com/watch?v=BaW_jenozK${n % 10}`,
    title: `Deneme şarkısı ${n + 1}`,
    channel: 'Deneme Sanatçı',
    thumbnail: '/favicon.png',
    duration: 190,
}));

async function swipe(page, selector, fromX, toX) {
    await page.locator(selector).evaluate((target, { fromX, toX }) => {
        const start = new Touch({ identifier: 1, target, clientX: fromX, clientY: 400 });
        const end = new Touch({ identifier: 1, target, clientX: toX, clientY: 400 });
        target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start], targetTouches: [start], changedTouches: [start] }));
        target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], targetTouches: [], changedTouches: [end] }));
    }, { fromX, toX });
}

test.beforeEach(async ({ page }) => {
    await page.route('**/api/search', async route => {
        await route.fulfill({ json: { results } });
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
});

test('typing searches, shows image cards, loads more on scroll and clears', async ({ page }) => {
    const input = page.locator('#youtubeUrl');
    await input.fill('Deneme');
    await expect(page.locator('.result-item').first()).toBeVisible();
    await expect(page.locator('.result-title').first()).toHaveText('Deneme şarkısı 1');
    const image = page.locator('.result-thumbnail').first();
    await expect.poll(() => image.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(300);
    await expect(page.locator('.result-download-btn').first()).toBeVisible();
    await input.blur();
    await page.locator('.main-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => page.locator('.result-item').count()).toBeGreaterThan(5);
    await page.locator('.main-content').evaluate(el => { el.scrollTop = 0; });
    await page.locator('#clearBtn').click();
    await expect(page.locator('#searchResults')).toBeHidden();
});

test('swiping opens settings after playlists and returns to playlists', async ({ page }) => {
    await swipe(page, '.main-content', 300, 100);
    await expect(page.locator('#navLibrary')).toHaveClass(/active/);
    await swipe(page, '.main-content', 300, 100);
    await expect(page.locator('#navPlaylists')).toHaveClass(/active/);
    await swipe(page, '.main-content', 300, 100);
    await expect(page.locator('#ajustesSheet')).toBeVisible();
    await swipe(page, '#ajustesSheet .auth-modal-header', 100, 300);
    await expect(page.locator('#ajustesSheet')).toBeHidden();
    await expect(page.locator('#navPlaylists')).toHaveClass(/active/);
});

test('slow old search results never replace a newer query', async ({ page }) => {
    await page.unroute('**/api/search');
    await page.route('**/api/search', async route => {
        const query = route.request().postDataJSON().query;
        if (query === 'eski') await new Promise(resolve => setTimeout(resolve, 2200));
        await route.fulfill({ json: { results: [{ ...results[0], title: `${query} sonucu` }] } }).catch(() => {});
    });
    const input = page.locator('#youtubeUrl');
    const oldRequest = page.waitForRequest(req => req.url().includes('/api/search') && req.postDataJSON()?.query === 'eski');
    await input.fill('eski');
    await oldRequest;
    await input.fill('yeni');
    await expect(page.locator('.result-title').first()).toHaveText('yeni sonucu', { timeout: 12000 });
    await page.waitForTimeout(500);
    await expect(page.locator('.result-title').first()).toHaveText('yeni sonucu');
});

test('the card download sends MP3 even with a saved M4A selection', async ({ page }) => {
    const input = page.locator('#youtubeUrl');
    await input.fill('Deneme');
    await expect(page.locator('.result-download-btn').first()).toBeVisible();
    await page.locator('#formatSelect').selectOption('m4a', { force: true });
    await page.route('**/api/start-download', route => route.fulfill({ status: 429, json: { error: 'test' } }));
    const request = page.waitForRequest(req => req.url().includes('/api/start-download') && req.method() === 'POST');
    await page.locator('.result-download-btn').first().click();
    expect((await request).postDataJSON().format).toBe('mp3');
});
