import { HttpException } from '@nestjs/common';
import { LinkExecutionError, type ResolveWarning } from '../../index.js';

type AnyRecord = Record<string, any>;

/** true si algún warning del motor marca error:true → ok=false. */
export const hasErrorWarning = (warnings: ResolveWarning[] = []) =>
  warnings.some((warning) => warning?.error === true);

/** Normaliza excepciones al shape ResolveWarning del motor. */
export const toResolveWarning = (error: unknown): ResolveWarning => {
  if (error instanceof LinkExecutionError) {
    return { status: error.status, error: true, message: error.message };
  }
  if (error instanceof HttpException) {
    const status = error.getStatus();
    const response = error.getResponse();
    if (response && typeof response === 'object' && 'message' in response) {
      return {
        status,
        error: true,
        message: String((response as AnyRecord).message),
      };
    }
    return { status, error: true, message: error.message };
  }
  return { status: 500, error: true, message: 'fallo general del sistema' };
};

export const asWarnings = (error: unknown): ResolveWarning[] => [toResolveWarning(error)];
