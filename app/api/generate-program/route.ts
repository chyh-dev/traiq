import OpenAI from "openai";
import { NextResponse } from "next/server";

const fallbackModels = ["gpt-4.1-mini", "claude-haiku-4-5"] as const;

type UserProfile = {
  age: string;
  condition?: "good" | "normal" | "tired";
  equipment: string;
  experience: string;
  favoriteExercise?: string;
  frequency: number;
  gender: string;
  height: string;
  injuryNote?: string;
  intensity: string;
  name?: string;
  purpose: string;
  weight: string;
};

function conditionToKorean(condition?: UserProfile["condition"]) {
  switch (condition) {
    case "good":
      return "좋음";
    case "tired":
      return "피곤";
    case "normal":
    default:
      return "보통";
  }
}

function buildPrompt(profile: UserProfile) {
  const profileLines = [
    "사용자 프로필",
    `- 이름: ${profile.name?.trim() || "미지정"}`,
    `- 연령: ${profile.age}`,
    `- 성별: ${profile.gender}`,
    `- 키: ${profile.height}cm`,
    `- 몸무게: ${profile.weight}kg`,
    `- 운동 목적: ${profile.purpose}`,
    `- 운동 강도: ${profile.intensity}`,
    `- 운동 경력: ${profile.experience}`,
    `- 운동 빈도: 주 ${profile.frequency}회`,
    `- 보유 장비: ${profile.equipment}`,
    `- 즐겨하는 운동: ${profile.favoriteExercise?.trim() || "없음"}`,
  ];

  if (profile.condition || profile.injuryNote) {
    profileLines.push(
      "",
      `오늘 사용자의 컨디션: ${conditionToKorean(profile.condition)}`,
      `부상 또는 불편 부위: ${profile.injuryNote?.trim() || "없음"}`,
      "",
      "이 정보를 반영해서 프로그램을 조정해주세요:",
      "- 컨디션이 '피곤'이면 강도를 한 단계 낮추고 세트 수 줄이기",
      "- 부상 부위가 있으면 해당 부위에 무리가 가는 운동은 대체 운동으로 변경하거나 강도 낮추기",
      "- 단, 전체적인 운동 목적과 방향은 유지",
    );
  }

  profileLines.push(
    "",
    "다음 JSON 형식으로 응답해줘.",
    JSON.stringify(
      {
        summary: "한 줄 요약",
        todayWorkout: {
          warmup: "준비운동 한 줄",
          exercises: [
            {
              name: "운동명",
              sets: 4,
              reps: "8-10",
              rest: "90초",
              note: "한 줄 팁",
            },
          ],
          focus: "오늘의 중점사항 한 줄",
        },
        todayDiet: {
          breakfast: { menu: "메뉴", calories: 500 },
          lunch: { menu: "메뉴", calories: 700 },
          dinner: { menu: "메뉴", calories: 600 },
          totalCalories: 1800,
          note: "목적에 맞는 한 줄 코멘트",
        },
        supplements: {
          morning: ["오메가3", "비타민D"],
          postWorkout: ["웨이 프로틴"],
          beforeBed: ["마그네슘"],
          note: "복용 시 주의사항 한 줄",
        },
        weeklyPlan: "이번 주 전체 흐름 2-3줄 요약",
        advice: "사용자 프로필에 맞는 개인화된 조언 2-3줄",
      },
      null,
      2,
    ),
  );

  return profileLines.join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;

  if (!apiKey) {
    return NextResponse.json({ error: "API 키 누락" }, { status: 500 });
  }

  if (!baseURL) {
    return NextResponse.json({ error: "Base URL 누락" }, { status: 500 });
  }

  const profile = (await request.json()) as UserProfile;

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const systemMessage = [
    "당신은 전문 트레이너이자 영양사입니다. 사용자 프로필을 받아 그날 즉시 실행 가능한 맞춤형 운동 프로그램, 식단, 영양제 추천을 JSON 형식으로 생성합니다. 모든 출력은 한국어로 합니다.",
    profile.name?.trim()
      ? `사용자 이름: ${profile.name.trim()}님 (대화 시 자연스럽게 이름을 부르며 답변)`
      : "사용자 이름: 미지정",
    "이름은 너무 자주 부르지 말고 자연스럽게 사용할 것",
  ].join("\n");
  const userMessage = buildPrompt(profile);
  const errors: Array<{ message: string; model: string }> = [];

  for (const model of fallbackModels) {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
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
            : "프로그램 생성 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  return NextResponse.json(
    {
      error: "프로그램 생성에 실패했습니다.",
      details: errors,
    },
    { status: 500 },
  );
}
