import { getObjectGuid, isMxObject } from "./mendixRuntime";
import type { MxObject } from "../../core/types/mx";

const getAssociationGuid = (obj: unknown, associationNames: readonly string[]): string | undefined => {
  if (!isMxObject(obj)) {
    return undefined;
  }

  for (const associationName of associationNames) {
    try {
      const guid = getObjectGuid(obj.get(associationName));
      if (guid) {
        return guid;
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

// Reference attributes are not part of getAttributes(); read them via mxObject.get().
// Handles single-reference GUIDs as well as reference sets (GUID arrays).
export const getReferenceGuids = (obj: unknown, associationNames: readonly string[]): string[] => {
  if (!isMxObject(obj)) {
    return [];
  }

  for (const name of associationNames) {
    const guids = readGuidsFromAssociation(obj, name);
    if (guids.length > 0) {
      return [...new Set(guids)];
    }
  }
  return [];
};

function readGuidsFromAssociation(obj: MxObject, name: string): string[] {
  try {
    const value = obj.get(name);
    if (Array.isArray(value)) {
      return value.map((g) => getObjectGuid(g)).filter((g): g is string => !!g);
    }
    if (value !== null && value !== undefined && value !== "") {
      const guid = getObjectGuid(value);
      return guid ? [guid] : [];
    }
  } catch {
    // Try next candidate
  }
  return [];
}

export const filterByAssociationGuid = (
  objects: unknown[],
  associationNames: readonly string[],
  expectedGuid: string
): unknown[] => objects.filter((obj) => getAssociationGuid(obj, associationNames) === expectedGuid);
