import { getMx, createMockMxObject } from "./mendixRuntime";

export const loadMendixObject = async <T = unknown>(guid: string): Promise<T | null> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      if (!guid) {
        resolve(null);
        return;
      }
      mxData.get({
        guid,
        callback: (obj: unknown) => resolve(obj as T),
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: use mock factory
  return createMockMxObject("TransportOrder", { id: guid }) as T;
};

export const loadMendixObjects = async <T = unknown>(guids: string[]): Promise<T[]> => {
  if (!guids || guids.length === 0) {
    return [];
  }
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.get({
        guids,
        callback: (objs: unknown) => {
          const list = Array.isArray(objs) ? objs : objs ? [objs] : [];
          resolve(list as T[]);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: use mock factory
  return guids.map((g) => createMockMxObject("TransportOrder", { id: g }) as T);
};

export const loadMendixList = async <T = unknown>(xpath: string): Promise<T[]> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.get({
        xpath,
        callback: (items: unknown) => {
          const list = Array.isArray(items) ? items : items ? [items] : [];
          resolve(list as T[]);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
  // Dev fallback: assume xpath is actually a JSON string
  try {
    const parsed = JSON.parse(xpath);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

export const executeMendixAction = async (actionId: string, params: Record<string, unknown> = {}): Promise<unknown> => {
  const mxData = getMx();
  if (mxData) {
    return new Promise((resolve, reject) => {
      mxData.action({
        params: { actionId, ...params },
        callback: (result: unknown) => resolve(result),
        error: (err: Error) => reject(err),
      });
    });
  }
  return null;
};
