$env.config.show_banner = false

alias bd = cd -
alias ud = cd ..

def v --wrapped [...args] {
  ^($env.VISUAL) ...$args
}
