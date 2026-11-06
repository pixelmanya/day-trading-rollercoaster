/**
 * In-repo oxlint plugin enforcing the code layout rules from CONTRIBUTING.md.
 * Loaded through oxlint's JS-plugin support (`jsPlugins` in .oxlintrc.json).
 *
 * Rule `layout/padding-lines`: a blank line is required between two statements in the same
 * list (file, block or switch case) when either of them
 * - is a block statement (if, switch, try, function or class declaration, nested block),
 * - spans more than one line, or
 * - the second one is a `return`.
 * Consecutive single-line statements and imports may stay grouped.
 * The first and last statement in a block need no padding. Fixable with `oxlint --fix`.
 */

const blockTypes = new Set([
  'IfStatement',
  'SwitchStatement',
  'TryStatement',
  'FunctionDeclaration',
  'ClassDeclaration',
  'BlockStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'LabeledStatement',
])

const blankLine = /\n[ \t]*\r?\n/

function getRange(node) {
  return node.range ?? [node.start, node.end]
}

/** `export function …` counts as the function it exports. */
function unwrapExport(statement) {
  const isExport =
    statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'

  return isExport && statement.declaration ? statement.declaration : statement
}

function isBlock(statement) {
  return blockTypes.has(unwrapExport(statement).type)
}

function isMultiLine(text, statement) {
  const [start, end] = getRange(statement)

  return text.slice(start, end).includes('\n')
}

function getPaddingReason(text, previous, next, isTopLevel) {
  const areBothImports = previous.type === 'ImportDeclaration' && next.type === 'ImportDeclaration'

  if (areBothImports) {
    return null
  }

  if (isBlock(previous) || isBlock(next)) {
    return 'around block statements'
  }

  if (isMultiLine(text, previous) || isMultiLine(text, next)) {
    return isTopLevel ? 'between top-level items' : 'around multi-line statements'
  }

  return next.type === 'ReturnStatement' ? 'before return' : null
}

function createPaddingChecker(context) {
  const text = context.sourceCode.text

  return (statements, isTopLevel) =>
    statements.slice(1).forEach((next, index) => {
      const previous = statements[index]
      const reason = getPaddingReason(text, previous, next, isTopLevel)

      if (!reason) {
        return
      }

      const [, previousEnd] = getRange(previous)
      const [nextStart] = getRange(next)

      if (blankLine.test(text.slice(previousEnd, nextStart))) {
        return
      }

      context.report({
        node: next,
        message: `Add a blank line ${reason}.`,
        fix: (fixer) => fixer.insertTextAfterRange([previousEnd, previousEnd], '\n'),
      })
    })
}

const plugin = {
  meta: { name: 'layout' },
  rules: {
    'padding-lines': {
      meta: {
        type: 'layout',
        fixable: 'whitespace',
        docs: {
          description: 'Require blank lines around blocks, multi-line statements and returns',
        },
      },
      create: (context) => {
        const checkPadding = createPaddingChecker(context)

        return {
          Program: (node) => checkPadding(node.body, true),
          BlockStatement: (node) => checkPadding(node.body, false),
          StaticBlock: (node) => checkPadding(node.body, false),
          SwitchCase: (node) => checkPadding(node.consequent, false),
        }
      },
    },
  },
}

export default plugin
