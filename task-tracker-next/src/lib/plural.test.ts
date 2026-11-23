import { describe, expect, it } from 'vitest';
import { pluralize } from './plural';

describe('pluralize', () => {
  it('uses the singular only for exactly 1', () => {
    expect(pluralize(0, 'task')).toBe('0 tasks');
    expect(pluralize(1, 'task')).toBe('1 task');
    expect(pluralize(2, 'task')).toBe('2 tasks');
  });

  it('accepts a custom plural', () => {
    expect(pluralize(2, 'entry', 'entries')).toBe('2 entries');
  });
});
