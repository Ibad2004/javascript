import { describe, expect, it } from 'vitest';
import { makeTask } from '../test/makeTask';
import {
  DEFAULT_FILTERS,
  countByStatus,
  cutSearch,
  filterTasks,
  filtersToSearch,
  hasActiveFilters,
  matchesFilters,
  normalizeSearch,
  readFilters,
  writeFilters,
  type Filters,
} from './filters';

const read = (query: string) => readFilters(new URLSearchParams(query));
const withQ = (q: string): Filters => ({ ...DEFAULT_FILTERS, q });

describe('readFilters (the URL is untrusted)', () => {
  it('an empty URL gives the defaults', () => {
    expect(read('')).toEqual(DEFAULT_FILTERS);
  });

  it('reads valid values, ignoring case and spaces', () => {
    expect(read('status=DONE&priority=%20High%20&q=milk')).toEqual({
      status: 'done',
      priority: 'high',
      q: 'milk',
    });
  });

  it('unknown or empty values fall back to the default', () => {
    expect(read('status=finished&priority=urgent')).toEqual(DEFAULT_FILTERS);
    expect(read('status=&priority=')).toEqual(DEFAULT_FILTERS);
    expect(read('status=__proto__&priority=constructor')).toEqual(DEFAULT_FILTERS);
  });

  it('a repeated param uses the first value', () => {
    expect(read('status=pending&status=done').status).toBe('pending');
    expect(read('q=one&q=two').q).toBe('one');
  });

  it('cuts q to 100 characters', () => {
    expect(read(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
  });

  it('decodes q as plain text (no crash on %, +, brackets)', () => {
    expect(read('q=c%2B%2B').q).toBe('c++');
    expect(read('q=a+b').q).toBe('a b');
    expect(read('q=(').q).toBe('(');
  });
});

describe('cutSearch', () => {
  it('never splits an emoji in half', () => {
    const text = `${'a'.repeat(99)}😀😀`;
    expect(cutSearch(text)).toBe(`${'a'.repeat(99)}😀`);
  });

  it('keeps short text as it is', () => {
    expect(cutSearch('milk')).toBe('milk');
  });
});

describe('writeFilters / filtersToSearch', () => {
  it('leaves the defaults out, so the plain list is "/"', () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe('');
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
  });

  it('writes only the non-default filters', () => {
    expect(filtersToSearch({ status: 'done', priority: 'high', q: 'milk' })).toBe(
      '?status=done&priority=high&q=milk',
    );
    expect(filtersToSearch({ ...DEFAULT_FILTERS, priority: 'low' })).toBe('?priority=low');
  });

  it('a search of only spaces is left out', () => {
    expect(writeFilters(withQ('   ')).has('q')).toBe(false);
  });

  it('round-trips through the URL', () => {
    const filters: Filters = { status: 'pending', priority: 'medium', q: 'c++ & (x)' };
    expect(readFilters(writeFilters(filters))).toEqual(filters);
  });
});

describe('normalizeSearch', () => {
  it('trims, collapses spaces and ignores case', () => {
    expect(normalizeSearch('  Buy   MILK\t now ')).toBe('buy milk now');
  });

  it('keeps Urdu as it is', () => {
    expect(normalizeSearch('  دودھ   خریدنا ')).toBe('دودھ خریدنا');
  });
});

describe('matchesFilters', () => {
  const milk = makeTask({ id: '1', title: 'Buy  Milk', priority: 'high' });

  it('search is a plain substring: special characters are not RegExp', () => {
    expect(matchesFilters(makeTask({ id: '2', title: 'Learn C++' }), withQ('c++'))).toBe(true);
    expect(matchesFilters(makeTask({ id: '3', title: 'Call (home)' }), withQ('('))).toBe(true);
    expect(matchesFilters(makeTask({ id: '4', title: 'abc' }), withQ('.*'))).toBe(false);
    expect(matchesFilters(makeTask({ id: '5', title: 'abc' }), withQ('['))).toBe(false);
  });

  it('search ignores case and extra spaces on both sides', () => {
    expect(matchesFilters(milk, withQ('  buy MILK '))).toBe(true);
    expect(matchesFilters(milk, withQ('bread'))).toBe(false);
  });

  it('search works for Urdu titles', () => {
    const urdu = makeTask({ id: '6', title: 'دودھ خریدنا' });
    expect(matchesFilters(urdu, withQ('دودھ'))).toBe(true);
    expect(matchesFilters(urdu, withQ('چائے'))).toBe(false);
  });

  it('status and priority combine with AND', () => {
    const doneLow = makeTask({ id: '7', done: true, priority: 'low' });
    expect(matchesFilters(doneLow, { status: 'done', priority: 'low', q: '' })).toBe(true);
    expect(matchesFilters(doneLow, { status: 'pending', priority: 'low', q: '' })).toBe(false);
    expect(matchesFilters(doneLow, { status: 'done', priority: 'high', q: '' })).toBe(false);
  });
});

describe('filterTasks and countByStatus', () => {
  const tasks = [
    makeTask({ id: 'a', title: 'A', done: true, dueDate: '2026-11-11' }),
    makeTask({ id: 'b', title: 'B', dueDate: '2026-11-12' }),
    makeTask({ id: 'c', title: 'C', dueDate: '2026-11-10' }),
  ];

  it('filters and keeps the usual sort order', () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, status: 'pending' }).map((t) => t.id)).toEqual([
      'c',
      'b',
    ]);
  });

  it('counts are over ALL tasks, not the filtered ones', () => {
    expect(countByStatus(tasks)).toEqual({ all: 3, pending: 2, done: 1 });
    expect(countByStatus([])).toEqual({ all: 0, pending: 0, done: 0 });
  });
});
