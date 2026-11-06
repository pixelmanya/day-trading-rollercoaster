/**
 * In-repo oxlint plugin enforcing the naming conventions from CONTRIBUTING.md.
 * Loaded through oxlint's JS-plugin support (`jsPlugins` in .oxlintrc.json).
 *
 * Every rule looks at the same set of declared names: variables, functions, parameters, types,
 * type parameters, interface/type properties and import bindings. Names we only *use* (object
 * literal keys, members of other libraries, JSX attributes) are not checked.
 *
 * Rules (all prefixed `naming/`):
 * - min-length: names have at least 3 characters
 * - casing: camelCase, PascalCase for types/components, UPPER_SNAKE_CASE for module constants
 * - no-vague-names: no `data`, `item`, `value`, `result`, …
 * - no-abbreviations: no `btn`, `msg`, `idx`, `err`, … in any part of a name
 * - boolean-prefix: booleans start with is/has/can/should/was/will/did
 * - handler-names: `on…` props are callbacks; JSX `on…` attributes get `handle…`/`on…` functions
 * - verb-first: functions start with a verb
 */

const MIN_LENGTH = 3

const vagueNames = new Set([
  'data',
  'item',
  'items',
  'obj',
  'object',
  'val',
  'value',
  'values',
  'tmp',
  'temp',
  'res',
  'result',
  'info',
  'stuff',
  'thing',
  'things',
  'foo',
  'bar',
  'baz',
])

export const abbreviations = {
  acc: 'a name for what is accumulated (totals, balances, …)',
  amt: 'amount',
  arr: 'a plural noun (trades, prices, …)',
  btn: 'button',
  calc: 'calculate / calculation',
  cb: 'callback',
  cfg: 'config',
  cnt: 'count',
  conf: 'config',
  ctx: 'context',
  cur: 'current',
  curr: 'current',
  dest: 'destination',
  dt: 'date',
  el: 'element',
  elem: 'element',
  err: 'error',
  eur: 'euro',
  evt: 'event',
  fmt: 'format',
  fn: 'a name for what the function does',
  idx: 'index',
  len: 'length',
  msg: 'message',
  num: 'number / a name for what is counted',
  obj: 'a name for what the object is',
  opts: 'options',
  pct: 'percent',
  pos: 'position',
  prev: 'previous',
  qty: 'quantity',
  req: 'request',
  res: 'response / a specific name',
  src: 'source',
  str: 'a name for what the text is',
  tmp: 'a specific name',
  val: 'a specific name',
}

const BOOLEAN_PREFIX = /^(is|has|can|should|was|will|did)[A-Z]/

const verbs = new Set([
  'add',
  'apply',
  'assert',
  'build',
  'buy',
  'calculate',
  'can',
  'chain',
  'check',
  'close',
  'collect',
  'compare',
  'compute',
  'convert',
  'count',
  'create',
  'decode',
  'derive',
  'describe',
  'did',
  'download',
  'encode',
  'ensure',
  'export',
  'extract',
  'fail',
  'fetch',
  'filter',
  'find',
  'focus',
  'format',
  'get',
  'group',
  'handle',
  'has',
  'hide',
  'import',
  'is',
  'join',
  'load',
  'log',
  'make',
  'map',
  'merge',
  'normalize',
  'open',
  'parse',
  'pick',
  'pipe',
  'read',
  'reduce',
  'remove',
  'render',
  'replace',
  'report',
  'reset',
  'resolve',
  'round',
  'run',
  'save',
  'select',
  'sell',
  'serialize',
  'should',
  'show',
  'sort',
  'split',
  'start',
  'stop',
  'subscribe',
  'succeed',
  'sum',
  'summarize',
  'to',
  'toggle',
  'try',
  'update',
  'unwrap',
  'upload',
  'use',
  'validate',
  'was',
  'will',
  'wrap',
  'write',
])

