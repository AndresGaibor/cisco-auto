export enum IosPromptState {
  NORMAL = "normal",
  SETUP_DIALOG = "setup_dialog",
  PRESS_RETURN = "press_return",
  PASSWORD = "password",
  CONFIRM = "confirm",
  AWAITING_INPUT = "awaiting_input",
}

const PATTERN_SETUP_DIALOG = /Would you like to enter the initial configuration dialog\?/i;
const PATTERN_SETUP_DIALOG_ALT = /initial configuration dialog/i;
const PATTERN_PRESS_RETURN = /Press RETURN to get started/i;
const PATTERN_NORMAL_PROMPT = /^[^#\)]+[#\>]/;
const PATTERN_CONFIG_PROMPT = /^[^#\)]+\(config[^\)]*\)#\s*$/;

export class PromptClassifier {
  classify(output: string): IosPromptState[] {
    const estados: IosPromptState[] = [];

    if (this.isSetupDialog(output)) {
      estados.push(IosPromptState.SETUP_DIALOG);
    }
    if (this.isPressReturn(output)) {
      estados.push(IosPromptState.PRESS_RETURN);
    }
    if (this.isNormalPrompt(output)) {
      estados.push(IosPromptState.NORMAL);
    }

    return estados;
  }

  isSetupDialog(output: string): boolean {
    return PATTERN_SETUP_DIALOG.test(output) || PATTERN_SETUP_DIALOG_ALT.test(output);
  }

  isPressReturn(output: string): boolean {
    return PATTERN_PRESS_RETURN.test(output);
  }

  isNormalPrompt(output: string): boolean {
    return PATTERN_NORMAL_PROMPT.test(output) || PATTERN_CONFIG_PROMPT.test(output);
  }
}
