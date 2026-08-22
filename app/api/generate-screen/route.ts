import type {
  GeneratedElement,
  GeneratedScreen,
  LayerEffect,
} from "@/components/planning/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-sol";
const MODEL_CACHE_TTL = 5 * 60 * 1_000;
let modelCache: { expiresAt: number; models: string[] } | undefined;
const effects = [
  "none",
  "shadow",
  "soft-shadow",
  "blur",
  "grayscale",
  "text-shadow",
] as const satisfies readonly LayerEffect[];
const iconInstances = [
  "HomeIcon",
  "FavoriteIcon",
  "SettingsIcon",
  "SearchIcon",
  "PersonIcon",
  "GroupIcon",
  "MenuIcon",
  "CheckIcon",
  "ArrowForwardIcon",
  "EmailIcon",
  "PhoneIcon",
  "CalendarIcon",
  "ClockIcon",
  "NotificationsIcon",
  "ImageIcon",
  "LinkIcon",
  "ShoppingCartIcon",
  "BookmarkIcon",
  "LocationIcon",
  "InfoIcon",
  "StarIcon",
] as const;

const screenSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "page", "elements"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 80 },
    page: {
      type: "object",
      additionalProperties: false,
      required: ["name", "width", "height", "backgroundColor"],
      properties: {
        name: { type: "string", minLength: 1, maxLength: 60 },
        width: { type: "number", minimum: 600, maximum: 1440 },
        height: { type: "number", minimum: 480, maximum: 1600 },
        backgroundColor: { type: "string", minLength: 1, maxLength: 40 },
      },
    },
    elements: {
      type: "array",
      minItems: 4,
      maxItems: 32,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "kind",
          "text",
          "x",
          "y",
          "width",
          "height",
          "fontSize",
          "lineHeight",
          "fontWeight",
          "color",
          "backgroundColor",
          "borderColor",
          "borderWidth",
          "opacity",
          "borderRadius",
          "textAlign",
          "effect",
          "iconInstance",
          "iconSize",
        ],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 60 },
          kind: {
            type: "string",
            enum: ["section", "layer", "text", "image", "button", "icon"],
          },
          text: { type: "string", maxLength: 500 },
          x: { type: "number", minimum: 0, maximum: 1440 },
          y: { type: "number", minimum: 0, maximum: 1600 },
          width: { type: "number", minimum: 16, maximum: 1440 },
          height: { type: "number", minimum: 16, maximum: 1600 },
          fontSize: { type: "number", minimum: 8, maximum: 96 },
          lineHeight: { type: "number", minimum: 0.8, maximum: 3 },
          fontWeight: { type: "number", minimum: 100, maximum: 900 },
          color: { type: "string", minLength: 1, maxLength: 40 },
          backgroundColor: { type: "string", minLength: 1, maxLength: 40 },
          borderColor: { type: "string", minLength: 1, maxLength: 40 },
          borderWidth: { type: "number", minimum: 0, maximum: 12 },
          opacity: { type: "number", minimum: 0.05, maximum: 1 },
          borderRadius: { type: "number", minimum: 0, maximum: 999 },
          textAlign: {
            type: "string",
            enum: ["left", "center", "right"],
          },
          effect: { type: "string", enum: effects },
          iconInstance: { type: "string", enum: iconInstances },
          iconSize: { type: "number", minimum: 12, maximum: 96 },
        },
      },
    },
  },
} as const;

type OpenAIResponse = {
  output_text?: string;
  output?: {
    content?: { type?: string; text?: string }[];
  }[];
};

type OpenAIErrorResponse = {
  error?: { message?: unknown };
};

type OpenAIModelList = {
  data?: { id?: unknown }[];
};

const excludedModelFragments = [
  "audio",
  "codex",
  "embedding",
  "image",
  "moderation",
  "realtime",
  "search-preview",
  "transcribe",
  "tts",
];

function supportsScreenGeneration(model: string) {
  const normalized = model.toLowerCase();
  if (excludedModelFragments.some((fragment) => normalized.includes(fragment)))
    return false;
  return (
    normalized === "chat-latest" ||
    normalized.startsWith("gpt-5") ||
    normalized.startsWith("gpt-4.1") ||
    normalized.startsWith("gpt-4o")
  );
}

function compareModels(left: string, right: string) {
  if (left === DEFAULT_MODEL) return -1;
  if (right === DEFAULT_MODEL) return 1;
  return right.localeCompare(left, "en", { numeric: true });
}

async function loadModels(apiKey: string) {
  if (modelCache && modelCache.expiresAt > Date.now()) return modelCache.models;

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("OPENAI_MODEL_LIST_FAILED");

  const result = (await response.json()) as OpenAIModelList;
  const models = Array.from(
    new Set([
      DEFAULT_MODEL,
      ...(result.data ?? [])
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string")
        .filter(supportsScreenGeneration),
    ]),
  ).sort(compareModels);
  modelCache = { expiresAt: Date.now() + MODEL_CACHE_TTL, models };
  return models;
}

function isValidModelId(model: string) {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(model);
}

