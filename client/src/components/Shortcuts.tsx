import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'd', label: 'Dashboard' },
  { keys: 'l', label: 'Leads' },
  { keys: 'a', label: 'AI analyzer' },
  { keys: 'n', label: 'New lead' },
  { keys: 't', label: 'Toggle dark mode' },
  { keys: '/', label: 'Focus search' },
  { keys: '?', label: 'This help' },
];

/** Custom event name a page can listen for to move focus into its search box. */
export const FOCUS_SEARCH_EVENT = 'plas:focus-search';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT'
  );
}

interface ShortcutHandlers {
  navigate: NavigateFunction;
  toggleTheme: () => void;
  openHelp: () => void;
}

/**
 * Single-key shortcuts, active app-wide. Ignored while typing, so a client
 * message containing "n" never navigates away mid-sentence.
 */
export function useAppShortcuts({ navigate, toggleTheme, openHelp }: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case 'd':
          navigate('/dashboard');
          break;
        case 'l':
          navigate('/leads');
          break;
        case 'a':
          navigate('/ai/analyze');
          break;
        case 'n':
          navigate('/leads/new');
          break;
        case 't':
          toggleTheme();
          break;
        case '/':
          event.preventDefault();
          window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
          break;
        case '?':
          event.preventDefault();
          openHelp();
          break;
        default:
          return;
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, toggleTheme, openHelp]);
}

export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close shortcut help"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-gray-900/50 dark:bg-black/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="relative w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <h2
          id="shortcut-help-title"
          className="text-sm font-semibold text-gray-900 dark:text-gray-100"
        >
          Keyboard shortcuts
        </h2>
        <dl className="mt-3 space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-gray-600 dark:text-gray-300">{shortcut.label}</dt>
              <dd>
                <kbd className="rounded border border-gray-300 bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                  {shortcut.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
          Shortcuts pause while you are typing in a field.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
