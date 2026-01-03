import type { GenerateContentParameters, GoogleGenAI } from "@google/genai";
import { get } from "lodash-es";
import config from "@/config";
import type {
  ChunkProcessingResult,
  CommonMcpToolDefinition,
  CommonMessage,
  CommonToolCall,
  CommonToolResult,
  Gemini,
  LLMProvider,
  LLMRequestAdapter,
  LLMResponseAdapter,
  LLMStreamAdapter,
  StreamAccumulatorState,
  ToonCompressionResult,
  UsageView,
} from "@/types";
import {
  applyUpdates,
  convertToolResultsToToon,
  generateToolCallId,
  restToSdkGenerateContentParams,
  sdkResponseToRestResponse,
  toCommonFormat,
} from "../utils/adapters/gemini";
import { createGoogleGenAIClient } from "../utils/gemini-client";

// =============================================================================
// TYPE ALIASES
// =============================================================================

type GeminiRequest = Gemini.Types.GenerateContentRequest;
type GeminiResponse = Gemini.Types.GenerateContentResponse;
type GeminiContents = Gemini.Types.GenerateContentRequest["contents"];
type GeminiHeaders = Gemini.Types.GenerateContentHeaders;

// Stream chunk type - Gemini streams GenerateContentResponse objects
type GeminiStreamChunk = GeminiResponse;

// =============================================================================
// REQUEST ADAPTER
// =============================================================================

class GeminiRequestAdapter
  implements LLMRequestAdapter<GeminiRequest, GeminiContents>
{
  readonly provider = "gemini" as const;
  private request: GeminiRequest;
  private modifiedModel: string | null = null;
  private modelFromUrl: string;
  private isStreamingRequest: boolean;
  private toolResultUpdates: Record<string, string> = {};

  constructor(
    request: GeminiRequest,
    modelFromUrl: string,
    isStreaming: boolean,
  ) {
    this.request = request;
    this.modelFromUrl = modelFromUrl;
    this.isStreamingRequest = isStreaming;
  }

  // ---------------------------------------------------------------------------
  // Read Access
  // ---------------------------------------------------------------------------

  getModel(): string {
    return this.modifiedModel ?? this.modelFromUrl;
  }

  isStreaming(): boolean {
    // For Gemini, streaming is determined by the route (streamGenerateContent vs generateContent)
    return this.isStreamingRequest;
  }

  getMessages(): CommonMessage[] {
    return toCommonFormat(this.request.contents || []);
  }

  getToolResults(): CommonToolResult[] {
    const results: CommonToolResult[] = [];

    for (const content of this.request.contents || []) {
      if (content.role === "user" && content.parts) {
        for (const part of content.parts) {
          if (
            "functionResponse" in part &&
            part.functionResponse &&
            typeof part.functionResponse === "object" &&
            "name" in part.functionResponse &&
            "response" in part.functionResponse
          ) {
            const { functionResponse } = part;
            const id =
              "id" in functionResponse &&
              typeof functionResponse.id === "string"
                ? functionResponse.id
                : generateToolCallId(functionResponse.name as string);

            let content: unknown;
            if (
              typeof functionResponse.response === "object" &&
              functionResponse.response !== null
            ) {
              content = functionResponse.response;
            } else {
              content = functionResponse.response;
            }

            results.push({
              id,
              name: functionResponse.name as string,
              content,
              isError: false,
            });
          }
        }
      }
    }

    return results;
  }

  getTools(): CommonMcpToolDefinition[] {
    if (!this.request.tools) return [];

    const result: CommonMcpToolDefinition[] = [];
    const tools = Array.isArray(this.request.tools)
      ? this.request.tools
      : [this.request.tools];

    for (const tool of tools) {
      if (tool.functionDeclarations) {
        for (const fd of tool.functionDeclarations) {
          result.push({
            name: fd.name ?? "unnamed_tool",
            description: fd.description,
            inputSchema: (fd.parameters as Record<string, unknown>) || {},
          });
        }
      }
    }
    return result;
  }

  hasTools(): boolean {
    if (!this.request.tools) return false;
    const tools = Array.isArray(this.request.tools)
      ? this.request.tools
      : [this.request.tools];
    return tools.some(
      (t) => t.functionDeclarations && t.functionDeclarations.length > 0,
    );
  }

  getProviderMessages(): GeminiContents {
    return this.request.contents || [];
  }

  getOriginalRequest(): GeminiRequest {
    return this.request;
  }

  // ---------------------------------------------------------------------------
  // Modify Access
  // ---------------------------------------------------------------------------

  setModel(model: string): void {
    this.modifiedModel = model;
  }

  updateToolResult(toolCallId: string, newContent: string): void {
    this.toolResultUpdates[toolCallId] = newContent;
  }

  applyToolResultUpdates(updates: Record<string, string>): void {
    Object.assign(this.toolResultUpdates, updates);
  }

  async applyToonCompression(model: string): Promise<ToonCompressionResult> {
    const { contents: compressedContents, stats } =
      await convertToolResultsToToon(this.request.contents || [], model);
    // Update internal contents state
    this.request = {
      ...this.request,
      contents: compressedContents,
    };
    return {
      tokensBefore: stats.toonTokensBefore,
      tokensAfter: stats.toonTokensAfter,
      costSavings: stats.toonCostSavings,
    };
  }

  // ---------------------------------------------------------------------------
  // Build Modified Request
  // ---------------------------------------------------------------------------

  toProviderRequest(): GeminiRequest {
    let contents = this.request.contents || [];

    // Apply tool result updates if any
    if (Object.keys(this.toolResultUpdates).length > 0) {
      contents = applyUpdates(contents, this.toolResultUpdates);
    }

    return {
      ...this.request,
      contents,
    };
  }
}

