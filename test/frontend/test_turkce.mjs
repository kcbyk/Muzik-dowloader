import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../../frontend/src/i18n/translations/en.js';
import tr from '../../frontend/src/i18n/translations/tr.js';
import { FLAGS } from '../../frontend/src/ui/flags.js';
import { IDIOMAS } from '../../frontend/src/features/sync/limites.js';

test('Türkçe has every interface key and preserves template parameters', () => {
    assert.deepEqual(Object.keys(tr).sort(), Object.keys(en).sort());
    for (const key of Object.keys(en)) {
        assert.ok(tr[key].trim(), `Empty Turkish text: ${key}`);
        const params = text => [...text.matchAll(/\{[^}]+\}/g)].map(m => m[0]).sort();
        assert.deepEqual(params(tr[key]), params(en[key]), `Parameters for ${key}`);
    }
    assert.equal(tr.nav_home, 'Ana Sayfa');
    assert.ok(FLAGS.tr.startsWith('data:image/svg+xml,'));
    assert.ok(IDIOMAS.includes('tr'));
});
