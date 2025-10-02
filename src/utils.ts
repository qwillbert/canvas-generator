import type { SwaggerPrimitiveType } from "./types";

export function mapPropertyType(property: {
  description: string;
  example: string;
  type: string;
  allowableValues?:
    | {
        values: string[];
      }
    | undefined;
  $ref?: string | undefined;
  items?:
    | {
        $ref?: string | undefined;
        type?: SwaggerPrimitiveType | string | undefined;
        items?: any;
      }
    | undefined;
}): string {
  const typeMaps: Record<string, string> = {
    integer: "number",
    datetime: "string",
    DateTime: "string",
    uuid: "string",
    array: "any",
  };

  function findArrayType(items: any): string {
    if (!items) return "any";
    if (items.type === "array") {
      return findArrayType(items.items) + "[]";
    }
    if (items.$ref) {
      return items.$ref.replaceAll("::", "");
    }
    if (items.type) {
      const mapped = typeMaps[items.type] ?? items.type;
      return mapped;
    }
    return "any[]";
  }

  if (property.type === "array") {
    return findArrayType(property.items) + "[]";
  }

  if (property.type === "string" && property.allowableValues) {
    return `"` + property.allowableValues.values.join(`" | "`) + `"`;
  }

  if (property.type in typeMaps) {
    return typeMaps[property.type]!;
  }

  return property.type ?? "any";
}
