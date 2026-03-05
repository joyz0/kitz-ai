import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildConfigSchema,
  SchemaExtensionMetadata,
  cloneSchema,
  asSchemaObject,
  isObjectSchema,
  mergeObjectSchema,
  collectExtensionHintKeys,
} from "../schema.js";

describe("Config Schema", () => {
  beforeEach(() => {
    // Clear caches before each test
    vi.resetModules();
  });

  describe("buildConfigSchema", () => {
    it("should build base schema without extensions", () => {
      const schema = buildConfigSchema();
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints).toBeDefined();
      expect(schema.version).toBeDefined();
      expect(schema.generatedAt).toBeDefined();
    });

    it("should build schema with extensions", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
          description: "A test plugin",
          configSchema: {
            type: "object",
            properties: {
              apiKey: {
                type: "string",
              },
            },
          },
          configUiHints: {
            apiKey: {
              label: "API Key",
              sensitive: true,
            },
          },
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints["plugins.entries.test-plugin"]).toBeDefined();
      expect(
        schema.uiHints["plugins.entries.test-plugin.config.apiKey"]
      ).toBeDefined();
    });

    it("should use cache for repeated calls with same extensions", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
        },
      ];

      const schema1 = buildConfigSchema({ extensions });
      const schema2 = buildConfigSchema({ extensions });
      expect(schema1).toBe(schema2);
    });

    it("should handle extensions with empty id", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "",
          name: "Test Plugin",
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints).toBeDefined();
    });

    it("should handle extensions with empty configUiHints", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
          configUiHints: {},
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints).toBeDefined();
    });

    it("should handle extensions with empty configSchema", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints).toBeDefined();
    });

    it("should handle multiple extensions", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "plugin1",
          name: "Plugin 1",
        },
        {
          id: "plugin2",
          name: "Plugin 2",
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints["plugins.entries.plugin1"]).toBeDefined();
      expect(schema.uiHints["plugins.entries.plugin2"]).toBeDefined();
    });

    it("should handle extensions with nested configUiHints", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
          configUiHints: {
            "nested.property": {
              label: "Nested Property",
              help: "A nested property",
            },
          },
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(
        schema.uiHints["plugins.entries.test-plugin.config.nested.property"]
      ).toBeDefined();
    });

    it("should handle extensions with relative configUiHints paths", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
          configUiHints: {
            ".relative.path": {
              label: "Relative Path",
              help: "A relative path property",
            },
          },
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(
        schema.uiHints["plugins.entries.test-plugin.config.relative.path"]
      ).toBeDefined();
    });

    it("should handle extensions with empty configUiHints paths", () => {
      const extensions: SchemaExtensionMetadata[] = [
        {
          id: "test-plugin",
          name: "Test Plugin",
          configUiHints: {
            "": {
              label: "Empty Path",
              help: "An empty path property",
            },
          },
        },
      ];

      const schema = buildConfigSchema({ extensions });
      expect(schema).toBeDefined();
      expect(schema.schema).toBeDefined();
      expect(schema.uiHints).toBeDefined();
    });
  });

  describe("internal functions", () => {
    it("should test cloneSchema function", () => {
      const testObj = { a: 1, b: { c: 2 } };
      const cloned = cloneSchema(testObj);
      expect(cloned).toEqual(testObj);
      expect(cloned).not.toBe(testObj);

      // Test JSON.parse(JSON.stringify) fallback
      const originalStructuredClone = global.structuredClone;
      try {
        // @ts-ignore - Override structuredClone to test fallback
        global.structuredClone = undefined;
        const testObj2 = { a: 1, b: { c: 2 } };
        const cloned2 = cloneSchema(testObj2);
        expect(cloned2).toEqual(testObj2);
        expect(cloned2).not.toBe(testObj2);
      } finally {
        // @ts-ignore - Restore structuredClone
        global.structuredClone = originalStructuredClone;
      }
    });

    it("should test asSchemaObject function", () => {
      expect(asSchemaObject({})).toBeDefined();
      expect(asSchemaObject(null)).toBeNull();
      expect(asSchemaObject(undefined)).toBeNull();
      expect(asSchemaObject([])).toBeNull();
      expect(asSchemaObject("string")).toBeNull();
      expect(asSchemaObject(123)).toBeNull();
    });

    it("should test isObjectSchema function", () => {
      expect(isObjectSchema({ type: "object" })).toBe(true);
      expect(isObjectSchema({ type: ["object", "null"] })).toBe(true);
      expect(isObjectSchema({ properties: {} })).toBe(true);
      expect(isObjectSchema({ additionalProperties: true })).toBe(true);
      expect(isObjectSchema({ type: "string" })).toBe(false);
    });

    it("should test mergeObjectSchema function", () => {
      const base = {
        type: "object",
        properties: { a: { type: "string" } },
        required: ["a"],
      };
      const extension = {
        properties: { b: { type: "number" } },
        required: ["b"],
      };
      const merged = mergeObjectSchema(base, extension);
      expect(merged.properties).toHaveProperty("a");
      expect(merged.properties).toHaveProperty("b");
      expect(merged.required).toContain("a");
      expect(merged.required).toContain("b");

      // Test additionalProperties handling
      const baseWithAdditional = {
        type: "object",
        additionalProperties: false,
      };
      const extensionWithAdditional = {
        additionalProperties: true,
      };
      const mergedWithAdditional = mergeObjectSchema(
        baseWithAdditional,
        extensionWithAdditional
      );
      expect(mergedWithAdditional.additionalProperties).toBe(true);
    });

    it("should test collectExtensionHintKeys function", () => {
      const hints = {
        "plugins.entries.test-plugin": {},
        "plugins.entries.test-plugin.enabled": {},
        "plugins.entries.other-plugin": {},
        "other.key": {},
      };
      const extensions = [{ id: "test-plugin" }, { id: "other-plugin" }];
      const keys = collectExtensionHintKeys(hints, extensions);
      expect(keys.size).toBe(3);
      expect(keys.has("plugins.entries.test-plugin")).toBe(true);
      expect(keys.has("plugins.entries.test-plugin.enabled")).toBe(true);
      expect(keys.has("plugins.entries.other-plugin")).toBe(true);
    });
  });
});
