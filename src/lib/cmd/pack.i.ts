export interface Pack {
  add: (options: { names: Array<string> }) => Promise<void>
  del: (options: { names: Array<string> }) => Promise<void>
  find: (options: { names: Array<string> }) => Promise<void>
  list: (options: { names: Array<string> }) => Promise<void>
  out: (options: { names: Array<string> }) => Promise<void>
  tidy: (options: {}) => Promise<void>
  up: (options: { names: Array<string> }) => Promise<void>
}
