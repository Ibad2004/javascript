import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from './filters';
import { buildTaskQuery, escapeRegex, isObjectIdString, ownedTask, serializeTask } from './taskQuery';

describe('escapeRegex', () => {
  it('escapes every special character', () => {
    expect(escapeRegex('c++')).toBe(String.raw`c\+\+`);
    expect(escapeRegex('a.b*(c)[d]{e}|f^$\\?')).toBe(String.raw`a\.b\*\(c\)\[d\]\{e\}\|f\^\$\\\?`);
  });
  it('leaves normal and Urdu text alone', () => {
    expect(escapeRegex('اردو book')).toBe('اردو book');
  });
  it('makes an escaped pattern a valid regex that matches the literal text', () => {
    const re = new RegExp(escapeRegex('(c++'), 'i');
    expect(re.test('learn (C++ now')).toBe(true);
  });
});

describe('buildTaskQuery', () => {
  it('has only the owner for the default filters', () => {
    expect(buildTaskQuery('u1', DEFAULT_FILTERS)).toEqual({ owner: 'u1' });
  });
  it('maps status and priority', () => {
    expect(buildTaskQuery('u1', { ...DEFAULT_FILTERS, status: 'done' })).toEqual({ owner: 'u1', done: true });
    expect(buildTaskQuery('u1', { ...DEFAULT_FILTERS, status: 'pending', priority: 'high' })).toEqual({ owner: 'u1', done: false, priority: 'high' });
  });
  it('turns the search into an escaped, case-insensitive regex', () => {
    expect(buildTaskQuery('u1', { ...DEFAULT_FILTERS, q: '  C++  Tem ' })).toEqual({ owner: 'u1', title: { $regex: String.raw`c\+\+ tem`, $options: 'i' } });
  });
  it('ignores a search of only spaces', () => {
    expect(buildTaskQuery('u1', { ...DEFAULT_FILTERS, q: '   ' })).toEqual({ owner: 'u1' });
  });
});

describe('ownedTask', () => {
  it('always matches on the id and the owner together', () => {
    expect(ownedTask('u1', 't1')).toEqual({ _id: 't1', owner: 'u1' });
  });
});

describe('isObjectIdString', () => {
  it('accepts 24 hex characters only', () => {
    expect(isObjectIdString('507f1f77bcf86cd799439011')).toBe(true);
    expect(isObjectIdString('bad-id')).toBe(false);
    expect(isObjectIdString('123456789012')).toBe(false);
    expect(isObjectIdString('')).toBe(false);
  });
});

describe('serializeTask', () => {
  it('returns plain data with a string id and ISO dates', () => {
    const task = serializeTask({
      _id: { toString: () => 'abc' },
      title: 'T',
      description: 'D',
      done: true,
      priority: 'high',
      dueDate: '2026-11-25',
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
      updatedAt: new Date('2026-11-02T10:00:00.000Z'),
    });
    expect(task).toEqual({
      id: 'abc', title: 'T', description: 'D', done: true, priority: 'high', dueDate: '2026-11-25',
      createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-02T10:00:00.000Z',
    });
    expect(JSON.parse(JSON.stringify(task))).toEqual(task);
  });
  it('fills defaults for missing fields', () => {
    expect(serializeTask({ _id: { toString: () => '1' }, title: 'Only title' })).toEqual({
      id: '1', title: 'Only title', description: '', done: false, priority: 'medium', dueDate: null,
    });
  });
});
