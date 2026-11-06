/**
 * Small helpers shared by the in-repo oxlint plugins. They replace long optional chains and
 * type switches with lookups, which keeps each rule function small and simple.
 */

/** Follow `keys` from `node`, stopping at the first missing step: getPath(n, ['id', 'name']). */
export function getPath(node, keys) {
  return keys.reduce((current, key) => (current == null ? undefined : current[key]), node)
}

/** The node's `type`, or '' for a missing node. */
export function getNodeType(node) {
  return node == null ? '' : node.type
}

/** True for objects that can be AST nodes (and their nested arrays and objects). */
export function isAstObject(node) {
  return node !== null && typeof node === 'object'
}

/** Child nodes of `node`, flattening arrays and skipping the `parent` back-link. */
export function getChildNodes(node) {
  return Object.entries(node)
    .filter(([key]) => key !== 'parent')
    .flatMap(([, child]) => (Array.isArray(child) ? child : [child]))
}

/**
 * Look up a check by the node's type and run it: runTypeCheck({ Literal: isTrue }, node, false).
 * Returns `fallback` when no check exists for the type.
 */
export function runTypeCheck(checks, node, fallback) {
  const type = getNodeType(node)

  return Object.hasOwn(checks, type) ? checks[type](node) : fallback
}
