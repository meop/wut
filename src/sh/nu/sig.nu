# a ctrl-c means stop the run, in every shell wut speaks. zsh and pwsh already do, and so does nu, until a `try` is
# around it: nu raises the ctrl-c it gets as an error, and `try` catches that like any other failure. so every catch
# in wut's nu hands its error to wutRethrowInterrupt first, and goes on with its own handling only when that returns
def wutInterrupted [e: record] {
  let code = ($e.details.code? | default '')
  (
    # wut's own nu got the ctrl-c, which it raises as this (no error code), or from an `input` prompt as an io one
    ($e.debug | str starts-with 'Interrupted ') or
    ($code == 'nu::shell::io::interrupted') or
    # a command it ran died of SIGINT
    (($code == 'nu::shell::terminated_by_signal') and ($e.debug | str contains 'signal: 2,')) or
    # a command that read the ctrl-c itself exits 130; a `nu -c` whose command died of SIGINT exits 254 (256 - 2)
    (($code == 'nu::shell::non_zero_exit_code') and ($e.debug =~ '^NonZeroExitCode \{ exit_code: (130|254),'))
  )
}

def wutRethrowInterrupt [e: record] {
  if (wutInterrupted $e) {
    $e.raw
  }
}
