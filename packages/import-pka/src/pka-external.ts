/**
 * Integración con pka2xml (herramienta externa)
 * 
 * Usa el binario pka2xml compilado para decodificar/codificar archivos PKA.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { PKADecoder } from './decoder.ts';

// Rutas posibles para el binario
const PKA2XML_PATHS = [
  path.join(process.cwd(), 'archivos_prueba', 'pka2xml-master', 'pka2xml'),
  path.join(process.cwd(), 'pka2xml'),
  '/usr/local/bin/pka2xml'
];

/**
 * Verifica si pka2xml está instalado y es ejecutable
 */
export function isPka2XmlAvailable(): boolean {
  for (const binPath of PKA2XML_PATHS) {
    if (fs.existsSync(binPath)) {
      try {
        fs.accessSync(binPath, fs.constants.X_OK);
        return true;
      } catch (e) {
        // Archivo existe pero no es ejecutable
      }
    }
  }
  return false;
}

/**
 * Obtiene la ruta del binario pka2xml
 */
function getPka2XmlPath(): string {
  for (const binPath of PKA2XML_PATHS) {
    if (fs.existsSync(binPath)) {
      return binPath;
    }
  }
  throw new Error('pka2xml binary no encontrado. Por favor compílalo primero.');
}

export interface Pka2XmlResult {
  success: boolean;
  xml?: string;
  error?: string;
  version?: string;
}

/**
 * Decodifica un archivo PKA/PKT a XML usando pka2xml
 */
export async function decodePKAExternal(filepath: string): Promise<Pka2XmlResult> {
  return new Promise((resolve) => {
    try {
      const binPath = getPka2XmlPath();
      
      // Crear archivo temporal para el XML de salida
      const tempDir = os.tmpdir();
      const tempOutFile = path.join(tempDir, `pka_out_${Date.now()}.xml`);
      
      const child = spawn(binPath, ['-d', filepath, tempOutFile]);
      
      let errorOutput = '';
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempOutFile)) {
          try {
            const xmlContent = fs.readFileSync(tempOutFile, 'utf-8');
            
            // Extraer versión si es posible
            let version = 'unknown';
            const versionMatch = xmlContent.match(/<VERSION>([^<]+)<\/VERSION>/);
            if (versionMatch && versionMatch[1]) {
              version = versionMatch[1];
            }
            
            // Limpiar
            fs.unlinkSync(tempOutFile);
            
            resolve({
              success: true,
              xml: xmlContent,
              version
            });
          } catch (e) {
            resolve({
              success: false,
              error: `Error leyendo archivo temporal: ${e}`
            });
          }
        } else {
          resolve({
            success: false,
            error: `pka2xml falló con código ${code}: ${errorOutput}`
          });
        }
      });
      
      child.on('error', (err) => {
        resolve({
          success: false,
          error: `Error ejecutando pka2xml: ${err.message}`
        });
      });
      
    } catch (err) {
      resolve({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
}

/**
 * Codifica (empaqueta) un string XML de vuelta a un archivo PKA/PKT usando pka2xml
 */
export async function encodePKAExternal(xmlContent: string, outputPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      const binPath = getPka2XmlPath();
      
      // Crear archivo temporal para el XML de entrada
      const tempDir = os.tmpdir();
      const tempInFile = path.join(tempDir, `pka_in_${Date.now()}.xml`);
      
      fs.writeFileSync(tempInFile, xmlContent, 'utf-8');
      
      const child = spawn(binPath, ['-e', tempInFile, outputPath]);
      
      let errorOutput = '';
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        // Limpiar archivo temporal
        if (fs.existsSync(tempInFile)) {
          fs.unlinkSync(tempInFile);
        }

        if (code === 0 && fs.existsSync(outputPath)) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `pka2xml falló con código ${code}: ${errorOutput}`
          });
        }
      });
      
      child.on('error', (err) => {
        if (fs.existsSync(tempInFile)) fs.unlinkSync(tempInFile);
        resolve({
          success: false,
          error: `Error ejecutando pka2xml: ${err.message}`
        });
      });
      
    } catch (err) {
      resolve({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
}

export async function parsePKA(filepath: string) {
  const result = await decodePKAExternal(filepath);
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  const devices = result.xml ? PKADecoder.extractDevices(result.xml) : [];
  
  return {
    success: true,
    version: result.version,
    xml: result.xml,
    devices: devices
  };
}