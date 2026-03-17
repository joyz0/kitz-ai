import { loadModelCatalog, getProviderRuntime } from "../src/agents/models/catalog.js";

describe("Model Catalog Module", () => {
  describe("loadModelCatalog", () => {
    it("should load model catalog successfully", async () => {
      const agentDir = "/tmp";
      const config = {
        providers: {},
      };
      const catalog = await loadModelCatalog(agentDir, config);
      expect(catalog).toBeDefined();
      expect(catalog.models).toBeDefined();
    });
  });

  describe("getProviderRuntime", () => {
    it("should return provider runtime instance", () => {
      const config = {
        providers: {},
      };
      const runtime = getProviderRuntime(config);
      expect(runtime).toBeDefined();
      expect(typeof runtime.getModelInfo).toBe("function");
      expect(typeof runtime.isModelSuppressed).toBe("function");
    });
  });
});
