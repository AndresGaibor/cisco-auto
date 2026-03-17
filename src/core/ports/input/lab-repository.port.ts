/**
 * Input Port: LabRepository
 * Puerto de entrada para persistencia de laboratorios
 */
import { Lab } from '../../domain/entities/lab.entity.ts';

export interface LabRepository {
  /**
   * Carga un laboratorio desde un archivo
   */
  load(filePath: string): Promise<Lab>;

  /**
   * Guarda un laboratorio en un archivo
   */
  save(lab: Lab, filePath: string): Promise<void>;

  /**
   * Verifica si un archivo existe
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Obtiene la extensión del archivo soportada
   */
  getSupportedExtension(): string;
}

/**
 * Factory para obtener el repositorio apropiado según la extensión
 */
export interface LabRepositoryFactory {
  getRepository(filePath: string): LabRepository;
}
