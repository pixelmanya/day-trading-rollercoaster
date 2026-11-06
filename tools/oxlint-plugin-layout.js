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

function isEitherBlock(previous, next) {
  return isBlock(previous) || isBlock(next)
}

function isEitherMultiLine(text, previous, next) {
  return isMultiLine(text, previous) || isMultiLine(text, next)
}

function isImportPair(previous, next) {
  return previous.type === 'ImportDeclaration' && next.type === 'ImportDeclaration'
}

function getMultiLineReason(statementList) {
  return statementList.isTopLevel ? 'between top-level items' : 'around multi-line statements'
}

/** Why `previous` and `next` need a blank line between them, or null if they don't. */
function getPaddingReason(statementList, previous, next) {
  if (isImportPair(previous, next)) {
    return null
  }

  if (isEitherBlock(previous, next)) {
    return 'around block statements'
  }

  if (isEitherMultiLine(statementList.text, previous, next)) {
    return getMultiLineReason(statementList)
  }

  return next.type === 'ReturnStatement' ? 'before return' : null
}

function hasBlankLineBetween(text, previous, next) {
  const [, previousEnd] = getRange(previous)
  const [nextStart] = getRange(next)

  return blankLine.test(text.slice(previousEnd, nextStart))
}

function reportMissingPadding(context, previous, next) {
  const [, previousEnd] = getRange(previous)
  const text = context.sourceCode.text
  const statementList = { text, isTopLevel: next.parent.type === 'Program' }
  const reason = getPaddingReason(statementList, previous, next)

  if (reason && !hasBlankLineBetween(text, previous, next)) {
    context.report({
      node: next,
      message: `Add a blank line ${reason}.`,
      fix: (fixer) => fixer.insertTextAfterRange([previousEnd, previousEnd], '\n'),
    })
  }
}

function checkPadding(context, statements) {
  statements
    .slice(1)
    .forEach((next, index) => reportMissingPadding(context, statements[index], next))
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
      create: (context) => ({
        Program: (node) => checkPadding(context, node.body),
        BlockStatement: (node) => checkPadding(context, node.body),
        StaticBlock: (node) => checkPadding(context, node.body),
        SwitchCase: (node) => checkPadding(context, node.consequent),
      }),
    },
  },
}

export default plugin