// =============================================================================
// RESPONSE ADAPTER
// =============================================================================

class GeminiResponseAdapter implements LLMResponseAdapter<GeminiResponse> {
  readonly provider = "gemini" as const;
  private response: GeminiResponse;

  constructor(response: GeminiResponse) {
    this.response = response;
  }

  getId(): string {
    return this.response.responseId || `gemini-${Date.now()}`;
  }

  getModel(): string {
    return this.response.modelVersion || "unknown";
  }

  getText(): string {
    const candidate = this.response.candidates?.[0];
    if (!candidate?.content?.parts) return "";

    return candidate.content.parts
      .filter((part) => "text" in part && part.text)
      .map((part) => ("text" in part ? part.text : ""))
      .join("");
  }

  getToolCalls(): CommonToolCall[] {
    const candidate = this.response.candidates?.[0];
    if (!candidate?.content?.parts) return [];

    return candidate.content.parts
      .filter((part) => "functionCall" in part && part.functionCall)
      .map((part) => {
        const fc = "functionCall" in part ? part.functionCall : undefined;
        return {
          id: fc?.id || generateToolCallId(fc?.name || "unknown"),
          name: fc?.name || "unknown",
          arguments: (fc?.args as Record<string, unknown>) || {},
        };
      });
  }

  hasToolCalls(): boolean {
    const candidate = this.response.candidates?.[0];
    if (!candidate?.content?.parts) return false;

    return candidate.content.parts.some(
      (part) => "functionCall" in part && part.functionCall,
    );
  }

