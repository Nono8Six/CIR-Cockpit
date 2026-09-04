export const assert = (value: unknown, message?: string): void => {
  if (!value) {
    throw new Error(message ?? "Expected value to be truthy.");
  }
};

export const assertFalse = (value: unknown, message?: string): void => {
  if (value) {
    throw new Error(message ?? "Expected value to be false.");
  }
};

export const assertStrictEquals = (
  actual: unknown,
  expected: unknown,
  message?: string,
): void => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      message ?? `Expected ${String(expected)} but received ${String(actual)}.`,
    );
  }
};

export const assertMatch = (
  actual: string,
  pattern: RegExp,
  message?: string,
): void => {
  if (!pattern.test(actual)) {
    throw new Error(
      message ?? `Expected ${actual} to match ${pattern.toString()}.`,
    );
  }
};

export const assertStringIncludes = (
  actual: string,
  expected: string,
  message?: string,
): void => {
  if (!actual.includes(expected)) {
    throw new Error(
      message ?? `Expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}.`,
    );
  }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const deepEqual = (actual: unknown, expected: unknown): boolean => {
  if (Object.is(actual, expected)) {
    return true;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length
      && actual.every((item, index) => deepEqual(item, expected[index]));
  }
  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }
  if (isObject(actual) && isObject(expected)) {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    if (actualKeys.length !== expectedKeys.length) {
      return false;
    }
    return actualKeys.every((key) =>
      Object.prototype.hasOwnProperty.call(expected, key)
      && deepEqual(actual[key], expected[key])
    );
  }
  return false;
};

export const assertEquals = (
  actual: unknown,
  expected: unknown,
  message?: string,
): void => {
  if (!deepEqual(actual, expected)) {
    throw new Error(
      message ??
        `Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}.`,
    );
  }
};

export const assertExists = <T>(
  value: T,
  message?: string,
): asserts value is NonNullable<T> => {
  if (value === null || value === undefined) {
    throw new Error(message ?? "Expected value to exist.");
  }
};

export const assertThrows = (
  fn: () => unknown,
  _errorClass?: unknown,
  _messageIncludes?: string,
): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected function to throw.");
};

export const assertRejects = async (
  fn: () => Promise<unknown>,
  _errorClass?: unknown,
  _messageIncludes?: string,
): Promise<unknown> => {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected function to reject.");
};
