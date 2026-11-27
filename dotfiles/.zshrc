# ==========================================
# Blazing-Fast Lightweight .zshrc
# Zero Oh-My-Zsh bloat (~20ms startup)
# ==========================================

# 1. History Settings (Essential for Autosuggestions)
HISTFILE="$HOME/.zsh_history"
HISTSIZE=10000
SAVEHIST=10000
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt SHARE_HISTORY
setopt APPEND_HISTORY

# 2. Keybindings & Emacs Mode
bindkey -e
bindkey '^[[A' up-line-or-history
bindkey '^[OA' up-line-or-history
bindkey '^[[B' down-line-or-history
bindkey '^[OB' down-line-or-history
bindkey '^[[C' forward-char
bindkey '^[OC' forward-char
bindkey '^[[D' backward-char
bindkey '^[OD' backward-char

# 3. Prompt & Git Branch Integration
autoload -Uz vcs_info add-zsh-hook
setopt PROMPT_SUBST

# Ensure ~ displays correctly across Termux symlinks (/data/data vs /data/user/0)
chpwd_termux_home() {
  if [[ "$PWD" == /data/data/ai.antigem/files/home* ]]; then
    HOME="/data/data/ai.antigem/files/home"
  elif [[ "$PWD" == /data/user/0/ai.antigem/files/home* ]]; then
    HOME="/data/user/0/ai.antigem/files/home"
  fi
}
add-zsh-hook chpwd chpwd_termux_home
chpwd_termux_home

# Configure git branch via built-in vcs_info (zero lag)
zstyle ':vcs_info:*' enable git
zstyle ':vcs_info:git:*' formats ' %F{yellow}(%b)%f'
zstyle ':vcs_info:git:*' actionformats ' %F{yellow}(%b|%a)%f'

precmd() {
  vcs_info
}

# Terminal prompt: ➜ (in blue) foldername (branch) 
PROMPT='%F{blue}➜%f %F{cyan}%1~%f${vcs_info_msg_0_} '

# 3.5 Fast Cached Completion System (Required for Tab & Autosuggest completion strategy)
autoload -Uz compinit
if [[ -f "$HOME/.zcompdump" ]]; then
  compinit -C -d "$HOME/.zcompdump"
else
  compinit -d "$HOME/.zcompdump"
fi
zstyle ':completion:*' rehash true

# 4. Zsh Autosuggestions
ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=244'
ZSH_AUTOSUGGEST_STRATEGY=(history completion)

if [[ -f ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
  source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh
  # Arrow right (->) accepts the suggestion
  bindkey '^[[C' forward-char
  bindkey '^[OC' forward-char
fi

# 5. Zsh Syntax Highlighting (Green for valid, Red for invalid)
typeset -A ZSH_HIGHLIGHT_STYLES
ZSH_HIGHLIGHT_STYLES[command]='fg=green'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=green'
ZSH_HIGHLIGHT_STYLES[alias]='fg=green'
ZSH_HIGHLIGHT_STYLES[function]='fg=green'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=red,bold'

# Must be sourced at the end
if [[ -f ~/.zsh/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
  source ~/.zsh/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi

# 6. Background byte-compilation for instant loading
# if [[ ~/.zshrc -nt ~/.zshrc.zwc ]]; then
#   zcompile ~/.zshrc &>/dev/null &
# fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
