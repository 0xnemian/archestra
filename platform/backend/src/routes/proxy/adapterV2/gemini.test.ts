import { describe, expect, test } from "@/test";
import type { Gemini } from "@/types";
import { type GeminiRequestWithContext, geminiAdapterFactory } from "./gemini";

function createMockRequest(
  contents: Gemini.Types.GenerateContentRequest["contents"],
  tools?: Gemini.Types.Tool[],
): GeminiRequestWithContext {
  return {
    contents,
    tools,
    _model: "gemini-2.5-pro",
    _isStreaming: false,
  };
}

function createMockResponse(
  parts: Gemini.Types.MessagePart[],
  usageMetadata?: Gemini.Types.UsageMetadata,
): Gemini.Types.GenerateContentResponse {
  return {
    candidates: [
      {
        content: {
          parts,
          role: "model",
        },
        finishReason: "STOP",
        index: 0,
      },
    ],
    modelVersion: "gemini-2.5-pro",
    responseId: "test-response-id",
    usageMetadata: usageMetadata ?? {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150,
    },
  };
}

describe("GeminiRequestAdapter", () => {
  describe("getModel", () => {
    test("returns model from context", () => {
      const request = createMockRequest([]);
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.getModel()).toBe("gemini-2.5-pro");
    });

    test("returns modified model after setModel", () => {
      const request = createMockRequest([]);
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      adapter.setModel("gemini-2.0-flash");

      expect(adapter.getModel()).toBe("gemini-2.0-flash");
    });
  });

  describe("isStreaming", () => {
    test("returns false for non-streaming request", () => {
      const request = createMockRequest([]);
      request._isStreaming = false;
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.isStreaming()).toBe(false);
    });

    test("returns true for streaming request", () => {
      const request = createMockRequest([]);
      request._isStreaming = true;
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.isStreaming()).toBe(true);
    });
  });

  describe("getTools", () => {
    test("returns tools from function declarations", () => {
      const request = createMockRequest(
        [],
        [
          {
            functionDeclarations: [
              {
                name: "get_weather",
                description: "Get the weather for a location",
                parameters: {
                  type: "object",
                  properties: {
                    location: { type: "string" },
                  },
                },
              },
            ],
          },
        ],
      );
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      const tools = adapter.getTools();

      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual({
        name: "get_weather",
        description: "Get the weather for a location",
        inputSchema: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
        },
      });
    });

    test("returns empty array when no tools", () => {
      const request = createMockRequest([]);
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.getTools()).toEqual([]);
    });
  });

  describe("hasTools", () => {
    test("returns true when tools are present", () => {
      const request = createMockRequest(
        [],
        [
          {
            functionDeclarations: [
              {
                name: "test_tool",
                description: "A test tool",
              },
            ],
          },
        ],
      );
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.hasTools()).toBe(true);
    });

    test("returns false when no tools", () => {
      const request = createMockRequest([]);
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.hasTools()).toBe(false);
    });
  });

  describe("getToolResults", () => {
    test("extracts function responses from contents", () => {
      const request = createMockRequest([
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: "get_weather",
                id: "call_123",
                response: { temperature: 72, unit: "F" },
              },
            },
          ],
        },
      ]);
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      const results = adapter.getToolResults();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: "call_123",
        name: "get_weather",
        content: { temperature: 72, unit: "F" },
        isError: false,
      });
    });

    test("returns empty array when no function responses", () => {
      const request = createMockRequest([
        {
          role: "user",
          parts: [{ text: "Hello" }],
        },
      ]);
      const adapter = geminiAdapterFactory.createRequestAdapter(request);

      expect(adapter.getToolResults()).toEqual([]);
    });
  });
});

