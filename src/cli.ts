import { buildProg } from './prog'

const prog = await buildProg()
await prog.parseAsync()
