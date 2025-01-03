import colors from 'yoctocolors'

const newLineStr = '\n'
const colorStr = (name: string, str: string) => `${colors[name](str)}`
const stdoutWrite = (msg: string) => process.stdout.write(msg)
const stderrWrite = (msg: string) => process.stderr.write(msg)

function colorLog(
  msg: string,
  newLine: boolean,
  color: string = 'white',
  writeFunc: (str: string) => void = stdoutWrite,
) {
  writeFunc(colorStr(color, msg))
  if (newLine) {
    writeFunc(newLineStr)
  }
}

export function log(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine)
}
export function logCmd(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine, 'cyan')
}
export function logArg(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine, 'magenta')
}
export function logDebug(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine, 'blue')
}
export function logInfo(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine, 'green')
}
export function logWarn(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine, 'yellow')
}
export function logError(msg: string, newLine: boolean = true) {
  colorLog(msg, newLine, 'red', stderrWrite)
}
