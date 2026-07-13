import { Injectable, NotFoundException } from '@nestjs/common';
import type { HyperSchemaLink, JsonHyperSchema } from '../index.js';

type AnyRecord = Record<string, unknown>;

type FormRuntimeSession = {
  schema: JsonHyperSchema;
  formData: AnyRecord;
  dependentKey: string;
  updatedAt: number;
};

const SESSION_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class FormsSessionService {
  private readonly sessions = new Map<string, FormRuntimeSession>();

  createOrUpdate(
    sessionId: string,
    dataSource: HyperSchemaLink[],
    schema: JsonHyperSchema,
    formData: AnyRecord
  ) {
    this.cleanup();
    this.sessions.set(sessionId, {
      schema,
      formData,
      dependentKey: this.buildDependentKey(dataSource, formData),
      updatedAt: Date.now(),
    });
  }

  getSchema(sessionId: string): JsonHyperSchema {
    const session = this.get(sessionId);
    return session.schema;
  }

  getFormData(sessionId: string): AnyRecord {
    const session = this.get(sessionId);
    return { ...session.formData };
  }

  shouldRunDependent(
    sessionId: string,
    dataSource: HyperSchemaLink[],
    nextFormData: AnyRecord
  ): boolean {
    const session = this.get(sessionId);
    const nextKey = this.buildDependentKey(dataSource, nextFormData);
    if (session.dependentKey === nextKey) {
      session.formData = nextFormData;
      session.updatedAt = Date.now();
      return false;
    }
    session.dependentKey = nextKey;
    session.formData = nextFormData;
    session.updatedAt = Date.now();
    return true;
  }

  private get(sessionId: string): FormRuntimeSession {
    this.cleanup();
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`No existe la sesión de formulario "${sessionId}"`);
    }
    return session;
  }

  private buildDependentKey(dataSource: HyperSchemaLink[], formData: AnyRecord): string {
    const fields = this.getDependentTemplatePointerFields(dataSource);
    const picked = fields.length
      ? fields.map((field) => [field, formData?.[field]])
      : Object.keys(formData || {})
          .sort()
          .map((field) => [field, formData?.[field]]);
    return JSON.stringify(picked);
  }

  private getDependentTemplatePointerFields(dataSource: HyperSchemaLink[] = []): string[] {
    const fields = new Set<string>();
    for (const link of dataSource) {
      if (link.dataRole !== 'dependent') continue;
      this.getTemplatePointerFields(link).forEach((field) => fields.add(field));
    }
    return Array.from(fields).sort();
  }

  private getTemplatePointerFields(link: HyperSchemaLink): string[] {
    const pointers = link.request?.templatePointers;
    if (!pointers || typeof pointers !== 'object') return [];
    return Object.keys(pointers.properties || {});
  }

  private cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
      }
    }
  }

  createSessionId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
