import { describe, expect, it } from 'vitest';
import { pageTitle, shortenTitle, taskPath } from './pageTitle';

describe('pageTitle', () => {
  it('is "Tasks" for the list and "<page> | Tasks" for other pages', () => {
    expect(pageTitle()).toBe('Tasks');
    expect(pageTitle('Page not found')).toBe('Page not found | Tasks');
  });

  it('keeps a title of exactly 50 characters whole', () => {
    const fifty = 'x'.repeat(50);
    expect(shortenTitle(fifty)).toBe(fifty);
  });

  it('cuts a title over 50 characters with "…"', () => {
    expect(shortenTitle('y'.repeat(51))).toBe(`${'y'.repeat(50)}…`);
    expect(pageTitle('z'.repeat(80))).toBe(`${'z'.repeat(50)}… | Tasks`);
  });

  it('never cuts an emoji in half', () => {
    const title = `${'a'.repeat(49)}😀😀`;
    expect(shortenTitle(title)).toBe(`${'a'.repeat(49)}😀…`);
  });

  it('encodes odd ids in the task path', () => {
    expect(taskPath('a b%/?')).toBe('/tasks/a%20b%25%2F%3F');
  });
});
