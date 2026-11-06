/**
 * In-repo oxlint plugin enforcing the functional style from CONTRIBUTING.md.
 * Loaded through oxlint's JS-plugin support (`jsPlugins` in .oxlintrc.json).
 *
 * Rules (all prefixed `fp/`):
 * - no-class: no class declarations or expressions
 * - no-this: no `this`
 * - no-let: only `const` bindings
 * - no-loop: no for/while/do loops; use map/filter/reduce or recursion
 * - no-mutation: no assignment to properties, no `++`/`--`, no mutating methods
 * - no-throw: no `throw`; return a Result instead (enabled for src/lib)
 * - no-impure-globals: no clock, randomness, console, I/O or DOM globals (src/lib)
 * - require-return: every function returns a value; void functions only exist for effects (src/lib)
 * - no-async: no async functions; only storage adapters do I/O (src/lib)
 */

import { getChildNodes, getNodeType, getPath, isAstObject } from './ast-helpers.js'

const mutatingMethods = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
  'set',
  'add',
  'delete',
  'clear',
])

const immutableAlternatives = {
  push: 'spread: [...xs, x]',
  pop: 'xs.slice(0, -1) / xs.at(-1)',
  shift: 'xs.slice(1) / xs[0]',
  unshift: 'spread: [x, ...xs]',
  splice: 'xs.toSpliced()',
  sort: 'xs.toSorted()',
  reverse: 'xs.toReversed()',
  fill: 'Array.from()',
  copyWithin: 'a new array',
  set: 'a new object/Map',
  add: 'a new Set',
  delete: 'destructuring or filter',
  clear: 'a new empty value',
}

const report = (context, node, message) => context.report({ node, message })

const createRule = (description, create) => ({
  meta: { type: 'problem', docs: { description } },
  create,
})

/** Root identifier of a member chain: `a.b.c` → `a`. */
function getRootName({ type, object: memberObject, name }) {
  if (type === 'MemberExpression') {
    return getRootName(memberObject)
  }

  return type === 'Identifier' ? name : null
}

const impureGlobals = new Set([
  'console',
  'crypto',
  'document',
  'fetch',
  'globalThis',
  'localStorage',
  'navigator',
  'performance',
  'sessionStorage',
  'setInterval',
  'setTimeout',
  'window',
])

const functionTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

/** True when the identifier is a variable reference, not a property name or declaration. */
const nonReferenceChecks = {
  MemberExpression: ({ property, computed }, identifier) => property === identifier && !computed,
  Property: ({ key, computed }, identifier) => key === identifier && !computed,
  TSPropertySignature: () => true,
  ImportSpecifier: () => true,
}

const impureMembers = new Set(['Date.now', 'Math.random'])

/** True when the identifier is a variable reference, not a property name or declaration. */
function isReference(identifier) {
  const { parent } = identifier
  const type = getNodeType(parent)

  return !(Object.hasOwn(nonReferenceChecks, type) && nonReferenceChecks[type](parent, identifier))
}

/** True when `node` contains `return <value>` belonging to this function, not a nested one. */
function hasValueReturn(node) {
  if (!isAstObject(node)) {
    return false
  }

  if (node.type === 'ReturnStatement') {
    return node.argument !== null
  }

  return getChildNodes(node).some(
    (child) => !functionTypes.has(getNodeType(child)) && hasValueReturn(child),
  )
}

/** "Date.now" for `Date.now`, "" for computed or non-identifier members. */
function getMemberPath(node) {
  const objectName = getPath(node, ['object', 'name'])

  return node.computed ? '' : `${objectName}.${node.property.name}`
}

function checkImpureIdentifier(context, node) {
  if (impureGlobals.has(node.name) && isReference(node)) {
    report(context, node, `\`${node.name}\` is a side effect. Pass it in or move it to an edge.`)
  }
}

function checkImpureMember(context, node) {
  const memberPath = getMemberPath(node)

  if (impureMembers.has(memberPath)) {
    report(context, node, `\`${memberPath}()\` is impure. Pass the input in.`)
  }
}

