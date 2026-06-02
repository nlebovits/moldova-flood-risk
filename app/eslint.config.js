import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// =========================================================
// Moldova Ag Flood-Risk Map — ESLint config.
// Project rule: NO rounded corners. Anywhere.
// The Tailwind theme already overrides all --radius-* to 0,
// so any `rounded-*` class compiles to border-radius: 0.
// This rule blocks the class literally to keep intent clear:
// reviewers should never SEE `rounded-foo` in source, even if
// it would render correctly.
// =========================================================

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'public']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Ban any `rounded-*` Tailwind utility in className strings.
      // Catches both string literals and template literals.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\brounded(-|\\b)/]",
          message:
            'Rounded corners are banned per design spec. Use sharp 0-radius edges. (Tailwind --radius-* tokens are all 0 in @theme; the class is redundant and signals wrong intent.)',
        },
        {
          selector:
            "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\brounded(-|\\b)/]",
          message:
            'Rounded corners are banned per design spec (template literal).',
        },
        {
          selector:
            "JSXAttribute[name.name='class'] Literal[value=/\\brounded(-|\\b)/]",
          message: 'Rounded corners are banned per design spec.',
        },
      ],
      // Common shadcn copy-paste paranoia: the cn() helper sometimes
      // gets a `rounded` arg directly. Flag those too.
      'no-restricted-properties': [
        'error',
        {
          object: 'cn',
          property: 'rounded',
          message: 'Use sharp corners; `--radius-*` are zero.',
        },
      ],
    },
  },
]);
