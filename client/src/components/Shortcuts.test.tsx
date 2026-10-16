import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FOCUS_SEARCH_EVENT, useAppShortcuts } from './Shortcuts';

function setup() {
  const navigate = vi.fn();
  const toggleTheme = vi.fn();
  const openHelp = vi.fn();
  renderHook(() => useAppShortcuts({ navigate, toggleTheme, openHelp }));
  return { navigate, toggleTheme, openHelp };
}

function press(key: string, target: Element | Window = window) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('useAppShortcuts', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('maps single keys to routes and actions', () => {
    const { navigate, toggleTheme, openHelp } = setup();

    press('d');
    press('l');
    press('a');
    press('n');
    press('t');
    press('?');

    expect(navigate.mock.calls).toEqual([
      ['/dashboard'],
      ['/leads'],
      ['/ai/analyze'],
      ['/leads/new'],
    ]);
    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(openHelp).toHaveBeenCalledTimes(1);
  });

  it('announces the search shortcut so a page can focus its input', () => {
    setup();
    const listener = vi.fn();
    window.addEventListener(FOCUS_SEARCH_EVENT, listener);

    press('/');

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(FOCUS_SEARCH_EVENT, listener);
  });

  it('stays quiet while the user is typing', () => {
    const { navigate, toggleTheme } = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);

    press('n', input);
    press('t', input);

    expect(navigate).not.toHaveBeenCalled();
    expect(toggleTheme).not.toHaveBeenCalled();
    input.remove();
  });

  it('ignores browser/OS modifier combos', () => {
    const { navigate } = setup();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }),
    );

    expect(navigate).not.toHaveBeenCalled();
  });

  it('detaches its listener on unmount', () => {
    const navigate = vi.fn();
    const { unmount } = renderHook(() =>
      useAppShortcuts({ navigate, toggleTheme: vi.fn(), openHelp: vi.fn() }),
    );

    unmount();
    act(() => press('d'));

    expect(navigate).not.toHaveBeenCalled();
  });
});