const comparisonOperators = new Set([
  '===',
  '!==',
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  'in',
  'instanceof',
])

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/
const UPPER_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/
const HANDLER_NAME = /^(handle|on)[A-Z]/
const CALLBACK_PROP = /^on[A-Z]/

/** "closeBtnLabel" → ["close", "btn", "label"]; "MAX_TRADES" → ["max", "trades"]. */
function splitWords(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase())
}

function isTopLevel(declarator) {
  const declaration = declarator.parent
  const container = declaration?.parent

  return (
    declaration?.kind === 'const' &&
    (container?.type === 'Program' ||
      (container?.type === 'ExportNamedDeclaration' && container.parent?.type === 'Program'))
  )
}

/** Literal, `-1`, template without expressions, or `… as const` (optionally `satisfies …`). */
function isConstantInitializer(init) {
  if (!init) {
    return false
  }

  if (init.type === 'TSSatisfiesExpression') {
    return isConstantInitializer(init.expression)
  }

  if (init.type === 'TSAsExpression') {
    return (
      init.typeAnnotation?.typeName?.name === 'const' ||
      init.typeAnnotation?.type === 'TSConstKeyword'
    )
  }

  if (init.type === 'Literal') {
    return true
  }

  if (init.type === 'TemplateLiteral') {
    return init.expressions.length === 0
  }

  return init.type === 'UnaryExpression' && init.argument.type === 'Literal'
}

function isFunctionNode(node) {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
}

function hasJsx(node) {
  if (!node || typeof node !== 'object') {
    return false
  }

  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    return true
  }

  return Object.entries(node).some(
    ([key, child]) =>
      key !== 'parent' &&
      (Array.isArray(child) ? child.some((entry) => hasJsx(entry)) : hasJsx(child)),
  )
}

function isBooleanType(annotation) {
  const type = annotation?.typeAnnotation

  return (
    type?.type === 'TSBooleanKeyword' ||
    type?.type === 'TSTypePredicate' ||
    (type?.type === 'TSLiteralType' && typeof type.literal?.value === 'boolean')
  )
}

function isBooleanExpression(node) {
  if (!node) {
    return false
  }

  if (node.type === 'Literal') {
    return typeof node.value === 'boolean'
  }

  if (node.type === 'UnaryExpression') {
    return node.operator === '!'
  }

  return node.type === 'BinaryExpression' && comparisonOperators.has(node.operator)
}

function isFunctionType(annotation) {
  return annotation?.typeAnnotation?.type === 'TSFunctionType'
}

/** Identifiers bound by a pattern: `a`, `{ a, b: c }`, `[a, ...rest]`, `a = 1`. */
function collectBindings(pattern) {
  if (!pattern) {
    return []
  }

  switch (pattern.type) {
    case 'Identifier':
      return [pattern]
    case 'ObjectPattern':
      return pattern.properties.flatMap((property) =>
        collectBindings(property.type === 'RestElement' ? property.argument : property.value),
      )
    case 'ArrayPattern':
      return pattern.elements.flatMap((element) => collectBindings(element))
    case 'RestElement':
      return collectBindings(pattern.argument)
    case 'AssignmentPattern':
      return collectBindings(pattern.left)
    case 'TSParameterProperty':
      return collectBindings(pattern.parameter)
    default:
      return []
  }
}

function describeParameters(params) {
  return params.flatMap((param) =>
    collectBindings(param).map((identifier) => ({
      name: identifier.name,
      node: identifier,
      kind: 'parameter',
      isBoolean:
        isBooleanType(identifier.typeAnnotation) ||
        (param.type === 'AssignmentPattern' && isBooleanExpression(param.right)),
    })),
  )
}

/**
 * Calls `check(declaration)` for every name declared at `node`.
 * A declaration is { name, node, kind, isBoolean?, isConstant?, isComponent?, isFunctionValue? }.
 */
