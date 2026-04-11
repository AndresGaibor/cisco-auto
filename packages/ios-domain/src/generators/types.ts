export interface GeneratedCommand {
  text: string;
  mode: string;
  rollback: string[];
}

export type CommandGenerator = (config: unknown) => GeneratedCommand[];
