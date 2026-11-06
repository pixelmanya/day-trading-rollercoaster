import { abbreviations } from './tools/oxlint-plugin-naming.js'

const abbreviationPattern = Object.keys(abbreviations)
  .map((word) => `${word}|${word[0].toUpperCase()}${word.slice(1)}`)
  .join('|')

/**
 * camelCase, at least 3 characters, and no abbreviation as a word (closeBtn, errMsg) —
 * the same word list as the naming lint for TS.
 */
const classNamePattern = new RegExp(
  `^(?!(?:.*[a-z0-9])?(?:${abbreviationPattern})(?:[A-Z0-9]|$))[a-z][a-zA-Z0-9]{2,}$`,
)

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['dist/**', 'coverage/**', '.output/**'],
  rules: {
    // camelCase classes, so CSS Modules read as styles.closeBtn
    'selector-class-pattern': [
      classNamePattern,
      {
        message: (selector) =>
          `Class names are camelCase, 3+ characters, no abbreviations (got "${selector}")`,
      },
    ],
    // Pixel-exact rem values (12.5px = 0.78125rem) need 5 decimals
    'number-max-precision': 5,
    'max-nesting-depth': [1, { ignore: ['blockless-at-rules'] }],
    // Raw colors only in tokens.css
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],
    // Sizes come from tokens: no raw lengths for spacing, radius or type
    'declaration-property-unit-disallowed-list': [
      {
        '/^(margin|padding|gap|row-gap|column-gap|inset)/': ['px', 'rem', 'em'],
        '/^(border-radius|border-.*-radius)$/': ['px', 'rem', 'em'],
        '/^(font-size|letter-spacing)$/': ['px', 'rem', 'em'],
      },
      { message: 'Use a token from src/styles/tokens.css' },
    ],
    'declaration-property-value-disallowed-list': [
      { 'font-weight': ['/^\\d+$/', 'bold', 'normal'] },
      { message: 'Use a --weight-* token' },
    ],
    // Prefer logical properties
    'property-disallowed-list': [
      [
        '/^(margin|padding)-(top|right|bottom|left)$/',
        '/^(top|right|bottom|left)$/',
        '/^border-(top|right|bottom|left)(-|$)/',
      ],
      { message: 'Use logical properties (margin-block-start, inset-inline, …)' },
    ],
  },
  overrides: [
    {
      // Modules style classes only: one class per element, flat specificity
      files: ['**/*.module.css'],
      rules: {
        'selector-max-type': 0,
        'selector-max-id': 0,
        'selector-max-compound-selectors': 2,
      },
    },
    {
      // Token definitions are the one place for raw values
      files: ['src/styles/tokens.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'declaration-property-unit-disallowed-list': null,
      },
    },
  ],
}
