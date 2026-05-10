type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

function assertNode(path: string, value: unknown): void {
  if (value === null) return;
  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return;
  }

  if (valueType === 'function' || valueType === 'symbol' || valueType === 'undefined') {
    throw new Error(`Non-serializable value at "${path}" (${valueType}).`);
  }

  if (value instanceof Date) {
    throw new Error(`Date is not allowed at "${path}". Convert to ISO string first.`);
  }

  if (value instanceof Map || value instanceof Set) {
    throw new Error(`Map/Set is not allowed at "${path}".`);
  }

  if (value instanceof Error) {
    throw new Error(`Error instance is not allowed at "${path}". Pass a plain object/string.`);
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertNode(`${path}[${index}]`, value[index]);
    }
    return;
  }

  if (valueType === 'object') {
    const record = value as Record<string, unknown>;
    for (const [key, node] of Object.entries(record)) {
      assertNode(`${path}.${key}`, node);
    }
    return;
  }

  throw new Error(`Unsupported value at "${path}" (${String(value)}).`);
}

export function assertSerializableProps(name: string, value: JsonLike | Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  assertNode(name, value);
}
