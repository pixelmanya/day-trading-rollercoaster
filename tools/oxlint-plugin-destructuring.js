/**
 * In-repo oxlint plugin enforcing destructuring from CONTRIBUTING.md.
 * Loaded through oxlint's JS-plugin support (`jsPlugins` in .oxlintrc.json).
 *
 * Rule `destructuring/parameters`: a parameter that is only ever used to read properties
 * (`trade.shares`, `trade.buyPrice`) must be destructured in the parameter list instead:
 * `({ shares, buyPrice }) => …`. Parameters are left alone when they are used whole (passed on,
 * returned, used in a type predicate), when a property is called as a method (destructuring
 * would lose `this`), read with `?.` or a computed key, when they are arrays or primitives, or
 * when one property is tested in a condition while others are read (a likely discriminated
 * union such as Result, which TypeScript can only narrow while it's whole).
 * Fixable with `oxlint --fix` when no destructured name collides with another name.
 */

import { getChildNodes, getNodeType, getPath, isAstObject } from './ast-helpers.js'

const functionTypes = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
])

const skippedTypeNodes = new Set([
  'TSArrayType',
  'TSTupleType',
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBooleanKeyword',
  'TSBigIntKeyword',
  'TSUnknownKeyword',
  'TSAnyKeyword',
])

const arrayTypeNames = new Set([
  'Array',
  'ReadonlyArray',
  'Set',
  'Map',
  'ReadonlySet',
  'ReadonlyMap',
])

const nonReferenceChecks = {
  MemberExpression: ({ property, computed }, identifier) => property === identifier && !computed,
  Property: ({ key, computed }, identifier) => key === identifier && !computed,
  TSPropertySignature: () => true,
}

/** The parameter's type node, unwrapping `readonly T[]`. */
function getParameterType(parameter) {
  const typeNode = getPath(parameter, ['typeAnnotation', 'typeAnnotation'])

  return getNodeType(typeNode) === 'TSTypeOperator' ? typeNode.typeAnnotation : typeNode
}

function isSkippedType(parameter) {
  const typeNode = getParameterType(parameter)

  return (
    skippedTypeNodes.has(getNodeType(typeNode)) ||
    arrayTypeNames.has(getPath(typeNode, ['typeName', 'name']))
  )
}

function isReference(identifier) {
  const { parent } = identifier
  const type = getNodeType(parent)

  return !(Object.hasOwn(nonReferenceChecks, type) && nonReferenceChecks[type](parent, identifier))
}

/** All references to `name` inside `node`. */
function collectReferences(node, name) {
  if (!isAstObject(node)) {
    return []
  }

  if (node.type === 'Identifier') {
    return node.name === name && isReference(node) ? [node] : []
  }

  return getChildNodes(node).flatMap((child) => collectReferences(child, name))
}

function isCalled(member) {
  const { parent } = member

  return getNodeType(parent) === 'CallExpression' && parent.callee === member
}

/** `reference.property` as a plain read: not computed, not optional, not a method call. */
function isPlainPropertyRead(reference) {
  const { parent } = reference
  const isMemberObject = getNodeType(parent) === 'MemberExpression' && parent.object === reference

  return isMemberObject && !parent.computed && !parent.optional && !isCalled(parent)
}

const reservedWords = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'let',
  'static',
  'await',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
  'arguments',
  'eval',
])

const conditionParents = {
  IfStatement: ({ test }, child) => test === child,
  ConditionalExpression: ({ test }, child) => test === child,
  LogicalExpression: ({ left }, child) => left === child,
  WhileStatement: ({ test }, child) => test === child,
}

/** True when `node` sits inside a condition, below its own function. */
function isInCondition(node) {
  const { parent } = node
  const type = getNodeType(parent)

  if (parent == null || functionTypes.has(type)) {
    return false
  }

  const isCondition = Object.hasOwn(conditionParents, type) && conditionParents[type](parent, node)

  return isCondition || isInCondition(parent)
}

/**
 * True when the parameter looks like a discriminated union: one property is tested in a
 * condition and others are read too. Destructuring would stop TypeScript from narrowing it.
 */
function isLikelyDiscriminated(references) {
  const hasTestedProperty = references.some(({ parent }) => isInCondition(parent))

  return hasTestedProperty && getReadProperties(references).length > 1
}

function getReadProperties(references) {
  return [...new Set(references.map(({ parent }) => parent.property.name))]
}

function getRange({ range, start, end }) {
  return range ?? [start, end]
}

/** Variable names referenced in the function other than the parameter itself. */
function collectOtherNames(functionNode, parameterName) {
  const collectNames = (node) => {
    if (!isAstObject(node)) {
      return []
    }

    const ownName = node.type === 'Identifier' && isReference(node) ? [node.name] : []

    return [...ownName, ...getChildNodes(node).flatMap((child) => collectNames(child))]
  }

  return new Set(collectNames(functionNode).filter((name) => name !== parameterName))
}

/** The fix is safe when the parameter sits in parentheses and no new name collides. */
function isFixable({ text, functionNode, parameter, properties }) {
  const [start] = getRange(parameter)
  const isParenthesized = /[(,]\s*$/.test(text.slice(0, start))
  const otherNames = collectOtherNames(functionNode, parameter.name)

  const hasCollision = properties.some(
    (property) => otherNames.has(property) || reservedWords.has(property),
  )

  return isParenthesized && !hasCollision
}

function createFix({ parameter, references, properties }) {
  const [start] = getRange(parameter)

  return (fixer) => [
    fixer.replaceTextRange([start, start + parameter.name.length], `{ ${properties.join(', ')} }`),
    ...references.map(({ parent }) => fixer.replaceText(parent, parent.property.name)),
  ]
}

function checkParameter(context, functionNode, parameter) {
  const scope = [functionNode.body, functionNode.returnType]
  const references = scope.flatMap((node) => collectReferences(node, parameter.name))

  const isOnlyRead =
    references.length > 0 && references.every((reference) => isPlainPropertyRead(reference))

  if (!isOnlyRead || isLikelyDiscriminated(references)) {
    return
  }

  const properties = getReadProperties(references)
  const { text } = context.sourceCode
  const fixInput = { text, functionNode, parameter, references, properties }

  context.report({
    node: parameter,
    message: `"${parameter.name}" is only used for its properties. Destructure it: { ${properties.join(', ')} }.`,
    ...(isFixable(fixInput) && { fix: createFix(fixInput) }),
  })
}

function checkFunction(context, functionNode) {
  functionNode.params
    .filter((parameter) => getNodeType(parameter) === 'Identifier' && !isSkippedType(parameter))
    .forEach((parameter) => checkParameter(context, functionNode, parameter))
}

const plugin = {
  meta: { name: 'destructuring' },
  rules: {
    parameters: {
      meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: { description: 'Require destructuring of parameters used only for properties' },
      },
      create: (context) =>
        Object.fromEntries(
          [...functionTypes].map((type) => [type, (node) => checkFunction(context, node)]),
        ),
    },
  },
}

export default plugin
