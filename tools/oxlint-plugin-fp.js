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

const MUTATING_METHODS = new Set([
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

const IMMUTABLE_ALTERNATIVE = {
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

const rule = (description, create) => ({ meta: { type: 'problem', docs: { description } }, create })

/** Root identifier of a member chain: `a.b.c` → `a`. */
function rootName(node) {
  return node.type === 'MemberExpression'
    ? rootName(node.object)
    : node.type === 'Identifier'
      ? node.name
      : null
}

const plugin = {
  meta: { name: 'fp' },
  rules: {
    'no-class': rule('Disallow classes', (context) => ({
      ClassDeclaration: (node) =>
        report(context, node, 'No classes. Use functions and plain data.'),
      ClassExpression: (node) => report(context, node, 'No classes. Use functions and plain data.'),
    })),

    'no-this': rule('Disallow this', (context) => ({
      ThisExpression: (node) => report(context, node, 'No `this`. Pass data as arguments instead.'),
    })),

    'no-let': rule('Disallow let and var', (context) => ({
      VariableDeclaration: (node) => {
        if (node.kind !== 'const' && node.kind !== 'using' && node.kind !== 'await using')
          report(context, node, `No \`${node.kind}\`. Use \`const\` and derive new values.`)
      },
    })),

    'no-loop': rule('Disallow loop statements', (context) => {
      const msg = 'No loops. Use map/filter/reduce/flatMap or recursion.'
      return {
        ForStatement: (node) => report(context, node, msg),
        ForInStatement: (node) => report(context, node, msg),
        ForOfStatement: (node) => report(context, node, msg),
        WhileStatement: (node) => report(context, node, msg),
        DoWhileStatement: (node) => report(context, node, msg),
      }
    }),

    'no-mutation': rule('Disallow mutating data', (context) => ({
      AssignmentExpression: (node) => {
        if (node.left.type === 'MemberExpression')
          report(context, node, 'Don’t mutate objects. Build a new one with spread.')
      },
      UpdateExpression: (node) =>
        report(context, node, `No \`${node.operator}\`. Derive a new value instead.`),
      UnaryExpression: (node) => {
        if (node.operator === 'delete')
          report(context, node, 'No `delete`. Use destructuring: const { x, ...rest } = obj')
      },
      CallExpression: (node) => {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return
        const name = callee.property.name
        if (!MUTATING_METHODS.has(name)) return
        // Allow the Web Storage / URLSearchParams style APIs on well-known globals
        if (['localStorage', 'sessionStorage'].includes(rootName(callee.object))) return
        report(context, node, `\`.${name}()\` mutates. Use ${IMMUTABLE_ALTERNATIVE[name]}.`)
      },
    })),

    'no-throw': rule('Disallow throw', (context) => ({
      ThrowStatement: (node) =>
        report(context, node, 'No `throw`. Return a Result: err({ kind, message }).'),
    })),
  },
}

export default plugin
