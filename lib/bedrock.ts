import { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || "";

export function bedrockConfigured(): boolean {
  return Boolean(accessKeyId && secretAccessKey);
}

export const EMBED_DIMENSIONS = 1024;

const EMBED_MODEL = process.env.BEDROCK_EMBED_MODEL || "amazon.titan-embed-text-v2:0";
const CHAT_MODEL = process.env.BEDROCK_CHAT_MODEL || "amazon.nova-micro-v1:0";

const client = new BedrockRuntimeClient({
  region: REGION,
  credentials: { accessKeyId, secretAccessKey },
});

// Titan Embed Text v2 (Amazon's own model): { inputText } -> { embedding: number[] }
export async function embedTexts(
  texts: string[],
  _inputType: "search_document" | "search_query" = "search_query"
): Promise<number[][] | null> {
  try {
    const out: number[][] = [];
    for (const text of texts) {
      const res = await client.send(
        new InvokeModelCommand({
          modelId: EMBED_MODEL,
          contentType: "application/json",
          accept: "application/json",
          body: Buffer.from(
            JSON.stringify({ inputText: text.slice(0, 8000), dimensions: EMBED_DIMENSIONS, normalize: true })
          ),
        })
      );
      const parsed = JSON.parse(Buffer.from(res.body).toString("utf-8"));
      const embedding: number[] = parsed.embedding ?? [];
      out.push(embedding.slice(0, EMBED_DIMENSIONS).map(Math.fround));
    }
    return out;
  } catch (err) {
    console.error("Bedrock embed error:", err);
    return null;
  }
}

// Amazon Nova Micro via Converse API
export async function chatNova(system: string, user: string): Promise<string | null> {
  try {
    const res = await client.send(
      new ConverseCommand({
        modelId: CHAT_MODEL,
        messages: [{ role: "user", content: [{ text: user }] }],
        system: [{ text: system }],
        inferenceConfig: { maxTokens: 512, temperature: 0.2, topP: 0.9 },
      })
    );
    return res.output?.message?.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Bedrock chat error:", err);
    return null;
  }
}

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentStep {
  text: string | null;
  toolCalls: Array<{ toolUseId: string; name: string; input: Record<string, unknown> }>;
  rawContent: unknown[];
}

// Native tool-use via the Converse API: the model returns toolUse blocks
// which the caller executes and feeds back as toolResult messages.
export async function chatWithTools(opts: {
  system: string;
  messages: Array<Record<string, unknown>>;
  tools: AgentTool[];
}): Promise<AgentStep> {
  try {
    const res = await client.send(
      new ConverseCommand({
        modelId: CHAT_MODEL,
        messages: opts.messages as never,
        system: [{ text: opts.system }],
        inferenceConfig: { maxTokens: 1024, temperature: 0.2, topP: 0.9 },
        toolConfig: {
          tools: opts.tools.map((t) => ({
            toolSpec: {
              name: t.name,
              description: t.description,
              inputSchema: { json: t.inputSchema as never },
            },
          })),
        },
      })
    );
    const content = res.output?.message?.content ?? [];
    return {
      text: content.find((c) => c.text)?.text ?? null,
      toolCalls: content
        .filter((c) => c.toolUse)
        .map((c) => ({
          toolUseId: c.toolUse?.toolUseId ?? "",
          name: c.toolUse?.name ?? "",
          input: (c.toolUse?.input as Record<string, unknown>) ?? {},
        })),
      rawContent: content as unknown[],
    };
  } catch (err) {
    console.error("Bedrock chatWithTools error:", err);
    return { text: null, toolCalls: [], rawContent: [] };
  }
}
