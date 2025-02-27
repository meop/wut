interface ShellBlock {
  ifPathExists(): Array<string>
  ifDirPathExists(): Array<string>
  ifFilePathExists(): Array<string>
  ifProgInPath(): Array<string>
}