describe("GeminiResponseAdapter", () => {
  describe("getToolCalls", () => {
    test("converts function call parts to common format", () => {
      const response = createMockResponse([
        {
          functionCall: {
            id: "call_123",
            name: "github_mcp_server__list_issues",
            args: {
              repo: "archestra-ai/archestra",
              count: 5,
            },
          },
        },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);
      const result = adapter.getToolCalls();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "call_123",
        name: "github_mcp_server__list_issues",
        arguments: {
          repo: "archestra-ai/archestra",
          count: 5,
        },
      });
    });

    test("handles multiple function call parts", () => {
      const response = createMockResponse([
        {
          functionCall: {
            id: "call_1",
            name: "tool_one",
            args: { param: "value1" },
          },
        },
        {
          functionCall: {
            id: "call_2",
            name: "tool_two",
            args: { param: "value2" },
          },
        },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);
      const result = adapter.getToolCalls();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "call_1",
        name: "tool_one",
        arguments: { param: "value1" },
      });
      expect(result[1]).toMatchObject({
        id: "call_2",
        name: "tool_two",
        arguments: { param: "value2" },
      });
    });

    test("handles empty args", () => {
      const response = createMockResponse([
        {
          functionCall: {
            id: "call_empty",
            name: "empty_tool",
            args: {},
          },
        },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);
      const result = adapter.getToolCalls();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "call_empty",
        name: "empty_tool",
        arguments: {},
      });
    });
  });

  describe("hasToolCalls", () => {
    test("returns true when function calls present", () => {
      const response = createMockResponse([
        {
          functionCall: {
            id: "call_123",
            name: "test_tool",
            args: {},
          },
        },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);

      expect(adapter.hasToolCalls()).toBe(true);
    });

    test("returns false when no function calls", () => {
      const response = createMockResponse([{ text: "Hello world" }]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);

      expect(adapter.hasToolCalls()).toBe(false);
    });
  });

  describe("getText", () => {
    test("extracts text from parts", () => {
      const response = createMockResponse([{ text: "Hello world" }]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);

      expect(adapter.getText()).toBe("Hello world");
    });

    test("joins multiple text parts", () => {
      const response = createMockResponse([
        { text: "Hello " },
        { text: "world" },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);

      expect(adapter.getText()).toBe("Hello world");
    });

    test("returns empty string when no text parts", () => {
      const response = createMockResponse([
        {
          functionCall: {
            name: "test_tool",
            args: {},
          },
        },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);

      expect(adapter.getText()).toBe("");
    });
  });

  describe("getUsage", () => {
    test("extracts usage from metadata", () => {
      const response = createMockResponse([{ text: "Hello" }], {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150,
      });

      const adapter = geminiAdapterFactory.createResponseAdapter(response);
      const usage = adapter.getUsage();

      expect(usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    test("returns zeros when no usage metadata", () => {
      const response: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello" }],
              role: "model",
            },
            finishReason: "STOP",
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      };

      const adapter = geminiAdapterFactory.createResponseAdapter(response);
      const usage = adapter.getUsage();

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
      });
    });
  });

  describe("toRefusalResponse", () => {
    test("creates refusal response with text content", () => {
      const response = createMockResponse([
        {
          functionCall: {
            name: "blocked_tool",
            args: {},
          },
        },
      ]);

      const adapter = geminiAdapterFactory.createResponseAdapter(response);
      const refusal = adapter.toRefusalResponse(
        "Tool blocked by policy",
        "I cannot execute that tool due to policy restrictions.",
      );

      expect(refusal.candidates).toHaveLength(1);
      expect(refusal.candidates?.[0]?.content?.parts).toHaveLength(1);
      expect(refusal.candidates?.[0]?.content?.parts?.[0]).toEqual({
        text: "I cannot execute that tool due to policy restrictions.",
      });
      expect(refusal.candidates?.[0]?.finishReason).toBe("STOP");
    });
  });
});

describe("GeminiStreamAdapter", () => {
  describe("processChunk", () => {
    test("accumulates text from chunks", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      const chunk1: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello " }],
              role: "model",
            },
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      };

      const chunk2: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "world" }],
              role: "model",
            },
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      };

      adapter.processChunk(chunk1);
      adapter.processChunk(chunk2);

      expect(adapter.state.text).toBe("Hello world");
    });

    test("detects tool call chunks", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      const chunk: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "test_tool",
                    args: { param: "value" },
                  },
                },
              ],
              role: "model",
            },
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      };

      const result = adapter.processChunk(chunk);

      expect(result.isToolCallChunk).toBe(true);
      expect(adapter.state.toolCalls).toHaveLength(1);
    });

    test("detects final chunk", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      const chunk: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Done" }],
              role: "model",
            },
            finishReason: "STOP",
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      };

      const result = adapter.processChunk(chunk);

      expect(result.isFinal).toBe(true);
      expect(adapter.state.stopReason).toBe("STOP");
    });

    test("tracks usage metadata", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      const chunk: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello" }],
              role: "model",
            },
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      };

      adapter.processChunk(chunk);

      expect(adapter.state.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });
  });

  describe("toProviderResponse", () => {
    test("builds complete response from accumulated state", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      // Simulate processing chunks
      adapter.processChunk({
        candidates: [
          {
            content: {
              parts: [{ text: "Hello world" }],
              role: "model",
            },
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
        responseId: "resp-123",
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      });

      adapter.processChunk({
        candidates: [
          {
            content: {
              parts: [{ text: "" }],
              role: "model",
            },
            finishReason: "STOP",
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      });

      const response = adapter.toProviderResponse();

      expect(response.candidates).toHaveLength(1);
      expect(response.candidates?.[0]?.content?.parts?.[0]).toEqual({
        text: "Hello world",
      });
      expect(response.modelVersion).toBe("gemini-2.5-pro");
      expect(response.usageMetadata).toEqual({
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      });
    });
  });

  describe("formatEndSSE", () => {
    test("returns done marker", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      expect(adapter.formatEndSSE()).toBe("data: [DONE]\n\n");
    });
  });

  describe("getRawToolCallEvents", () => {
    test("returns buffered tool call events as SSE", () => {
      const adapter = geminiAdapterFactory.createStreamAdapter();

      const chunk: Gemini.Types.GenerateContentResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "test_tool",
                    args: { param: "value" },
                  },
                },
              ],
              role: "model",
            },
            index: 0,
          },
        ],
        modelVersion: "gemini-2.5-pro",
      };

      adapter.processChunk(chunk);

      const events = adapter.getRawToolCallEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatch(/^data: /);
      expect(events[0]).toMatch(/\n\n$/);
    });
  });
});
