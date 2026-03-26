const TOP_LEVEL_COMMANDS = ["device", "link", "config", "runtime", "show", "inspect", "snapshot", "logs", "record", "replay", "completion"];

export async function completionCommand(positional: string[], _options: Record<string, unknown>): Promise<void> {
  const shell = (positional[0] || "bash").toLowerCase();

  if (shell === "bash" || shell === "zsh") {
    console.log(`# Autocompletado para PT Control V2 (${shell})`);
    console.log("_pt() {");
    console.log("  local cur prev");
    console.log("  COMPREPLY=()");
    console.log("  cur=\"${COMP_WORDS[COMP_CWORD]}\"");
    console.log("  prev=\"${COMP_WORDS[COMP_CWORD-1]}\"");
    console.log(`  if [[ $COMP_CWORD -eq 1 ]]; then COMPREPLY=( $(compgen -W \"${TOP_LEVEL_COMMANDS.join(" ")}\" -- \"$cur\") ); return 0; fi`);
    console.log("}");
    console.log("complete -F _pt pt");
    return;
  }

  console.log(JSON.stringify({
    shell,
    commands: TOP_LEVEL_COMMANDS,
  }, null, 2));
}
