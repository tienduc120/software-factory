declare const brandKey: unique symbol;

export type Brand<T, Name extends string> = T & { readonly [brandKey]: Name };

/** Attaches a compile-time brand only; callers must validate `value` first. */
export function brand<T, Name extends string>(value: T, _name: Name): Brand<T, Name> {
  return value as Brand<T, Name>;
}