  getUsage(): UsageView {
    return {
      inputTokens: this.response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: this.response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  getOriginalResponse(): GeminiResponse {
    return this.response;
  }

  toRefusalResponse(
    _refusalMessage: string,
    contentMessage: string,
  ): GeminiResponse {
    return {
      ...this.response,
      candidates: [
        {
          content: {
            parts: [{ text: contentMessage }],
            role: "model",
          },
          finishReason: "STOP",
          index: 0,
        },
      ],
    };
  }
}

// =============================================================================
// STREAM ADAPTER
// =============================================================================

class GeminiStreamAdapter
  implements LLMStreamAdapter<GeminiStreamChunk, GeminiResponse>
{
  readonly provider = "gemini" as const;
  readonly state: StreamAccumulatorState;
  private modelVersion = "";

  constructor() {
    this.state = {
      responseId: "",
      model: "",
      text: "",
      toolCalls: [],
      rawToolCallEvents: [],
      usage: null,
      stopReason: null,
      timing: {
        startTime: Date.now(),
        firstChunkTime: null,
      },
    };
  }

  processChunk(chunk: GeminiStreamChunk): ChunkProcessingResult {
    // Track first chunk time
    if (this.state.timing.firstChunkTime === null) {
      this.state.timing.firstChunkTime = Date.now();
    }

    let sseData: string | null = null;
    let isToolCallChunk = false;
    let isFinal = false;

    // Update model version
    if (chunk.modelVersion) {
      this.modelVersion = chunk.modelVersion;
      this.state.model = chunk.modelVersion;
    }

    // Update response ID
    if (chunk.responseId) {
      this.state.responseId = chunk.responseId;
    }

    // Process usage metadata
    if (chunk.usageMetadata) {
      this.state.usage = {
        inputTokens: chunk.usageMetadata.promptTokenCount ?? 0,
        outputTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
      };
    }

    // Process candidates
    const candidate = chunk.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if ("text" in part && part.text) {
          // Accumulate text
          this.state.text += part.text;
          // Stream text content immediately
          sseData = `data: ${JSON.stringify(chunk)}\n\n`;
        }

        if ("functionCall" in part && part.functionCall) {
          // Store tool call
          const fc = part.functionCall;
          this.state.toolCalls.push({
            id: fc.id || generateToolCallId(fc.name || "unknown"),
            name: fc.name || "unknown",
            arguments: JSON.stringify(fc.args || {}),
          });
          // Store raw event for replay after policy approval
          this.state.rawToolCallEvents.push(chunk);
          isToolCallChunk = true;
        }
      }

      // Check if this is the final chunk
      if (candidate.finishReason) {
        this.state.stopReason = candidate.finishReason;
        isFinal = true;
      }
    }

    return { sseData, isToolCallChunk, isFinal };
  }

  getSSEHeaders(): Record<string, string> {
    return {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
  }

  formatTextDeltaSSE(text: string): string {
    const chunk: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text }],
            role: "model",
          },
          finishReason: undefined,
          index: 0,
        },
      ],
      modelVersion: this.modelVersion,
    };
    return `data: ${JSON.stringify(chunk)}\n\n`;
  }

  getRawToolCallEvents(): string[] {
    return this.state.rawToolCallEvents.map(
      (event) => `data: ${JSON.stringify(event)}\n\n`,
    );
  }

  formatCompleteTextSSE(text: string): string[] {
    const chunk: GeminiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text }],
            role: "model",
          },
          finishReason: "STOP",
          index: 0,
        },
      ],
      modelVersion: this.modelVersion,
    };
    return [`data: ${JSON.stringify(chunk)}\n\n`];
  }

  formatEndSSE(): string {
    return "data: [DONE]\n\n";
  }

  toProviderResponse(): GeminiResponse {
    const parts: Gemini.Types.MessagePart[] = [];

    // Add text if present
    if (this.state.text) {
      parts.push({ text: this.state.text });
    }

    // Add function calls
    for (const toolCall of this.state.toolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolCall.arguments);
      } catch {
        // Keep empty object if parse fails
      }

      parts.push({
        functionCall: {
          id: toolCall.id,
          name: toolCall.name,
          args: parsedArgs,
        },
      });
    }

    return {
      candidates: [
        {
          content: {
            parts,
            role: "model",
          },
          finishReason:
            (this.state.stopReason as Gemini.Types.FinishReason) ?? "STOP",
          index: 0,
        },
      ],
      modelVersion: this.state.model,
      responseId: this.state.responseId || `gemini-stream-${Date.now()}`,
      usageMetadata: this.state.usage
        ? {
            promptTokenCount: this.state.usage.inputTokens,
            candidatesTokenCount: this.state.usage.outputTokens,
            totalTokenCount:
              this.state.usage.inputTokens + this.state.usage.outputTokens,
          }
        : undefined,
    };
  }

  toProviderRefusalResponse(
    _refusalMessage: string,
    contentMessage: string,
  ): GeminiResponse {
    return {
      candidates: [
        {
          content: {
            parts: [{ text: contentMessage }],
            role: "model",
          },
          finishReason: "STOP",
          index: 0,
        },
      ],
      modelVersion: this.state.model,
      responseId: this.state.responseId || `gemini-refusal-${Date.now()}`,
      usageMetadata: this.state.usage
        ? {
            promptTokenCount: this.state.usage.inputTokens,
            candidatesTokenCount: this.state.usage.outputTokens,
            totalTokenCount:
              this.state.usage.inputTokens + this.state.usage.outputTokens,
          }
        : undefined,
    };
  }
}

