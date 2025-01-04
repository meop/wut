export interface Virt {
  list: (options: { names: Array<string> }) => Promise<void>
  tidy: (options: {}) => Promise<void>
  up: (options: { names: Array<string> }) => Promise<void>
}
