import { describe, it, expect, beforeEach } from "vitest";
import { type ModelCatalog, createModelCatalog, type Model } from "../catalog.js";

// 测试模型数据
const testModels: Model[] = [
  {
    id: "openai-gpt-4",
    name: "GPT-4",
    provider: "openai",
    type: "chat",
    capabilities: ["chat", "vision"],
    default: true,
  },
  {
    id: "openai-gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    type: "chat",
    capabilities: ["chat"],
    default: false,
  },
  {
    id: "google-gemini-pro",
    name: "Gemini Pro",
    provider: "google",
    type: "chat",
    capabilities: ["chat", "vision"],
    default: false,
  },
  {
    id: "openai-text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    type: "embedding",
    capabilities: ["embedding"],
    default: true,
  },
];

describe("ModelCatalog", () => {
  let catalog: ModelCatalog;

  beforeEach(() => {
    catalog = createModelCatalog(testModels);
  });

  it("should create model catalog with initial models", () => {
    expect(catalog).toBeDefined();
    expect(catalog.getModels()).toHaveLength(testModels.length);
  });

  it("should get model by id", () => {
    const model = catalog.getModel("openai-gpt-4");
    expect(model).toBeDefined();
    expect(model?.id).toBe("openai-gpt-4");
    expect(model?.name).toBe("GPT-4");
  });

  it("should return undefined for non-existent model", () => {
    const model = catalog.getModel("non-existent-model");
    expect(model).toBeUndefined();
  });

  it("should get models by type", () => {
    const chatModels = catalog.getModelsByType("chat");
    expect(chatModels).toHaveLength(3);
    expect(chatModels.every((model) => model.type === "chat")).toBe(true);

    const embeddingModels = catalog.getModelsByType("embedding");
    expect(embeddingModels).toHaveLength(1);
    expect(embeddingModels.every((model) => model.type === "embedding")).toBe(true);
  });

  it("should get models by provider", () => {
    const openaiModels = catalog.getModelsByProvider("openai");
    expect(openaiModels).toHaveLength(3);
    expect(openaiModels.every((model) => model.provider === "openai")).toBe(true);

    const googleModels = catalog.getModelsByProvider("google");
    expect(googleModels).toHaveLength(1);
    expect(googleModels.every((model) => model.provider === "google")).toBe(true);
  });

  it("should get default model by type", () => {
    const defaultChatModel = catalog.getDefaultModel("chat");
    expect(defaultChatModel).toBeDefined();
    expect(defaultChatModel?.id).toBe("openai-gpt-4");
    expect(defaultChatModel?.default).toBe(true);

    const defaultEmbeddingModel = catalog.getDefaultModel("embedding");
    expect(defaultEmbeddingModel).toBeDefined();
    expect(defaultEmbeddingModel?.id).toBe("openai-text-embedding-3-small");
    expect(defaultEmbeddingModel?.default).toBe(true);
  });

  it("should return undefined for default model if none exists", () => {
    // 创建一个没有默认模型的目录
    const noDefaultModels = testModels.map((model) => ({ ...model, default: false }));
    const noDefaultCatalog = createModelCatalog(noDefaultModels);
    const defaultModel = noDefaultCatalog.getDefaultModel("chat");
    expect(defaultModel).toBeUndefined();
  });

  it("should add model to catalog", () => {
    const newModel: Model = {
      id: "anthropic-claude-3-opus",
      name: "Claude 3 Opus",
      provider: "anthropic",
      type: "chat",
      capabilities: ["chat", "vision"],
      default: false,
    };

    catalog.addModel(newModel);
    expect(catalog.getModels()).toHaveLength(testModels.length + 1);
    const addedModel = catalog.getModel("anthropic-claude-3-opus");
    expect(addedModel).toEqual(newModel);
  });

  it("should update existing model", () => {
    const updatedModel: Model = {
      id: "openai-gpt-4",
      name: "GPT-4 (Updated)",
      provider: "openai",
      type: "chat",
      capabilities: ["chat", "vision", "audio"],
      default: true,
    };

    catalog.updateModel(updatedModel);
    const model = catalog.getModel("openai-gpt-4");
    expect(model).toEqual(updatedModel);
  });

  it("should remove model from catalog", () => {
    catalog.removeModel("openai-gpt-4");
    expect(catalog.getModels()).toHaveLength(testModels.length - 1);
    expect(catalog.getModel("openai-gpt-4")).toBeUndefined();
  });

  it("should handle empty catalog", () => {
    const emptyCatalog = createModelCatalog([]);
    expect(emptyCatalog.getModels()).toHaveLength(0);
    expect(emptyCatalog.getModel("any-model")).toBeUndefined();
    expect(emptyCatalog.getModelsByType("chat")).toHaveLength(0);
    expect(emptyCatalog.getModelsByProvider("openai")).toHaveLength(0);
    expect(emptyCatalog.getDefaultModel("chat")).toBeUndefined();
  });
});
