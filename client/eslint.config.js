import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const noInlineClassNameSelectors = [
  {
    selector: "JSXAttribute[name.name='className'][value.type='Literal']",
    message:
      'Do not use inline className strings. Use centralized tokens from src/styles and compose with cx().',
  },
  {
    selector: "JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral",
    message:
      'Do not use className template literals. Use token objects and cx() for conditional styling.',
  },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: [
      '**/*.config.{js,cjs,mjs}',
      'playwright.config.js',
      'vite.config.js',
      'babel.config.cjs',
      'jest.config.cjs',
      'e2e/**/*.{js,mjs}',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      'src/test/**/*.{js,jsx}',
      '**/*.test.{js,jsx}',
      '**/__tests__/**/*.{js,jsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-syntax': ['warn', ...noInlineClassNameSelectors],
    },
  },
  {
    files: [
      'src/pages/Profile.jsx',
      'src/pages/StudioDashboard.jsx',
      'src/pages/OrganizerEdit.jsx',
      'src/components/organizerEdit/*.jsx',
      'src/components/profile/ProfileDashboardTabs.jsx',
      'src/components/ui/InputField.jsx',
      'src/components/ui/SearchBar.jsx',
    ],
    rules: {
      'no-restricted-syntax': ['error', ...noInlineClassNameSelectors],
    },
  },
])
