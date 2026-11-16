// Lint for the whole repository. Style and size limits follow the repository guidelines: 2 spaces,
// single quotes, semicolons, trailing commas, 120 columns, functions near 40 lines. AI Wallet and the
// website import this config from their submodule and add their own files to it.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const STYLE_RULES = {
  eqeqeq: ['error', 'always'],
  curly: ['error', 'all'],
  semi: ['error', 'always'],
  quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
  'comma-dangle': ['error', 'always-multiline'],
  indent: ['error', 2, { SwitchCase: 1 }],
  'max-len': ['error', { code: 120, ignoreUrls: true, ignoreRegExpLiterals: true }],
  'max-lines': ['warn', { max: 600 }],
  'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
  'max-params': ['warn', 4],
  'max-depth': ['warn', 4],
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**', '**/node_modules/**', '**/.tmp/**', '**/test-results/**',
      // The Web Components script the WordPress plugin copies from packages/elements/dist before it ships.
      'integrations/wordpress/aiconnect/assets/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, ...STYLE_RULES },
  },
  {
    // Build scripts and the skills' scripts run in Node, which has the Fetch API's globals.
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly', console: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
        Response: 'readonly',
      },
    },
  },
  {
    // The WordPress plugin's editor script runs in the block editor, on the globals WordPress defines.
    files: ['integrations/wordpress/aiconnect/**/*.js'],
    languageOptions: { globals: { window: 'readonly' } },
    rules: STYLE_RULES,
  },
);

export { STYLE_RULES };
