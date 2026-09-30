/**
 * Named input types for the docs surfaces (MCP read_docs, the CLI's docs
 * command): a type's reference by name, and an argument path such as
 * "filter.team.key" resolved to its type. Each type is described once with
 * its fields typed by name, so a lookup is bounded and every type it
 * mentions can be looked up the same way.
 */

export interface InputTypeField {
  /** As an agent writes it: a type name, string[], "a"|"b", object. */
  type: string;
  required?: true;
  description?: string;
  default?: unknown;
  deprecated?: true;
}

export interface InputTypeDoc {
  description?: string;
  /** An input object's fields. */
  fields?: Record<string, InputTypeField>;
  /** An enum's values. */
  values?: unknown[];
  /** A union's member types. */
  variants?: string[];
}

export interface InputTypes {
  types: Record<string, InputTypeDoc>;
  /** Per tool, each argument whose type is (or contains) a named type. */
  args: Record<string, Record<string, string>>;
}

/** Enum values a type page lists before a count. */
const TYPE_ENUM_VALUES = 200;

/** One line of prose: links reduced to their text. */
function prose(text: string | undefined): string {
  return (text ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
}

/** The table's type names an expression mentions, in order. */
export function namedTypesIn(table: InputTypes | undefined, expression: string | undefined): string[] {
  if (!table || !expression) return [];
  return [...new Set(expression.split(/[|()[\]\s]+/).filter((part) => Object.hasOwn(table.types, part)))];
}

/** The one input object an expression names (IssueFilter, IssueFilter[]),
 * whose fields a path continues into. */
function objectTypeOf(table: InputTypes, expression: string | undefined): string | undefined {
  const objects = namedTypesIn(table, expression).filter((name) => table.types[name]!.fields);
  return objects.length === 1 ? objects[0] : undefined;
}

/** A type by exact name, else by a case-insensitive match. */
export function findInputType(table: InputTypes | undefined, name: string): string | undefined {
  if (!table) return undefined;
  if (Object.hasOwn(table.types, name)) return name;
  const lower = name.toLowerCase();
  return Object.keys(table.types).find((candidate) => candidate.toLowerCase() === lower);
}

function fieldLine(name: string, field: InputTypeField): string {
  const extras = [
    ...(field.required ? ["required"] : []),
    ...(field.default !== undefined ? ["default " + JSON.stringify(field.default)] : []),
    ...(field.deprecated ? ["deprecated"] : []),
  ];
  const description = prose(field.description);
  return "  " + name + " (" + field.type + (extras.length ? ", " + extras.join(", ") : "") + ")" + (description ? ": " + description : "");
}

/** How to read another type, in the caller's own syntax. */
export type TypeLookupHint = (name: string) => string;

/** A named type's reference: description, then its fields, values or
 * members, then how to read the named types it mentions. */
export function inputTypeText(table: InputTypes, name: string, lookup: TypeLookupHint): string {
  const doc = table.types[name]!;
  const kind = doc.fields ? "input object" : doc.values ? "enum" : "union";
  const lines = [name + " (" + kind + ")"];
  if (doc.description) lines.push(prose(doc.description));
  const mentioned: string[] = [];
  if (doc.fields) {
    const entries = Object.entries(doc.fields);
    lines.push("", entries.length === 0 ? "No fields." : "Fields (" + entries.length + "):");
    for (const [field, spec] of entries) {
      lines.push(fieldLine(field, spec));
      mentioned.push(...namedTypesIn(table, spec.type));
    }
  } else if (doc.values) {
    const values = doc.values.slice(0, TYPE_ENUM_VALUES).map((value) => JSON.stringify(value));
    lines.push("", "Values: " + values.join(", ") + (doc.values.length > TYPE_ENUM_VALUES ? ", … " + (doc.values.length - TYPE_ENUM_VALUES) + " more" : ""));
  } else if (doc.variants) {
    lines.push("", "One of: " + doc.variants.join(" | "));
    for (const variant of doc.variants) mentioned.push(...namedTypesIn(table, variant));
  }
  const others = [...new Set(mentioned)].filter((other) => other !== name);
  if (others.length > 0) {
    lines.push("", "Types used above (" + others.length + "): " + others.join(", ") + ". Read one with " + lookup("<type>") + ".");
  }
  return lines.join("\n");
}

/** A field of an anonymous object in an inline JSON Schema, one level. */
interface InlineSchema { type?: unknown; properties?: Record<string, InlineSchema>; required?: string[]; items?: InlineSchema; anyOf?: InlineSchema[]; oneOf?: InlineSchema[]; enum?: unknown[]; description?: string }

function inlineObject(schema: InlineSchema | undefined): InlineSchema | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  if (schema.properties && typeof schema.properties === "object") return schema;
  if (schema.items) return inlineObject(schema.items);
  const variants = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(variants)) {
    const objects = variants.map(inlineObject).filter((variant) => variant !== undefined);
    if (objects.length === 1) return objects[0];
  }
  return undefined;
}