function createVisitors(check) {
  const checkAll = (declarations) => declarations.forEach((declaration) => check(declaration))
  const checkFunction = (node) => checkAll(describeParameters(node.params))

  return {
    VariableDeclarator: (node) => {
      const isFunctionValue = isFunctionNode(node.init) && node.id.type === 'Identifier'

      checkAll(
        collectBindings(node.id).map((identifier) => ({
          name: identifier.name,
          node: identifier,
          kind: isFunctionValue ? 'function' : 'variable',
          isComponent: isFunctionValue && hasJsx(node.init.body),
          isBoolean: isFunctionValue
            ? isBooleanType(node.init.returnType)
            : isBooleanType(identifier.typeAnnotation) ||
              (identifier === node.id && isBooleanExpression(node.init)),
          isConstant:
            identifier === node.id && isTopLevel(node) && isConstantInitializer(node.init),
        })),
      )
    },
    FunctionDeclaration: (node) => {
      if (node.id) {
        check({
          name: node.id.name,
          node: node.id,
          kind: 'function',
          isComponent: hasJsx(node.body),
          isBoolean: isBooleanType(node.returnType),
        })
      }

      checkFunction(node)
    },
    FunctionExpression: checkFunction,
    ArrowFunctionExpression: checkFunction,
    CatchClause: (node) =>
      checkAll(
        collectBindings(node.param).map((identifier) => ({
          name: identifier.name,
          node: identifier,
          kind: 'parameter',
        })),
      ),
    ImportSpecifier: (node) => check({ name: node.local.name, node: node.local, kind: 'import' }),
    ImportDefaultSpecifier: (node) =>
      check({ name: node.local.name, node: node.local, kind: 'import' }),
    ImportNamespaceSpecifier: (node) =>
      check({ name: node.local.name, node: node.local, kind: 'import' }),
    TSInterfaceDeclaration: (node) => check({ name: node.id.name, node: node.id, kind: 'type' }),
    TSTypeAliasDeclaration: (node) => check({ name: node.id.name, node: node.id, kind: 'type' }),
    TSEnumDeclaration: (node) => check({ name: node.id.name, node: node.id, kind: 'type' }),
    ClassDeclaration: (node) =>
      node.id && check({ name: node.id.name, node: node.id, kind: 'type' }),
    TSTypeParameter: (node) => {
      const name = typeof node.name === 'string' ? node.name : node.name.name
      check({ name, node, kind: 'typeParameter' })
    },
    TSPropertySignature: (node) => {
      if (node.computed || node.key.type !== 'Identifier') {
        return
      }

      check({
        name: node.key.name,
        node: node.key,
        kind: 'property',
        isBoolean: isBooleanType(node.typeAnnotation),
        isFunctionValue: isFunctionType(node.typeAnnotation),
      })
    },
    TSMethodSignature: (node) => {
      if (node.computed || node.key.type !== 'Identifier') {
        return
      }

      check({
        name: node.key.name,
        node: node.key,
        kind: 'property',
        isFunctionValue: true,
        isBoolean: isBooleanType(node.returnType),
      })
    },
  }
}

function createNamingRule(description, checkDeclaration, extraVisitors = () => ({})) {
  return {
    meta: { type: 'suggestion', docs: { description } },
    create: (context) => ({
      ...createVisitors((declaration) => {
        const message = checkDeclaration(declaration)

        if (message) {
          context.report({ node: declaration.node, message })
        }
      }),
      ...extraVisitors(context),
    }),
  }
}

function getCasingProblem({ name, kind, isConstant, isComponent }) {
  if (kind === 'import') {
    return null
  }

  if (kind === 'type' || kind === 'typeParameter') {
    return PASCAL_CASE.test(name) ? null : `Type names are PascalCase: "${name}".`
  }

  if (kind === 'function' && isComponent) {
    return PASCAL_CASE.test(name) ? null : `Components are PascalCase: "${name}".`
  }

  if (CAMEL_CASE.test(name)) {
    return null
  }

  if (isConstant && UPPER_SNAKE_CASE.test(name)) {
    return null
  }

  return isConstant
    ? `Module constants are UPPER_SNAKE_CASE or camelCase: "${name}".`
    : `Use camelCase: "${name}".`
}

