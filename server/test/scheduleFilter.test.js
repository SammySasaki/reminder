// Run with: node --test test/scheduleFilter.test.js
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { filterByScheduleRelevance } from '../lib/scheduleFilter.js';

const instructions = [
  { id: '1', content: 'Everyday task',   schedule_relevance: 'everyday',      specific_days: null },
  { id: '2', content: 'Weekday task',    schedule_relevance: 'weekdays',      specific_days: null },
  { id: '3', content: 'Weekend task',    schedule_relevance: 'weekends',      specific_days: null },
  { id: '4', content: 'Mon/Wed/Fri task',schedule_relevance: 'specific_days', specific_days: [1,3,5] },
];

test('Sunday (0): keeps everyday + weekends + specific_days if 0 in list', () => {
  const result = filterByScheduleRelevance(instructions, 0);
  const ids = result.map(i => i.id);
  assert.ok(ids.includes('1'), 'everyday kept');
  assert.ok(!ids.includes('2'), 'weekday excluded');
  assert.ok(ids.includes('3'), 'weekend kept');
  assert.ok(!ids.includes('4'), 'Mon/Wed/Fri excluded on Sunday');
});

test('Monday (1): keeps everyday + weekdays + Mon/Wed/Fri', () => {
  const result = filterByScheduleRelevance(instructions, 1);
  const ids = result.map(i => i.id);
  assert.ok(ids.includes('1'), 'everyday kept');
  assert.ok(ids.includes('2'), 'weekday kept');
  assert.ok(!ids.includes('3'), 'weekend excluded');
  assert.ok(ids.includes('4'), 'Mon in specific_days');
});

test('Tuesday (2): keeps everyday + weekdays, excludes Mon/Wed/Fri', () => {
  const result = filterByScheduleRelevance(instructions, 2);
  const ids = result.map(i => i.id);
  assert.ok(ids.includes('2'), 'weekday kept');
  assert.ok(!ids.includes('4'), 'Tuesday not in Mon/Wed/Fri');
});

test('Saturday (6): keeps everyday + weekends', () => {
  const result = filterByScheduleRelevance(instructions, 6);
  const ids = result.map(i => i.id);
  assert.ok(ids.includes('1'), 'everyday kept');
  assert.ok(!ids.includes('2'), 'weekday excluded');
  assert.ok(ids.includes('3'), 'weekend kept');
});

console.log('All schedule filter tests passed');
