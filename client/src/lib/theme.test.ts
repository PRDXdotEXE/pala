import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, getTheme, toggleTheme } from './theme';

describe('theme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('plas-theme');
  });

  it('applies the dark class to the document root and persists the choice', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('plas-theme')).toBe('dark');
    expect(getTheme()).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(getTheme()).toBe('light');
  });

  it('toggles to the opposite of the stored theme', () => {
    applyTheme('light');
    expect(toggleTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(toggleTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
