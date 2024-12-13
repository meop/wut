import pkg from '../package.json' with { type: 'json' }
import { runProg } from './lib/prog.ts'

await runProg(pkg.name, pkg.description)