function checkClockConstructor(context, node) {
  const isClockRead = getPath(node, ['callee', 'name']) === 'Date' && node.arguments.length === 0

  if (isClockRead) {
    report(context, node, '`new Date()` reads the clock. Pass today in as a parameter.')
  }
}

const plugin = {
  meta: { name: 'fp' },
  rules: {
    'no-class': createRule('Disallow classes', (context) => ({
      ClassDeclaration: (node) =>
        report(context, node, 'No classes. Use functions and plain data.'),
      ClassExpression: (node) => report(context, node, 'No classes. Use functions and plain data.'),
    })),

    'no-this': createRule('Disallow this', (context) => ({
      ThisExpression: (node) => report(context, node, 'No `this`. Pass data as arguments instead.'),
    })),

    'no-let': createRule('Disallow let and var', (context) => ({
      VariableDeclaration: (node) => {
        if (node.kind !== 'const' && node.kind !== 'using' && node.kind !== 'await using') {
          report(context, node, `No \`${node.kind}\`. Use \`const\` and derive new values.`)
        }
      },
    })),

    'no-loop': createRule('Disallow loop statements', (context) => {
      const message = 'No loops. Use map/filter/reduce/flatMap or recursion.'

      return {
        ForStatement: (node) => report(context, node, message),
        ForInStatement: (node) => report(context, node, message),
        ForOfStatement: (node) => report(context, node, message),
        WhileStatement: (node) => report(context, node, message),
        DoWhileStatement: (node) => report(context, node, message),
      }
    }),

    'no-mutation': createRule('Disallow mutating data', (context) => ({
      AssignmentExpression: (node) => {
        if (node.left.type === 'MemberExpression') {
          report(context, node, 'Don’t mutate objects. Build a new one with spread.')
        }
      },
      UpdateExpression: (node) =>
        report(context, node, `No \`${node.operator}\`. Derive a new value instead.`),
      UnaryExpression: (node) => {
        if (node.operator === 'delete') {
          report(context, node, 'No `delete`. Use destructuring: const { x, ...rest } = obj')
        }
      },
      CallExpression: (node) => {
        const { callee } = node

        if (callee.type !== 'MemberExpression' || callee.computed) {
          return
        }

        const { name } = callee.property

        if (!mutatingMethods.has(name)) {
          return
        }

        // Allow the Web Storage / URLSearchParams style APIs on well-known globals
        if (['localStorage', 'sessionStorage'].includes(getRootName(callee.object))) {
          return
        }

        report(context, node, `\`.${name}()\` mutates. Use ${immutableAlternatives[name]}.`)
      },
    })),

    'no-impure-globals': createRule(
      'Disallow clock, randomness, I/O and DOM globals',
      (context) => ({
        Identifier: (node) => checkImpureIdentifier(context, node),
        MemberExpression: (node) => checkImpureMember(context, node),
        NewExpression: (node) => checkClockConstructor(context, node),
      }),
    ),

    'require-return': createRule('Require functions to return a value', (context) => {
      const check = (node) => {
        const isExpressionBody = node.type === 'ArrowFunctionExpression' && node.expression

        if (!isExpressionBody && !hasValueReturn(node.body)) {
          report(
            context,
            node,
            'Functions return a value. A function without one only has side effects.',
          )
        }
      }

      return {
        FunctionDeclaration: check,
        FunctionExpression: check,
        ArrowFunctionExpression: check,
      }
    }),

    'no-async': createRule('Disallow async functions', (context) => {
      const check = (node) => {
        if (node.async) {
          report(context, node, 'No async here. Only storage adapters (the I/O edge) are async.')
        }
      }

      return {
        FunctionDeclaration: check,
        FunctionExpression: check,
        ArrowFunctionExpression: check,
      }
    }),

    'no-throw': createRule('Disallow throw', (context) => ({
      ThrowStatement: (node) =>
        report(context, node, 'No `throw`. Return a Result: fail(createAppError(kind, message)).'),
    })),
  },
}

export default plugin