// =============================================================================
// ADAPTER FACTORY
// =============================================================================

/**
 * Extended Gemini request that includes model from URL and streaming flag
 * The generic LLM handler doesn't know about these, so we need a custom factory function
 */
export interface GeminiRequestWithContext extends GeminiRequest {
  _model: string;
  _isStreaming: boolean;
}

export const geminiAdapterFactory: LLMProvider<
  GeminiRequestWithContext,
  GeminiResponse,
  GeminiContents,
  GeminiStreamChunk,
  GeminiHeaders
> = {
  provider: "gemini",
  interactionType: "gemini:generateContent",

  createRequestAdapter(
    request: GeminiRequestWithContext,
  ): LLMRequestAdapter<GeminiRequestWithContext, GeminiContents> {
    const adapter = new GeminiRequestAdapter(
      request,
      request._model,
      request._isStreaming,
    );
    return adapter as unknown as LLMRequestAdapter<
      GeminiRequestWithContext,
      GeminiContents
    >;
  },

  createResponseAdapter(
    response: GeminiResponse,
  ): LLMResponseAdapter<GeminiResponse> {
    return new GeminiResponseAdapter(response);
  },

  createStreamAdapter(): LLMStreamAdapter<GeminiStreamChunk, GeminiResponse> {
    return new GeminiStreamAdapter();
  },

  extractApiKey(headers: GeminiHeaders): string | undefined {
    return headers["x-goog-api-key"];
  },

  getBaseUrl(): string | undefined {
    return config.llm.gemini.baseUrl;
  },

  createClient(
    apiKey: string | undefined,
    _options?: { baseUrl?: string; fetch?: typeof fetch; mockMode?: boolean },
  ): GoogleGenAI {
    // For Gemini, we use the dedicated client factory which handles Vertex AI vs API key modes
    return createGoogleGenAIClient(apiKey, "[GeminiProxyV2]");
  },

  async execute(
    client: unknown,
    request: GeminiRequestWithContext,
  ): Promise<GeminiResponse> {
    const genAI = client as GoogleGenAI;
    const model = request._model || "gemini-2.5-pro";

    // Normalize tools to array
    const tools = request.tools
      ? Array.isArray(request.tools)
        ? request.tools
        : [request.tools]
      : undefined;

    // Convert REST body to SDK params
    const sdkParams = restToSdkGenerateContentParams(
      request,
      model,
      tools,
    ) as GenerateContentParameters;

    // Execute the request
    const sdkResponse = await genAI.models.generateContent(sdkParams);

    // Convert SDK response back to REST format
    return sdkResponseToRestResponse(sdkResponse, model);
  },

  async executeStream(
    client: unknown,
    request: GeminiRequestWithContext,
  ): Promise<AsyncIterable<GeminiStreamChunk>> {
    const genAI = client as GoogleGenAI;
    const model = request._model || "gemini-2.5-pro";

    // Normalize tools to array
    const tools = request.tools
      ? Array.isArray(request.tools)
        ? request.tools
        : [request.tools]
      : undefined;

    // Convert REST body to SDK params
    const sdkParams = restToSdkGenerateContentParams(
      request,
      model,
      tools,
    ) as GenerateContentParameters;

    // Execute streaming request
    const streamResponse = await genAI.models.generateContentStream(sdkParams);

    // Convert SDK stream to REST format
    return {
      [Symbol.asyncIterator]: async function* () {
        for await (const sdkChunk of streamResponse) {
          yield sdkResponseToRestResponse(sdkChunk, model);
        }
      },
    };
  },

  extractErrorMessage(error: unknown): string {
    // Handle Google SDK error structure
    const googleMessage = get(error, "message");
    if (typeof googleMessage === "string") {
      return googleMessage;
    }

    const errorDetails = get(error, "error.message");
    if (typeof errorDetails === "string") {
      return errorDetails;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Internal server error";
  },
};
