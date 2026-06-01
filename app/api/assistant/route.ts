import OpenAI from "openai";
import { NextResponse } from "next/server";

const fallbackModels = ["gpt-4.1-mini", "claude-haiku-4-5"] as const;

type AssistantRequest = {
  chatHistory: Array<{ content: string; role: "assistant" | "user" }>;
  currentProgram: unknown;
  message: string;
  userProfile: { name?: string } | unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;

  if (!apiKey) {
    return NextResponse.json({ error: "API 키 누락" }, { status: 500 });
  }

  if (!baseURL) {
    return NextResponse.json({ error: "Base URL 누락" }, { status: 500 });
  }

  const body = (await request.json()) as AssistantRequest;
  const userName =
    body.userProfile &&
    typeof body.userProfile === "object" &&
    "name" in body.userProfile &&
    typeof body.userProfile.name === "string"
      ? body.userProfile.name
      : "";

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const systemMessage = [
    "당신은 TRAIQ의 AI 트레이너입니다. 사용자의 프로필과 현재 운동 프로그램을 알고 있으며, 사용자의 질문이나 요청에 답하거나 프로그램을 수정할 수 있습니다.",
    userName
      ? `사용자 이름: ${userName}님 (대화 시 자연스럽게 이름을 부르며 답변)`
      : "사용자 이름: 미지정",
    "",
    `사용자 프로필: ${JSON.stringify(body.userProfile)}`,
    `현재 프로그램: ${JSON.stringify(body.currentProgram)}`,
    "",
    "규칙:",
    "- 답변은 한국어로, 친근하고 간결하게 (3-5문장 이내)",
    "- 프로그램 수정 요청이 들어오면, 응답에 'updatedProgram' 필드를 포함",
    "- 단순 질문이면 'updatedProgram'은 null",
    "- 이름은 너무 자주 부르지 말고 자연스럽게 사용할 것",
    "- 항상 다음 JSON 형식으로 응답:",
    JSON.stringify(
      {
        reply: "사용자에게 보여줄 답변",
        updatedProgram: null,
      },
      null,
      2,
    ),
  ].join("\n");

  const messages = [
    { role: "system" as const, content: systemMessage },
    ...body.chatHistory.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user" as const, content: body.message },
  ];

  const errors: Array<{ message: string; model: string }> = [];

  for (const model of fallbackModels) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error("모델 응답이 비어 있습니다.");
      }

      return NextResponse.json(JSON.parse(content));
    } catch (error) {
      errors.push({
        model,
        message:
          error instanceof Error
            ? error.message
            : "어시스턴트 응답 생성 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  return NextResponse.json(
    {
      error: "어시스턴트 응답 생성에 실패했습니다.",
      details: errors,
    },
    { status: 500 },
  );
}
