import { exec } from 'child_process';
import { detectOS, isPacketTracerRunning } from './os-detection';

export { detectPacketTracer, isPacketTracerRunning } from './os-detection';

export interface LaunchOptions {
  rutaPT: string;
  timeoutMs?: number;
}

export interface LaunchResult {
  success: boolean;
  error?: string;
}

export async function launchPacketTracer(rutaPT: string): Promise<boolean> {
  const os = detectOS();

  if (os === 'macos') {
    return launchMacOS(rutaPT);
  } else if (os === 'windows') {
    return launchWindows(rutaPT);
  } else {
    return launchLinux(rutaPT);
  }
}

function launchMacOS(rutaPT: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`open "${rutaPT}"`, (error) => {
      resolve(!error);
    });
  });
}

function launchWindows(rutaPT: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`start "" "${rutaPT}"`, (error) => {
      resolve(!error);
    });
  });
}

function launchLinux(rutaPT: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(`"${rutaPT}" &`, (error) => {
      resolve(!error);
    });
  });
}

export async function waitForPacketTracerReady(timeoutMs = 10000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const running = await isPacketTracerRunning();
    if (running) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}
