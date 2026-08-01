import { z } from "zod";
import type { AttributeField } from "./types";

/**
 * Generic machinery for per-trade product fields. Each pack declares its own
 * fields; this turns those declarations into a validator.
 *
 * Values live in `Product.attributes` (JSONB), so a trade can gain a field
 * without a schema migration.
 */

/** Checkboxes arrive as "on" from form posts, and as true over JSON. */
function coerceBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function fieldSchema(field: AttributeField): z.ZodTypeAny {
  switch (field.type) {
    case "text": {
      let schema = z.string().trim();
      if (field.maxLength) {
        schema = schema.max(field.maxLength, `${field.label} is too long`);
      }
      if (field.pattern) {
        schema = schema.regex(
          field.pattern,
          field.patternMessage ?? `${field.label} is not in the expected format`
        );
      }
      return schema;
    }
    case "number": {
      let schema = z.coerce.number({
        invalid_type_error: `${field.label} must be a number`,
      });
      if (field.min !== undefined) {
        schema = schema.min(field.min, `${field.label} cannot be below ${field.min}`);
      }
      if (field.max !== undefined) {
        schema = schema.max(field.max, `${field.label} cannot be above ${field.max}`);
      }
      return schema;
    }
    case "boolean":
      return z.preprocess(coerceBoolean, z.boolean());
    case "select": {
      const values = field.options.map((option) => option.value);
      return z.enum(values as [string, ...string[]], {
        errorMap: () => ({ message: `Choose a valid ${field.label.toLowerCase()}` }),
      });
    }
  }
}

/**
 * Builds a validator for one trade's fields. Unknown keys are dropped rather
 * than stored, so a crafted payload can't smuggle data into the JSON column.
 */
export function buildAttributeSchema(fields: readonly AttributeField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    const schema = fieldSchema(field);
    shape[field.name] = field.required ? schema : schema.optional();
  }

  return z.object(shape).strip();
}

/** Treats blanks as "not provided" so optional fields don't fail on empty input. */
function dropBlanks(
  raw: Record<string, unknown>,
  fields: readonly AttributeField[]
): Record<string, unknown> {
  const required = new Set(
    fields.filter((field) => field.required).map((field) => field.name)
  );
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const isBlank = value === "" || value === null || value === undefined;
    if (isBlank && !required.has(key)) continue;
    cleaned[key] = value;
  }

  return cleaned;
}

/** Attribute inputs are namespaced so they can't collide with core product fields. */
export const ATTRIBUTE_FIELD_PREFIX = "attr_";

export function attributeInputName(field: AttributeField | string): string {
  return `${ATTRIBUTE_FIELD_PREFIX}${typeof field === "string" ? field : field.name}`;
}

/**
 * Pulls this trade's attribute values out of a submission. Only declared
 * fields are read, so anything else in the payload is ignored outright.
 */
export function collectAttributeInput(
  fields: readonly AttributeField[],
  read: (inputName: string) => unknown
): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (const field of fields) {
    const value = read(attributeInputName(field));

    if (field.type === "boolean") {
      // An unchecked box sends nothing at all, which means false — not "absent".
      raw[field.name] = value ?? false;
      continue;
    }

    if (value === null || value === undefined) continue;
    raw[field.name] = value;
  }

  return raw;
}

/** Every field type resolves to one of these, which keeps the value JSON-safe. */
export type AttributeValue = string | number | boolean;

export type AttributeParseResult =
  | { success: true; data: Record<string, AttributeValue> }
  | { success: false; errors: Record<string, string> };

/**
 * Validates raw attribute input against a trade's fields. Returns field-keyed
 * messages on failure so a form can show them inline.
 */
export function parseAttributes(
  fields: readonly AttributeField[],
  raw: unknown
): AttributeParseResult {
  if (fields.length === 0) return { success: true, data: {} };

  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const parsed = buildAttributeSchema(fields).safeParse(dropBlanks(source, fields));

  if (parsed.success) {
    return { success: true, data: parsed.data as Record<string, AttributeValue> };
  }

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }

  return { success: false, errors };
}
