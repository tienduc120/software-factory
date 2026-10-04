export type Clock = {
  now(): Date;
};

export const Clock = Symbol('Clock');
