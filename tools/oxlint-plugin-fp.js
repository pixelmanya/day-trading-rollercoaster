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
 */

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
function getRootName(node) {
  return node.type === 'MemberExpression'
    ? getRootName(node.object)
    : node.type === 'Identifier'
      ? node.name
      : null
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
        const callee = node.callee

        if (callee.type !== 'MemberExpression' || callee.computed) {
          return
        }

        const name = callee.property.name

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

    'no-throw': createRule('Disallow throw', (context) => ({
      ThrowStatement: (node) =>
        report(context, node, 'No `throw`. Return a Result: fail(createAppError(kind, message)).'),
    })),
  },
}

export default plugin
