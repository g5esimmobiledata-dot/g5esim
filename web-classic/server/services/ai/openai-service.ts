/**
 * OpenAI Service Wrapper
 * 
 * Robust OpenAI client with:
 * - API key from environment
 * - Connection testing
 * - Retry with exponential backoff
 * - Rate limiting
 * - Usage tracking
 * - Graceful error handling
 */

import "dotenv/config";
import OpenAI, { toFile } from "openai";

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  lastRequestAt: Date | null;
  errors: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
};

export class OpenAIService {
  private client: OpenAI | null = null;
  private isConfigured: boolean = false;
  private apiKeySource: "env" | "admin" | null = null;
  private usage: UsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCost: 0,
    lastRequestAt: null,
    errors: 0,
  };
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
    this.initialize();
  }

  /**
   * Initialize OpenAI client from environment
   */
  private initialize(): void {
    const apiKey = this.getEnvApiKey();
    
    if (apiKey) {
      this.configureClient(apiKey, "env");
    } else {
      console.log("[OpenAI Service] No API key configured - AI features disabled");
      this.isConfigured = false;
      this.apiKeySource = null;
    }
  }

  private getEnvApiKey(): string | null {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    return apiKey && apiKey.length > 0 ? apiKey : null;
  }

  private configureClient(apiKey: string, source: "env" | "admin"): void {
    try {
      this.client = new OpenAI({ apiKey });
      this.isConfigured = true;
      this.apiKeySource = source;
      console.log(`[OpenAI Service] Initialized from ${source}`);
    } catch (error) {
      console.error("[OpenAI Service] Failed to initialize:", error);
      this.client = null;
      this.isConfigured = false;
      this.apiKeySource = null;
    }
  }

  private async ensureConfigured(): Promise<void> {
    if (this.isReady()) return;
    const envApiKey = this.getEnvApiKey();
    if (envApiKey) {
      this.configureClient(envApiKey, "env");
      return;
    }

    try {
      const { storage } = await import("server/storage");
      const storedKey = (await storage.getSettingByKey("openai_api_key"))?.value?.trim();
      if (storedKey) {
        this.configureClient(storedKey, "admin");
      }
    } catch (error) {
      console.error("[OpenAI Service] Failed to load stored API key:", error);
    }
  }

  setApiKey(apiKey: string, source: "env" | "admin" = "admin"): void {
    this.configureClient(apiKey, source);
  }

  async refreshFromStoredKey(): Promise<void> {
    await this.ensureConfigured();
  }

  getApiKeySource(): "env" | "admin" | null {
    return this.apiKeySource;
  }

  /**
   * Check if OpenAI is configured and ready
   */
  isReady(): boolean {
    if ((!this.isConfigured || this.client === null) && this.getEnvApiKey()) {
      this.configureClient(this.getEnvApiKey()!, "env");
    }
    return this.isConfigured && this.client !== null;
  }

  /**
   * Test the OpenAI connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    await this.ensureConfigured();

    if (!this.isReady()) {
      return {
        success: false,
        message: "OpenAI API key not configured",
      };
    }

    const startTime = Date.now();
    
    try {
      const response = await this.client!.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'OK' if you can read this." }],
        max_tokens: 10,
      });

      const latencyMs = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || "";

      if (content.toLowerCase().includes("ok")) {
        return {
          success: true,
          message: "OpenAI connection successful",
          latencyMs,
        };
      }

      return {
        success: false,
        message: "Unexpected response from OpenAI",
        latencyMs,
      };
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 401 || status === 403) {
        return {
          success: false,
          message: "OpenAI rejected this API key. Create a new platform API key at platform.openai.com, make sure API billing/project access is active, save it here, then test again.",
        };
      }

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): UsageStats {
    return { ...this.usage };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.usage = {
      totalRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0,
      lastRequestAt: null,
      errors: 0,
    };
  }

  /**
   * Calculate estimated cost for a request
   */
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const costs = COST_PER_1K_TOKENS[model] || COST_PER_1K_TOKENS["gpt-4o-mini"];
    return (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Execute a chat completion with retry logic
   */
  async chatCompletion(
    userPrompt: string,
    options: ChatCompletionOptions = {}
  ): Promise<{ success: boolean; content: string | null; error?: string }> {
    await this.ensureConfigured();

    if (!this.isReady()) {
      return {
        success: false,
        content: null,
        error: "OpenAI not configured",
      };
    }

    const {
      model = "gpt-4o-mini",
      temperature = 0.3,
      maxTokens = 2000,
      systemPrompt,
    } = options;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.getRetryDelay(attempt - 1);
          console.log(`[OpenAI Service] Retry attempt ${attempt}/${this.retryConfig.maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }

        const response = await this.client!.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        const content = response.choices[0]?.message?.content || null;
        const promptTokens = response.usage?.prompt_tokens || 0;
        const completionTokens = response.usage?.completion_tokens || 0;

        // Update usage stats
        this.usage.totalRequests++;
        this.usage.promptTokens += promptTokens;
        this.usage.completionTokens += completionTokens;
        this.usage.totalTokens += promptTokens + completionTokens;
        this.usage.estimatedCost += this.calculateCost(model, promptTokens, completionTokens);
        this.usage.lastRequestAt = new Date();

        return { success: true, content };

      } catch (error: any) {
        lastError = error;
        this.usage.errors++;

        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
          console.error("[OpenAI Service] Authentication error - not retrying");
          break;
        }

        // Don't retry on bad request errors
        if (error.status === 400) {
          console.error("[OpenAI Service] Bad request - not retrying:", error.message);
          break;
        }

        console.warn(`[OpenAI Service] Request failed (attempt ${attempt + 1}):`, error.message);
      }
    }

    return {
      success: false,
      content: null,
      error: lastError?.message || "Unknown error",
    };
  }

  /**
   * Parse JSON from AI response with error handling
   */
  async chatCompletionJSON<T>(
    userPrompt: string,
    options: ChatCompletionOptions = {}
  ): Promise<{ success: boolean; data: T | null; error?: string }> {
    const result = await this.chatCompletion(userPrompt, {
      ...options,
      systemPrompt: (options.systemPrompt || "") + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.",
    });

    if (!result.success || !result.content) {
      return { success: false, data: null, error: result.error };
    }

    try {
      // Clean up potential markdown formatting
      let jsonStr = result.content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const data = JSON.parse(jsonStr) as T;
      return { success: true, data };
    } catch (parseError: any) {
      return {
        success: false,
        data: null,
        error: `JSON parse error: ${parseError.message}`,
      };
    }
  }

  /**
   * Reinitialize the client (e.g., after API key change)
   */
  reinitialize(): void {
    this.client = null;
    this.isConfigured = false;
    this.apiKeySource = null;
    this.initialize();
  }

  async transcribeAudio(
    audio: Buffer,
    filename = "concierge-voice.webm",
  ): Promise<{ success: boolean; text: string | null; error?: string }> {
    await this.ensureConfigured();

    if (!this.isReady()) {
      return { success: false, text: null, error: "OpenAI not configured" };
    }

    try {
      const file = await toFile(audio, filename);
      const result = await this.client!.audio.transcriptions.create({
        file,
        model: "whisper-1",
      });

      this.usage.totalRequests++;
      this.usage.lastRequestAt = new Date();

      return { success: true, text: String(result.text || "").trim() };
    } catch (error: any) {
      this.usage.errors++;
      return { success: false, text: null, error: error.message || "Transcription failed" };
    }
  }

  async textToSpeech(
    text: string,
    options: { model?: string; voice?: string; speed?: number; instructions?: string } = {},
  ): Promise<{ success: boolean; audio: Buffer | null; contentType: string; error?: string }> {
    await this.ensureConfigured();

    if (!this.isReady()) {
      return { success: false, audio: null, contentType: "audio/mpeg", error: "OpenAI not configured" };
    }

    try {
      const response = await this.client!.audio.speech.create({
        model: options.model || "gpt-4o-mini-tts",
        voice: options.voice || "cedar",
        input: text.slice(0, 4000),
        response_format: "mp3",
        speed: options.speed || 0.98,
        instructions:
          options.instructions ||
          "Read this like a real live customer-support person, not an announcer. Use natural conversational English, calm confidence, small human pauses between sentences, and clear pronunciation. Keep a normal speaking speed, do not sound robotic, and do not overact.",
      });
      const audio = Buffer.from(await response.arrayBuffer());

      this.usage.totalRequests++;
      this.usage.lastRequestAt = new Date();

      return { success: true, audio, contentType: "audio/mpeg" };
    } catch (error: any) {
      this.usage.errors++;
      return { success: false, audio: null, contentType: "audio/mpeg", error: error.message || "Speech failed" };
    }
  }
}

// Singleton instance
export const openAIService = new OpenAIService();
