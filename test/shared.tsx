/**
 * Return a deep copy of a vnode, omitting internal fields that have a `__`
 * prefix.
 *
 * Stripping private fields is useful when comparing vnodes because the private
 * fields may differ even if the VNodes are logically the same value. For example
 * in some Preact versions VNodes include an ID counter field.
 */
export function stripInternalVNodeFields(obj: object | string) {
  if (typeof obj == 'string') {
    return obj;
  }

  const result = {} as Record<string, any>;
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('__')) {
      if (Array.isArray(value)) {
        result[key] = value.map(v => stripInternalVNodeFields(v));
      } else if (typeof value === 'object' && value !== null) {
        result[key] = stripInternalVNodeFields(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as preact.VNode<any>;
}
