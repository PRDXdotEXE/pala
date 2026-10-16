/**
 * Shared Tailwind class sets. Keeping light/dark styling in one place means a
 * new surface only has to pick a semantic class instead of re-deriving the
 * dark-mode pairings every time.
 */
export const ui = {
  card: 'rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900',
  cardPad6: 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900',
  bareCard: 'rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900',

  pageTitle: 'text-xl font-bold text-gray-900 dark:text-gray-100',
  sectionTitle: 'text-sm font-semibold text-gray-900 dark:text-gray-100',
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300',
  overline: 'text-xs uppercase text-gray-400 dark:text-gray-500',
  muted: 'text-sm text-gray-500 dark:text-gray-400',
  hint: 'text-xs text-gray-400 dark:text-gray-500',
  error: 'text-sm text-red-600 dark:text-red-400',
  bodyText: 'text-sm text-gray-800 dark:text-gray-200',

  input:
    'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
  select:
    'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
  selectTight:
    'rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',

  btnPrimary:
    'rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50',
  btnPrimaryLg:
    'rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50',
  btnSecondary:
    'rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  btnSecondaryTight:
    'rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  btnDanger:
    'rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50',
  btnGhost:
    'rounded px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',

  chipActive:
    'rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white',
  chipIdle:
    'rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700',

  empty:
    'rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900',
  inputError:
    'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
} as const;
