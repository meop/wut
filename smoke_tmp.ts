import { runSrv } from './src/srv.ts'
console.log(await (await runSrv(new Request('http://x' + Deno.args[0]))).text())