function supportsReasoning(model: string) {
  return model.startsWith("gpt-5");
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function normalizeElement(
  element: GeneratedElement,
  pageWidth: number,
  pageHeight: number,
): GeneratedElement {
  const width = clamp(element.width, 16, pageWidth);
  const height = clamp(element.height, 16, pageHeight);
  return {
    ...element,
    name: element.name.trim().slice(0, 60) || "AI Layer",
    text: element.text.slice(0, 500),
    x: clamp(element.x, 0, Math.max(0, pageWidth - width)),
    y: clamp(element.y, 0, Math.max(0, pageHeight - height)),
    width,
    height,
    fontSize: clamp(element.fontSize, 8, 96),
    lineHeight: clamp(element.lineHeight, 0.8, 3),
    fontWeight: clamp(element.fontWeight, 100, 900),
    opacity: clamp(element.opacity, 0.05, 1),
    borderWidth: clamp(element.borderWidth, 0, 12),
    borderRadius: clamp(element.borderRadius, 0, 999),
    iconSize: clamp(element.iconSize, 12, 96),
  };
}

function normalizeScreen(screen: GeneratedScreen): GeneratedScreen {
  const width = clamp(screen.page.width, 600, 1440);
  const height = clamp(screen.page.height, 480, 1600);
  return {
    title: screen.title.trim().slice(0, 80) || "AI 화면",
    page: {
      name: screen.page.name.trim().slice(0, 60) || "AI Page",
      width,
      height,
      backgroundColor: screen.page.backgroundColor,
    },
    elements: screen.elements
      .slice(0, 32)
      .map((element) => normalizeElement(element, width, height)),
  };
}

function responseText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text ?? "")
    .join("");
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({
      models: [DEFAULT_MODEL],
      defaultModel: DEFAULT_MODEL,
      warning: "서버에 OPENAI_API_KEY를 설정해주세요.",
    });
  }

  try {
    const models = await loadModels(apiKey);
    return Response.json({ models, defaultModel: DEFAULT_MODEL });
  } catch {
    return Response.json({
      models: [DEFAULT_MODEL],
      defaultModel: DEFAULT_MODEL,
      warning: "OpenAI 모델 목록을 불러오지 못해 기본 모델을 사용합니다.",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: unknown;
      model?: unknown;
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 2_000) {
      return Response.json(
        { error: "화면 요청은 1~2,000자로 입력해주세요." },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "서버에 OPENAI_API_KEY를 설정해주세요." },
        { status: 503 },
      );
    }

    const model =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : DEFAULT_MODEL;
    if (!isValidModelId(model)) {
      return Response.json(
        { error: "올바르지 않은 OpenAI 모델 ID입니다." },
        { status: 400 },
      );
    }
    const availableModels = await loadModels(apiKey);
    if (!availableModels.includes(model)) {
      return Response.json(
        { error: `${model} 모델은 현재 API 키로 사용할 수 없습니다.` },
        { status: 400 },
      );
    }

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        ...(supportsReasoning(model)
          ? { reasoning: { effort: "medium" } }
          : {}),
        max_output_tokens: 12_000,
        instructions: [
          "You are a senior product UI designer creating one editable desktop screen.",
          "Return a polished, coherent layout using the provided structured schema.",
          "Use the same language as the user's request for visible copy.",
          "Keep every element fully inside the page and avoid accidental overlaps.",
          "Use section/layer elements as background panels and place them before foreground text, buttons, images, and icons so z-order is correct.",
          "Use 10 to 24 elements when the request does not specify complexity.",
          "For image elements, design tasteful image placeholders using backgroundColor; do not invent URLs.",
          "Use borderWidth 0 when an element should have no visible border.",
          "For irrelevant fields, provide sensible neutral values required by the schema.",
        ].join("\n"),
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "planning_board_screen",
            strict: true,
            schema: screenSchema,
          },
          ...(supportsReasoning(model) ? { verbosity: "low" } : {}),
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!openAIResponse.ok) {
      const status = openAIResponse.status;
      const errorResponse = (await openAIResponse
        .json()
        .catch(() => ({}))) as OpenAIErrorResponse;
      const detail =
        typeof errorResponse.error?.message === "string"
          ? errorResponse.error.message.trim()
          : "";
      const error =
        status === 401
          ? "OpenAI API 키가 올바르지 않습니다."
          : status === 403
            ? `${model} 모델 접근 권한을 확인해주세요.`
            : status === 429
              ? detail || "OpenAI API 사용량 또는 요청 한도를 확인해주세요."
              : detail || "OpenAI에서 화면을 생성하지 못했습니다.";
      return Response.json({ error }, { status: status === 429 ? 429 : 502 });
    }

    const response = (await openAIResponse.json()) as OpenAIResponse;
    const output = responseText(response);
    if (!output) {
      return Response.json(
        { error: "AI가 화면 설계 결과를 반환하지 않았습니다." },
        { status: 502 },
      );
    }

    const screen = normalizeScreen(JSON.parse(output) as GeneratedScreen);
    return Response.json({ screen, model });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "AI 화면 생성 시간이 초과되었습니다. 다시 시도해주세요."
        : "AI 화면 생성 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
