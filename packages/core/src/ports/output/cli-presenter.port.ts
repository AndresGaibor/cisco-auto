/**
 * Output Port: CliPresenter
 * Puerto de salida para presentación en CLI
 */

export interface MenuOption {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PromptConfig {
  type: 'input' | 'confirm' | 'list' | 'checkbox' | 'number';
  name: string;
  message: string;
  default?: unknown;
  choices?: MenuOption[];
  validate?: (value: unknown) => boolean | string;
  when?: (answers: Record<string, unknown>) => boolean;
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
}

export interface CliPresenter {
  /**
   * Muestra un mensaje informativo
   */
  info(message: string): void;

  /**
   * Muestra un mensaje de éxito
   */
  success(message: string): void;

  /**
   * Muestra un mensaje de advertencia
   */
  warning(message: string): void;

  /**
   * Muestra un mensaje de error
   */
  error(message: string): void;

  /**
   * Muestra una tabla de datos
   */
  table(data: Record<string, unknown>[], columns: TableColumn[]): void;

  /**
   * Muestra una lista de elementos
   */
  list(items: string[], title?: string): void;

  /**
   * Muestra un mensaje de progreso
   */
  spinner(message: string): {
    succeed: (text?: string) => void;
    fail: (text?: string) => void;
  };

  /**
   * Limpia la pantalla
   */
  clear(): void;

  /**
   * Muestra un separador visual
   */
  separator(title?: string): void;
}

/**
 * Puerto para menús interactivos
 */
export interface InteractiveMenu {
  /**
   * Muestra un menú de selección
   */
  showMenu(options: MenuOption[], title?: string): Promise<string>;

  /**
   * Muestra un prompt para entrada de texto
   */
  prompt(config: PromptConfig): Promise<Record<string, unknown>>;

  /**
   * Muestra múltiples prompts en secuencia
   */
  promptMany(configs: PromptConfig[]): Promise<Record<string, unknown>>;

  /**
   * Muestra un mensaje de confirmación
   */
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;
}
