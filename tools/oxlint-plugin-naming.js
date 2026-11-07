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
 * - single-purpose: function names don't join two jobs with And/Or
 */

import { getChildNodes, getNodeType, getPath, isAstObject, runTypeCheck } from './ast-helpers.js'

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
  'clear',
  'extend',
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
  'dispatch',
  'download',
  'draw',
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
  'keep',
  'load',
  'log',
  'make',
  'map',
  'match',
  'merge',
  'normalize',
  'open',
  'pair',
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
  'retry',
  'round',
  'run',
  'save',
  'select',
  'sell',
  'send',
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
    .filter(({ length }) => length > 0)
    .map((word) => word.toLowerCase())
}

const functionExpressionTypes = new Set(['ArrowFunctionExpression', 'FunctionExpression'])
const jsxTypes = new Set(['JSXElement', 'JSXFragment'])
const booleanTypeNodes = new Set(['TSBooleanKeyword', 'TSTypePredicate'])

const constantChecks = {
  Literal: () => true,
  TemplateLiteral: ({ expressions }) => expressions.length === 0,
  UnaryExpression: ({ argument }) => argument.type === 'Literal',
  TSSatisfiesExpression: ({ expression }) => isConstantInitializer(expression),
  TSAsExpression: ({ typeAnnotation }) => isConstAssertion(typeAnnotation),
}

const booleanExpressionChecks = {
  Literal: ({ value: literalValue }) => typeof literalValue === 'boolean',
  UnaryExpression: ({ operator }) => operator === '!',
  BinaryExpression: ({ operator }) => comparisonOperators.has(operator),
}

const bindingCollectors = {
  Identifier: (pattern) => [pattern],
  ObjectPattern: ({ properties }) =>
    properties.flatMap(({ type, argument, value: boundPattern }) =>
      collectBindings(type === 'RestElement' ? argument : boundPattern),
    ),
  ArrayPattern: ({ elements }) => elements.flatMap((element) => collectBindings(element)),
  RestElement: ({ argument }) => collectBindings(argument),
  AssignmentPattern: ({ left }) => collectBindings(left),
  TSParameterProperty: ({ parameter }) => collectBindings(parameter),
}

function isTopLevel({ parent }) {
  const declaration = parent
  const containerType = getPath(declaration, ['parent', 'type'])
  const outerType = getPath(declaration, ['parent', 'parent', 'type'])

  const isTopContainer =
    containerType === 'Program' ||
    (containerType === 'ExportNamedDeclaration' && outerType === 'Program')

  return getPath(declaration, ['kind']) === 'const' && isTopContainer
}

function isConstAssertion(annotation) {
  return (
    getPath(annotation, ['typeName', 'name']) === 'const' ||
    getNodeType(annotation) === 'TSConstKeyword'
  )
}

/** Literal, `-1`, template without expressions, or `… as const` (optionally `satisfies …`). */
function isConstantInitializer(init) {
  return runTypeCheck(constantChecks, init, false)
}

function isFunctionNode(node) {
  return functionExpressionTypes.has(getNodeType(node))
}

function hasJsx(node) {
  if (!isAstObject(node)) {
    return false
  }

  return jsxTypes.has(node.type) || getChildNodes(node).some((child) => hasJsx(child))
}

function isBooleanType(annotation) {
  const typeNode = getPath(annotation, ['typeAnnotation'])

  const isBooleanLiteral =
    getNodeType(typeNode) === 'TSLiteralType' &&
    typeof getPath(typeNode, ['literal', 'value']) === 'boolean'

  return booleanTypeNodes.has(getNodeType(typeNode)) || isBooleanLiteral
}

function isBooleanExpression(node) {
  return runTypeCheck(booleanExpressionChecks, node, false)
}

function isFunctionType(annotation) {
  return getPath(annotation, ['typeAnnotation', 'type']) === 'TSFunctionType'
}

/** Identifiers bound by a pattern: `a`, `{ a, b: c }`, `[a, ...rest]`, `a = 1`. */
function collectBindings(pattern) {
  return runTypeCheck(bindingCollectors, pattern, [])
}

/** The property's name, or null for computed and non-identifier keys. */
function getPropertyName({ computed, key }) {
  const isNamed = !computed && key.type === 'Identifier'

  return isNamed ? key.name : null
}