function inlineType(schema: InlineSchema): string {
  if (Array.isArray(schema.enum)) return schema.enum.filter((value) => value !== null).map((value) => JSON.stringify(value)).join("|");
  const variants = schema.anyOf ?? schema.oneOf;
  if (Array.isArray(variants)) return [...new Set(variants.map(inlineType))].filter((t) => t !== "null").join("|") || "null";
  const types = (Array.isArray(schema.type) ? schema.type : typeof schema.type === "string" ? [schema.type] : []).filter((t) => t !== "null") as string[];
  if (types.includes("array")) {
    const inner = schema.items ? inlineType(schema.items) : "any";
    return (/[| ]/.test(inner) ? "(" + inner + ")" : inner) + "[]";
  }
  return types.join("|") || (schema.properties ? "object" : "any");
}

export type PathLookup =
  | { ok: true; text: string }
  | { ok: false; message: string; available: string[] };

/**
 * What one argument path means: the field's type, whether it is required,
 * its description, and, when its type is named, that type's reference in
 * full (a comparator's operators, an enum's values). `root` is an
 * operation (its tool name, inline input schema, and how the caller names
 * it) or a named type.
 */
export function argumentPathText(
  table: InputTypes | undefined,
  root: { tool: string; inputSchema: Record<string, unknown>; label?: string } | { type: string },
  path: string,
  lookup: TypeLookupHint,
): PathLookup {
  const segments = path.split(".").map((segment) => segment.trim()).filter((segment) => segment.length > 0);
  if (segments.length === 0) return { ok: false, message: "The path is empty.", available: [] };
  // Walk the named-type table where the path has a type name, else the
  // operation's inline schema.
  let typeName: string | undefined = "type" in root ? root.type : undefined;
  let inline: InlineSchema | undefined = "type" in root ? undefined : root.inputSchema as InlineSchema;
  let expression: string | undefined;
  let field: InputTypeField | undefined;
  const label = "type" in root ? root.type : root.label ?? root.tool;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const at = index === 0 ? label : label + " " + segments.slice(0, index).join(".");
    if (typeName && table) {
      const fields = table.types[typeName]!.fields ?? {};
      if (!Object.hasOwn(fields, segment)) return { ok: false, message: at + " (" + typeName + ") has no field \"" + segment + "\".", available: Object.keys(fields) };
      field = fields[segment]!;
      expression = field.type;
      inline = undefined;
    } else {
      const object = inlineObject(inline);
      const properties = object?.properties ?? {};
      if (!object || !Object.hasOwn(properties, segment)) {
        return { ok: false, message: object ? at + " has no field \"" + segment + "\"." : at + " is not an object; the path cannot continue past it.", available: Object.keys(properties) };
      }
      const child = properties[segment]!;
      const topLevel = index === 0 && !("type" in root) ? table?.args[root.tool]?.[segment] : undefined;
      expression = topLevel ?? inlineType(child);
      field = {
        type: expression,
        ...(Array.isArray(object.required) && object.required.includes(segment) ? { required: true as const } : {}),
        ...(typeof child.description === "string" ? { description: child.description } : {}),
      };
      inline = child;
    }
    typeName = table ? objectTypeOf(table, expression) : undefined;
    if (!typeName && index < segments.length - 1 && !inlineObject(inline)) {
      return { ok: false, message: label + " " + segments.slice(0, index + 1).join(".") + " is " + expression + ", not an object; the path cannot continue past it.", available: [] };
    }
  }
  const lines = [label + " " + segments.join(".") + ": " + field!.type + (field!.required ? " (required)" : "")];
  const description = prose(field!.description);
  if (description) lines.push(description);
  const named = namedTypesIn(table, expression);
  if (named.length > 0 && table) {
    for (const name of named) lines.push("", inputTypeText(table, name, lookup));
  } else {
    const object = inlineObject(inline);
    if (object) {
      const required = new Set(object.required ?? []);
      lines.push("", "Fields:");
      for (const [name, child] of Object.entries(object.properties ?? {})) {
        lines.push(fieldLine(name, { type: inlineType(child), ...(required.has(name) ? { required: true } : {}), ...(child.description ? { description: child.description } : {}) }));
      }
    }
  }
  return { ok: true, text: lines.join("\n") };
}
