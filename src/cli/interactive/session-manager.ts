/**
 * Session Manager
 * Gestiona el estado de la sesión interactiva
 */
import { LabSessionService } from '../../core/application/services/lab-session.service.ts';
import { Lab } from '../../core/domain/entities/lab.entity.ts';
import { YamlLabRepository } from '../../core/infrastructure/adapters/persistence/yaml-lab.repository.ts';

export interface InteractiveSession {
  sessionService: LabSessionService;
  currentFile: string | null;
  lastSavedAt: Date | null;
  commandHistory: string[];
}

export class SessionManager {
  private session: InteractiveSession;
  private yamlRepository: YamlLabRepository;

  constructor() {
    this.yamlRepository = new YamlLabRepository();
    this.session = {
      sessionService: new LabSessionService(),
      currentFile: null,
      lastSavedAt: null,
      commandHistory: []
    };
  }

  /**
   * Obtiene la sesión actual
   */
  getSession(): InteractiveSession {
    return this.session;
  }

  /**
   * Obtiene el servicio de sesión
   */
  getSessionService(): LabSessionService {
    return this.session.sessionService;
  }

  /**
   * Carga un archivo YAML
   */
  async loadFile(filePath: string): Promise<void> {
    const lab = await this.yamlRepository.load(filePath);
    this.session.sessionService.loadLab(lab, filePath);
    this.session.currentFile = filePath;
  }

  /**
   * Guarda el archivo actual
   */
  async saveFile(filePath?: string): Promise<void> {
    const lab = this.session.sessionService.getLab();
    if (!lab) {
      throw new Error('No hay laboratorio cargado');
    }

    const targetPath = filePath || this.session.currentFile;
    if (!targetPath) {
      throw new Error('No se especificó ruta de guardado');
    }

    await this.yamlRepository.save(lab, targetPath);
    this.session.currentFile = targetPath;
    this.session.lastSavedAt = new Date();
  }

  /**
   * Crea un nuevo laboratorio
   */
  createLab(name: string, difficulty: 'beginner' | 'intermediate' | 'advanced'): void {
    this.session.sessionService.createLab({
      name,
      difficulty
    });
    this.session.currentFile = null;
  }

  /**
   * Verifica si hay cambios sin guardar
   */
  hasUnsavedChanges(): boolean {
    const lab = this.session.sessionService.getLab();
    return lab ? lab.isModified() : false;
  }

  /**
   * Agrega un comando al historial
   */
  addToHistory(command: string): void {
    this.session.commandHistory.push(command);
    if (this.session.commandHistory.length > 50) {
      this.session.commandHistory.shift();
    }
  }

  /**
   * Obtiene el historial de comandos
   */
  getCommandHistory(): string[] {
    return [...this.session.commandHistory];
  }

  /**
   * Limpia la sesión
   */
  clear(): void {
    this.session.sessionService.forceClose();
    this.session.currentFile = null;
    this.session.lastSavedAt = null;
    this.session.commandHistory = [];
  }
}
