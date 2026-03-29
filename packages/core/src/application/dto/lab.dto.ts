/**
 * DTOs para Lab
 * Objetos de transferencia de datos para el laboratorio
 */
import type { DifficultyLevel } from '../../domain/entities/lab.entity.ts';

export interface CreateLabDto {
  name: string;
  description?: string;
  author?: string;
  difficulty: DifficultyLevel;
  estimatedTime?: string;
  tags?: string[];
}

export interface LabMetadataDto {
  name: string;
  description?: string;
  version: string;
  author?: string;
  difficulty: DifficultyLevel;
  estimatedTime?: string;
  tags?: string[];
}

export interface LabResponseDto {
  id: string;
  metadata: LabMetadataDto;
  deviceCount: number;
  connectionCount: number;
  modified: boolean;
  originalFile?: string;
}

export interface LabStatsDto {
  deviceCount: number;
  connectionCount: number;
  devicesByType: Record<string, number>;
  validationStatus: {
    valid: boolean;
    errorCount: number;
    warningCount: number;
  };
}

export interface LoadLabDto {
  filePath: string;
}

export interface SaveLabDto {
  filePath?: string;
  format?: 'yaml' | 'pka';
}
