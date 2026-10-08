/**
 * Global mx object available in Mendix runtime.
 *
 * This is a LOCAL declaration that does NOT conflict with the `mendix` package.
 * The runtime `window.mx` object is declared here so the data-API adapters can access `window.mx.data`.
 */
export {};

declare global {
  interface Window {
    require?: (moduleName: string) => unknown;
    mx?: {
      data?: MxData;
      ui?: MxUi;
      session?: unknown;
      version?: string;
    };
  }
}

export interface MxData {
  get(options: MxGetOptions): void;
  create(options: MxCreateOptions): void;
  remove(options: MxRemoveOptions): void;
  commit(options: MxCommitOptions): void;
  action(options: MxActionOptions): void;
  rollback(options: MxRollbackOptions): void;
}

export interface MxObject {
  get(attribute: string): unknown;
  set(attribute: string, value: unknown): void;
  getAttributes(): string[];
  getGuid?(): string;
  getGUID?(): string;
}

export interface MxUi {
  action(actionName: string, options: MxActionOptions): void;
}

export interface MxGetOptions {
  guid?: string;
  guids?: string[];
  xpath?: string;
  filter?: {
    attributes?: string[];
    sort?: Array<[string, "asc" | "desc"]>;
    offset?: number;
    amount?: number;
    depth?: number;
  };
  callback: (result: unknown) => void;
  error?: (error: Error) => void;
}

export interface MxCreateOptions {
  entity: string;
  callback: (obj: unknown) => void;
  error?: (error: Error) => void;
}

export interface MxRemoveOptions {
  guid?: string;
  guids?: string[];
  callback?: () => void;
  error?: (error: Error) => void;
}

export interface MxCommitOptions {
  mxobj?: unknown;
  mxobjs?: unknown[];
  guid?: string;
  guids?: string[];
  callback?: () => void;
  error?: (error: Error) => void;
  onValidation?: (validations: unknown[]) => void;
}

export interface MxActionOptions {
  params?: Record<string, unknown>;
  origin?: unknown;
  callback?: (result: unknown) => void;
  error?: (error: Error) => void;
}

export interface MxRollbackOptions {
  mxobj?: unknown;
  mxobjs?: unknown[];
  callback?: () => void;
  error?: (error: Error) => void;
}