const plugin = {
  meta: { name: 'naming' },
  rules: {
    'min-length': createNamingRule('Require names of at least 3 characters', ({ name }) =>
      name.length < MIN_LENGTH
        ? `"${name}" is too short. Use a descriptive name (index, trade, event, error, …).`
        : null,
    ),

    casing: createNamingRule('Enforce casing per kind of name', getCasingProblem),

    // Values only: established type names such as Result stay allowed
    'no-vague-names': createNamingRule('Disallow vague names', ({ name, kind }) =>
      kind !== 'type' && kind !== 'typeParameter' && vagueNames.has(name.toLowerCase())
        ? `"${name}" is vague. Name what it holds (trades, parsedState, saveOutcome, …).`
        : null,
    ),

    'no-abbreviations': createNamingRule('Disallow abbreviations', ({ name }) => {
      const abbreviation = splitWords(name).find((word) => Object.hasOwn(abbreviations, word))

      return abbreviation
        ? `"${name}" contains the abbreviation "${abbreviation}". Use ${abbreviations[abbreviation]}.`
        : null
    }),

    'boolean-prefix': createNamingRule(
      'Require boolean names to start with is/has/can/should/was/will/did',
      ({ name, isBoolean }) =>
        isBoolean && !BOOLEAN_PREFIX.test(name)
          ? `Boolean "${name}" must start with is/has/can/should/was/will/did.`
          : null,
    ),

    'handler-names': createNamingRule(
      'Require on… props to be callbacks and JSX handlers to be named handle…/on…',
      ({ name, kind, isFunctionValue, node }) => {
        if (kind !== 'property') {
          return null
        }

        const owner = node.parent?.parent?.parent
        const ownerName = owner?.id?.name ?? ''

        if (!ownerName.endsWith('Props')) {
          return null
        }

        if (CALLBACK_PROP.test(name) && !isFunctionValue) {
          return `"${name}" starts with "on" but isn't a callback.`
        }

        if (!CALLBACK_PROP.test(name) && isFunctionValue) {
          return `Callback prop "${name}" must be named on… (onSave, onClose).`
        }

        return null
      },
      (context) => ({
        JSXAttribute: (node) => {
          const attribute = node.name?.name

          if (typeof attribute !== 'string' || !CALLBACK_PROP.test(attribute)) {
            return
          }

          const expression = node.value?.expression

          const handlerName =
            expression?.type === 'Identifier'
              ? expression.name
              : expression?.type === 'MemberExpression' && !expression.computed
                ? expression.property.name
                : null

          if (handlerName && HANDLER_NAME.test(handlerName)) {
            return
          }

          context.report({
            node,
            message: `Pass a named handler to ${attribute}: const handle… = () => …, or a forwarded on… prop.`,
          })
        },
      }),
    ),

    'verb-first': createNamingRule(
      'Require function names to start with a verb',
      ({ name, kind, isComponent, isFunctionValue, node }) => {
        const isFunction = kind === 'function' || (kind === 'property' && isFunctionValue)

        if (!isFunction || isComponent) {
          return null
        }

        if (kind === 'property' && CALLBACK_PROP.test(name)) {
          return null
        }

        const [firstWord] = splitWords(name)

        if (verbs.has(firstWord)) {
          return null
        }

        const owner = node.parent?.parent?.parent?.id?.name ?? ''

        return kind === 'property' && owner.endsWith('Props')
          ? null
          : `Function "${name}" should start with a verb (get, compute, format, parse, create, …).`
      },
    ),
  },
}

export default plugin
