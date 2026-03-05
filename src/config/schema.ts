import { OpenClawConfigSchema } from './zod-schema.js';
import type { OpenClawConfig } from './zod-schema.js';
import { VERSION } from '../version.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Schema 扩展元数据
export type SchemaExtensionMetadata = {
  id: string;
  name?: string;
  description?: string;
  configSchema?: Record<string, unknown>;
  configUiHints?: Record<string, ConfigUiHint>;
};

// 配置 UI 提示
export type ConfigUiHint = {
  label?: string;
  help?: string;
  tags?: string[];
  advanced?: boolean;
  sensitive?: boolean;
  placeholder?: string;
};

// 配置 UI 提示集合
export type ConfigUiHints = Record<string, ConfigUiHint>;

// Schema 响应类型
export type SchemaResponse = {
  schema: Record<string, unknown>;
  uiHints: ConfigUiHints;
  version: string;
  generatedAt: string;
};

// JSON Schema 节点类型
type JsonSchemaNode = Record<string, unknown>;

type JsonSchemaObject = JsonSchemaNode & {
  type?: string | string[];
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  additionalProperties?: JsonSchemaObject | boolean;
};

/**
 * 克隆 Schema
 */
function cloneSchema<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 转换为 Schema 对象
 */
function asSchemaObject(value: unknown): JsonSchemaObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as JsonSchemaObject;
}

/**
 * 检查是否为对象 Schema
 */
function isObjectSchema(schema: JsonSchemaObject): boolean {
  const type = schema.type;
  if (type === 'object') {
    return true;
  }
  if (Array.isArray(type) && type.includes('object')) {
    return true;
  }
  return Boolean(schema.properties || schema.additionalProperties);
}

/**
 * 合并对象 Schema
 */
function mergeObjectSchema(base: JsonSchemaObject, extension: JsonSchemaObject): JsonSchemaObject {
  const mergedRequired = new Set<string>([...(base.required ?? []), ...(extension.required ?? [])]);
  const merged: JsonSchemaObject = {
    ...base,
    ...extension,
    properties: {
      ...base.properties,
      ...extension.properties,
    },
  };
  if (mergedRequired.size > 0) {
    merged.required = Array.from(mergedRequired);
  }
  const additional = extension.additionalProperties ?? base.additionalProperties;
  if (additional !== undefined) {
    merged.additionalProperties = additional;
  }
  return merged;
}

/**
 * 收集扩展提示键
 */
