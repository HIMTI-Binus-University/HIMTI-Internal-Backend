import assert from 'node:assert/strict';
import test from 'node:test';
import { EventGroupBodySchema } from './eventGroupSchema.js';
test('event group name is trimmed and validated', () => {
   assert.equal(EventGroupBodySchema.safeParse({ name: '  ' }).success, false);
});
