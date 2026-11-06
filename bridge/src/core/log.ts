export const log = (...args: unknown[]): void =>
  console.log(new Date().toTimeString().slice(0, 8), ...args)