function collectExtensionHintKeys(
  hints: ConfigUiHints,
  extensions: SchemaExtensionMetadata[],
): Set<string> {
  const prefixes = extensions
    .map((ext) => ext.id.trim())
    .filter(Boolean)
    .map((id) => `plugins.entries.${id}`);

  return new Set(
    Object.keys(hints).filter((key) =>
      prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`)),
    ),
  );
}

/**
 * 应用插件提示
 */
function applyExtensionHints(hints: ConfigUiHints, extensions: SchemaExtensionMetadata[]): ConfigUiHints {
  const next: ConfigUiHints = { ...hints };
  for (const extension of extensions) {
    const id = extension.id.trim();
    if (!id) {
      continue;
    }
    const name = (extension.name ?? id).trim() || id;
    const basePath = `plugins.entries.${id}`;

    next[basePath] = {
      ...next[basePath],
      label: name,
      help: extension.description
        ? `${extension.description} (plugin: ${id})`
        : `Plugin entry for ${id}.`,
    };
    next[`${basePath}.enabled`] = {
      ...next[`${basePath}.enabled`],
      label: `Enable ${name}`,
    };
    next[`${basePath}.config`] = {
      ...next[`${basePath}.config`],
      label: `${name} Config`,
      help: `Plugin-defined config payload for ${id}.`,
    };

    const uiHints = extension.configUiHints ?? {};
    for (const [relPathRaw, hint] of Object.entries(uiHints)) {
      const relPath = relPathRaw.trim().replace(/^\./, '');
      if (!relPath) {
        continue;
      }
      const key = `${basePath}.config.${relPath}`;
      next[key] = {
        ...next[key],
        ...hint,
      };
    }
  }
  return next;
}

/**
 * 应用插件 Schema
 */
function applyExtensionSchemas(schema: JsonSchemaObject, extensions: SchemaExtensionMetadata[]): JsonSchemaObject {
  const next = cloneSchema(schema);
  const root = asSchemaObject(next);
  const pluginsNode = asSchemaObject(root?.properties?.plugins);
  const entriesNode = asSchemaObject(pluginsNode?.properties?.entries);
  if (!entriesNode) {
    return next;
  }

  const entryBase = asSchemaObject(entriesNode.additionalProperties);
  const entryProperties = entriesNode.properties ?? {};
  entriesNode.properties = entryProperties;

  for (const extension of extensions) {
    if (!extension.configSchema) {
      continue;
    }
    const entrySchema = entryBase
      ? cloneSchema(entryBase)
      : ({ type: 'object' } as JsonSchemaObject);
    const entryObject = asSchemaObject(entrySchema) ?? ({ type: 'object' } as JsonSchemaObject);
    const baseConfigSchema = asSchemaObject(entryObject.properties?.config);
    const extensionSchema = asSchemaObject(extension.configSchema);
    const nextConfigSchema =
      baseConfigSchema &&
      extensionSchema &&
      isObjectSchema(baseConfigSchema) &&
      isObjectSchema(extensionSchema)
        ? mergeObjectSchema(baseConfigSchema, extensionSchema)
        : cloneSchema(extension.configSchema);

    entryObject.properties = {
      ...entryObject.properties,
      config: nextConfigSchema,
    };
    entryProperties[extension.id] = entryObject;
  }

  return next;
}

// 缓存
let cachedBase: SchemaResponse | null = null;
const mergedSchemaCache = new Map<string, SchemaResponse>();
const MERGED_SCHEMA_CACHE_MAX = 64;

/**
 * 构建合并 Schema 缓存键
 */
function buildMergedSchemaCacheKey(extensions: SchemaExtensionMetadata[]): string {
  const sortedExtensions = extensions
    .map((ext) => ({
      id: ext.id,
      name: ext.name,
      description: ext.description,
      configSchema: ext.configSchema ?? null,
      configUiHints: ext.configUiHints ?? null,
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ extensions: sortedExtensions });
}

/**
 * 设置合并 Schema 缓存
 */
function setMergedSchemaCache(key: string, value: SchemaResponse): void {
  if (mergedSchemaCache.size >= MERGED_SCHEMA_CACHE_MAX) {
    const oldest = mergedSchemaCache.keys().next();
    if (!oldest.done) {
      mergedSchemaCache.delete(oldest.value);
    }
  }
  mergedSchemaCache.set(key, value);
}

/**
 * 构建基础配置 Schema
 */
function buildBaseSchema(): SchemaResponse {
  if (cachedBase) {
    return cachedBase;
  }
  const schema = zodToJsonSchema(OpenClawConfigSchema, {
    name: 'OpenClawConfig',
  });
  const hints: ConfigUiHints = {};
  const next = {
    schema,
    uiHints: hints,
    version: VERSION,
    generatedAt: new Date().toISOString(),
  };
  cachedBase = next;
  return next;
}

/**
 * 构建配置 Schema
 */
export function buildConfigSchema(params?: {
  extensions?: SchemaExtensionMetadata[];
}): SchemaResponse {
  const base = buildBaseSchema();
  const extensions = params?.extensions ?? [];
  if (extensions.length === 0) {
    return base;
  }
  const cacheKey = buildMergedSchemaCacheKey(extensions);
  const cached = mergedSchemaCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const mergedHints = applyExtensionHints(base.uiHints, extensions);
  const mergedSchema = applyExtensionSchemas(base.schema as JsonSchemaObject, extensions);
  const merged = {
    ...base,
    schema: mergedSchema,
    uiHints: mergedHints,
  };
  setMergedSchemaCache(cacheKey, merged);
  return merged;
}