/** True when a property key belongs to an interface or type named …Props. */
function isInPropsType(propertyKey) {
  return String(getPath(propertyKey, ['parent', 'parent', 'parent', 'id', 'name'])).endsWith(
    'Props',
  )
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

function describeFunctionVariable({ init }, identifier) {
  return {
    name: identifier.name,
    node: identifier,
    kind: 'function',
    isComponent: hasJsx(init.body),
    isBoolean: isBooleanType(init.returnType),
  }
}

function describePlainVariable(declarator, identifier) {
  const isOwnName = identifier === declarator.id

  return {
    name: identifier.name,
    node: identifier,
    kind: 'variable',
    isBoolean:
      isBooleanType(identifier.typeAnnotation) ||
      (isOwnName && isBooleanExpression(declarator.init)),
    isConstant: isOwnName && isTopLevel(declarator) && isConstantInitializer(declarator.init),
  }
}

function describeVariable(declarator, identifier) {
  const isFunctionValue = isFunctionNode(declarator.init) && declarator.id.type === 'Identifier'

  return isFunctionValue
    ? describeFunctionVariable(declarator, identifier)
    : describePlainVariable(declarator, identifier)
}

function describeNamedNode(node, kind) {
  return { name: node.name, node, kind }
}

function createBindingVisitors(check) {
  const checkAll = (declarations) => declarations.forEach((declaration) => check(declaration))
  const checkParameters = ({ params }) => checkAll(describeParameters(params))

  return {
    VariableDeclarator: (node) =>
      checkAll(collectBindings(node.id).map((identifier) => describeVariable(node, identifier))),
    FunctionExpression: checkParameters,
    ArrowFunctionExpression: checkParameters,
    CatchClause: ({ param }) =>
      checkAll(
        collectBindings(param).map((identifier) => describeNamedNode(identifier, 'parameter')),
      ),
    FunctionDeclaration: (node) => {
      if (node.id) {
        check({
          ...describeNamedNode(node.id, 'function'),
          isComponent: hasJsx(node.body),
          isBoolean: isBooleanType(node.returnType),
        })
      }

      checkParameters(node)
    },
  }
}

function createImportVisitors(check) {
  const checkLocal = ({ local }) => check(describeNamedNode(local, 'import'))

  return {
    ImportSpecifier: checkLocal,
    ImportDefaultSpecifier: checkLocal,
    ImportNamespaceSpecifier: checkLocal,
  }
}

function createTypeVisitors(check) {
  const checkTypeName = ({ id: typeName }) => typeName && check(describeNamedNode(typeName, 'type'))

  return {
    TSInterfaceDeclaration: checkTypeName,
    TSTypeAliasDeclaration: checkTypeName,
    TSEnumDeclaration: checkTypeName,
    ClassDeclaration: checkTypeName,
    TSTypeParameter: (node) =>
      check({
        name: typeof node.name === 'string' ? node.name : node.name.name,
        node,
        kind: 'typeParameter',
      }),
  }
}

function createPropertyVisitors(check) {
  const checkProperty = (node, isFunctionValue, typeNode) =>
    getPropertyName(node) &&
    check({
      ...describeNamedNode(node.key, 'property'),
      isFunctionValue,
      isBoolean: isBooleanType(typeNode),
    })

  return {
    TSPropertySignature: (node) =>
      checkProperty(node, isFunctionType(node.typeAnnotation), node.typeAnnotation),
    TSMethodSignature: (node) => checkProperty(node, true, node.returnType),
  }
}

/**
 * Calls `check(declaration)` for every declared name.
 * A declaration is { name, node, kind, isBoolean?, isConstant?, isComponent?, isFunctionValue? }.
 */
function createVisitors(check) {
  return {
    ...createBindingVisitors(check),
    ...createImportVisitors(check),
    ...createTypeVisitors(check),
    ...createPropertyVisitors(check),
  }
}

function createNamingRule(description, getProblem, createExtraVisitors = () => ({})) {
  return {
    meta: { type: 'suggestion', docs: { description } },
    create: (context) => ({
      ...createVisitors((declaration) => {
        const message = getProblem(declaration)

        if (message) {
          context.report({ node: declaration.node, message })
        }
      }),
      ...createExtraVisitors(context),
    }),
  }
}

const anyCasing = { pattern: /^/, label: '' }
const camelCasing = { pattern: CAMEL_CASE, label: 'Use camelCase' }
const pascalCasing = { pattern: PASCAL_CASE, label: 'Type names are PascalCase' }
const componentCasing = { pattern: PASCAL_CASE, label: 'Components are PascalCase' }

const constantCasing = {
  pattern: new RegExp(`${CAMEL_CASE.source}|${UPPER_SNAKE_CASE.source}`),
  label: 'Module constants are UPPER_SNAKE_CASE or camelCase',
}

const casingByKind = {
  import: anyCasing,
  type: pascalCasing,
  typeParameter: pascalCasing,
  function: camelCasing,
  variable: camelCasing,
  parameter: camelCasing,
  property: camelCasing,
}

function getCasingExpectation({ kind, isConstant, isComponent }) {
  if (isComponent) {
    return componentCasing
  }

  return isConstant ? constantCasing : casingByKind[kind]
}

/** Names a framework requires, exempt from casing: TanStack Router's `export const Route`. */
const frameworkNames = new Set(['Route'])

/** Interfaces whose property names a framework dictates: Vite's env variables (VITE_…). */
const frameworkInterfaces = new Set(['ImportMetaEnv'])

function isInFrameworkInterface(propertyKey) {
  return frameworkInterfaces.has(getPath(propertyKey, ['parent', 'parent', 'parent', 'id', 'name']))
}

function getCasingProblem(declaration) {
  if (frameworkNames.has(declaration.name) || isInFrameworkInterface(declaration.node)) {
    return null
  }

  const { pattern, label } = getCasingExpectation(declaration)

  return pattern.test(declaration.name) ? null : `${label}: "${declaration.name}".`
}

function isFunctionDeclaration({ kind, isFunctionValue }) {
  return kind === 'function' || (kind === 'property' && Boolean(isFunctionValue))
}

function getCallbackPropProblem({ name, kind, isFunctionValue, node }) {
  if (kind !== 'property' || !isInPropsType(node)) {
    return null
  }

  const isCallbackName = CALLBACK_PROP.test(name)

  if (isCallbackName === Boolean(isFunctionValue)) {
    return null
  }

  return isCallbackName
    ? `"${name}" starts with "on" but isn't a callback.`
    : `Callback prop "${name}" must be named on… (onSave, onClose).`
}

function getHandlerName(attributeNode) {
  const expression = getPath(attributeNode, ['value', 'expression'])
  const type = getNodeType(expression)

  if (type === 'Identifier') {
    return expression.name
  }

  return type === 'MemberExpression' && !expression.computed ? expression.property.name : ''
}

function createJsxHandlerVisitors(context) {
  return {
    JSXAttribute: (node) => {
      const attribute = getPath(node, ['name', 'name'])
      const isEventAttribute = typeof attribute === 'string' && CALLBACK_PROP.test(attribute)

      if (isEventAttribute && !HANDLER_NAME.test(getHandlerName(node))) {
        context.report({
          node,
          message: `Pass a named handler to ${attribute}: const handle… = () => …, or a forwarded on… prop.`,
        })
      }
    },
  }
}

function isVerbExempt({ name, kind, isComponent, node }) {
  return (
    Boolean(isComponent) ||
    (kind === 'property' && (CALLBACK_PROP.test(name) || isInPropsType(node)))
  )
}

function getVerbProblem(declaration) {
  if (!isFunctionDeclaration(declaration) || isVerbExempt(declaration)) {
    return null
  }

  const [firstWord] = splitWords(declaration.name)

  return verbs.has(firstWord)
    ? null
    : `Function "${declaration.name}" should start with a verb (get, compute, format, parse, create, …).`
}

function getJoinerProblem(declaration) {
  const joiner = splitWords(declaration.name).find((word) => word === 'and' || word === 'or')

  return isFunctionDeclaration(declaration) && joiner
    ? `"${declaration.name}" does two things ("${joiner}"). Split it into two functions.`
    : null
}

function getVagueNameProblem({ name, kind }) {
  // Types keep established names (Result); imports are checked where they're declared
  const isValue = !['type', 'typeParameter', 'import'].includes(kind)

  return isValue && vagueNames.has(name.toLowerCase())
    ? `"${name}" is vague. Name what it holds (trades, parsedState, saveOutcome, …).`
    : null
}

function getAbbreviationProblem({ name }) {
  const abbreviation = splitWords(name).find((word) => Object.hasOwn(abbreviations, word))

  return abbreviation
    ? `"${name}" contains the abbreviation "${abbreviation}". Use ${abbreviations[abbreviation]}.`
    : null
}

function getBooleanPrefixProblem({ name, isBoolean }) {
  return isBoolean && !BOOLEAN_PREFIX.test(name)
    ? `Boolean "${name}" must start with is/has/can/should/was/will/did.`
    : null
}

function getLengthProblem({ name }) {
  return name.length < MIN_LENGTH
    ? `"${name}" is too short. Use a descriptive name (index, trade, event, error, …).`
    : null
}

const plugin = {
  meta: { name: 'naming' },
  rules: {
    'min-length': createNamingRule('Require names of at least 3 characters', getLengthProblem),
    casing: createNamingRule('Enforce casing per kind of name', getCasingProblem),
    'no-vague-names': createNamingRule('Disallow vague names', getVagueNameProblem),
    'no-abbreviations': createNamingRule('Disallow abbreviations', getAbbreviationProblem),
    'boolean-prefix': createNamingRule(
      'Require boolean names to start with is/has/can/should/was/will/did',
      getBooleanPrefixProblem,
    ),
    'handler-names': createNamingRule(
      'Require on… props to be callbacks and JSX handlers to be named handle…/on…',
      getCallbackPropProblem,
      createJsxHandlerVisitors,
    ),
    'single-purpose': createNamingRule(
      'Disallow function names joining two jobs with And/Or',
      getJoinerProblem,
    ),
    'verb-first': createNamingRule('Require function names to start with a verb', getVerbProblem),
  },
}

export default plugin
