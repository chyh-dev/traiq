"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type UserProfile = {
  age: string;
  equipment: string;
  experience: string;
  favoriteExercise: string;
  frequency: number;
  gender: string;
  height: string;
  intensity: string;
  name: string;
  purpose: string;
  weight: string;
};

type ProgramData = {
  advice: string;
  summary: string;
  supplements: {
    beforeBed: string[];
    morning: string[];
    note: string;
    postWorkout: string[];
  };
  todayDiet: {
    breakfast: { calories: number; menu: string };
    dinner: { calories: number; menu: string };
    lunch: { calories: number; menu: string };
    note: string;
    totalCalories: number;
  };
  todayWorkout: {
    exercises: Array<{
      name: string;
      note: string;
      reps: string;
      rest: string;
      sets: number;
    }>;
    focus: string;
    warmup: string;
  };
  weeklyPlan: string;
};

type MealEntry = {
  calories: number;
  menu: string;
};

type ChatMessage = {
  content: string;
  role: "assistant" | "system" | "user";
};

type AssistantApiMessage = {
  content: string;
  role: "assistant" | "user";
};

type AssistantResponse = {
  reply: string;
  updatedProgram: ProgramData | null;
};

const conditionOptions = [
  { apiValue: "good", label: "좋음" },
  { apiValue: "normal", label: "보통" },
  { apiValue: "tired", label: "피곤" },
] as const;

function getGreetingByHour() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return "좋은 아침이에요";
  }

  if (hour >= 11 && hour < 17) {
    return "좋은 하루예요";
  }

  if (hour >= 17 && hour < 22) {
    return "좋은 저녁이에요";
  }

  return "오늘도 수고했어요";
}

export default function MainPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [condition, setCondition] =
    useState<(typeof conditionOptions)[number]["apiValue"]>("normal");
  const [injuryMemo, setInjuryMemo] = useState("");
  const [input, setInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [program, setProgram] = useState<ProgramData | null>(null);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem("traiq_user_profile");
    const savedProgram = window.localStorage.getItem("traiq_program");

    if (!savedProfile || !savedProgram) {
      router.replace("/");
      return;
    }

    try {
      setProfile(JSON.parse(savedProfile) as UserProfile);
      setProgram(JSON.parse(savedProgram) as ProgramData);
    } catch {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isSending]);

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "long",
    }).format(new Date());
  }, []);

  const greetingText = useMemo(() => getGreetingByHour(), []);
  const welcomeMessage = useMemo(() => {
    if (!profile) {
      return "";
    }

    return `안녕하세요 ${profile.name}님! 저는 TRAIQ 트레이너예요. 오늘의 운동이나 식단에 대해 궁금한 점이 있거나, 프로그램을 수정하고 싶다면 편하게 말해주세요.\n예: '벤치프레스 말고 인클라인으로 바꿔줘', '오늘 어깨가 좀 뻐근한데 운동 조절 가능해?'`;
  }, [profile]);

  const hasRecoveryInput = condition !== "normal" || Boolean(injuryMemo.trim());
  const recoveryHint = hasRecoveryInput
    ? "현재 컨디션·부상 정보를 반영해 다시 만들어요"
    : "기본 프로필로 다시 만들어요";

  const handleRegenerate = async () => {
    if (!profile) {
      return;
    }

    setError(null);
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/generate-program", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profile,
          condition,
          injuryNote: injuryMemo.trim(),
        }),
      });

      const result = (await response.json()) as ProgramData & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "프로그램 재생성에 실패했습니다.");
      }

      window.localStorage.setItem("traiq_program", JSON.stringify(result));
      setProgram(result);
      setChatHistory((current) => [
        ...current,
        {
          role: "system",
          content: "컨디션과 부상 정보를 반영해 프로그램을 새로 만들었어요",
        },
      ]);
      setIsRefreshing(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "알 수 없는 오류가 발생했습니다.",
      );
      setIsRefreshing(false);
    }
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input.trim() || !profile || !program || isSending) {
      return;
    }

    const userContent = input.trim();
    const nextHistory: ChatMessage[] = [...chatHistory, { role: "user", content: userContent }];

    setChatHistory(nextHistory);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userContent,
          userProfile: profile,
          currentProgram: program,
          chatHistory: nextHistory
            .filter((messageItem) => messageItem.role !== "system")
            .map(
              (messageItem): AssistantApiMessage => ({
                role: messageItem.role === "assistant" ? "assistant" : "user",
                content: messageItem.content,
              }),
            ),
        }),
      });

      const result = (await response.json()) as AssistantResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "어시스턴트 응답에 실패했습니다.");
      }

      setChatHistory((current) => [
        ...current,
        { role: "assistant", content: result.reply },
        ...(result.updatedProgram
          ? [{ role: "system" as const, content: "프로그램이 업데이트되었어요." }]
          : []),
      ]);

      if (result.updatedProgram) {
        window.localStorage.setItem("traiq_program", JSON.stringify(result.updatedProgram));
        setProgram(result.updatedProgram);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "알 수 없는 오류가 발생했습니다.";

      setChatHistory((current) => [
        ...current,
        { role: "assistant", content: `문제가 생겼어요. ${message}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!profile || !program) {
    return <main className="min-h-screen bg-transparent" />;
  }

  const subline = `${profile.purpose} 모드 · 강도 ${profile.intensity} · ${profile.experience} · 주 ${profile.frequency}회 · ${profile.equipment}`;
  const progressCurrent = Math.min(profile.frequency, 3);
  const progressPercent = Math.round((progressCurrent / profile.frequency) * 100);
  const meals: Array<[string, MealEntry]> = [
    ["아침", program.todayDiet.breakfast],
    ["점심", program.todayDiet.lunch],
    ["저녁", program.todayDiet.dinner],
  ];

  return (
    <main className="min-h-screen bg-transparent px-4 pb-[29rem] pt-6 text-[#C8CDD5] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[#2A2A3E] bg-[#1A1A2E]/88 px-5 py-5 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-3xl font-black tracking-[0.28em] text-[#AEF78E]">TRAIQ</p>
              <p className="mt-2 text-sm text-[#8892A0]">AI Personal Training, Reimagined</p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-lg font-bold text-white">
                {profile.name}님, {greetingText}
              </p>
              <p className="mt-2 text-sm text-[#8892A0]">{subline}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-[#C8CDD5]">{program.summary}</p>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="flex items-center gap-2 text-xs text-[#8892A0]">
                {hasRecoveryInput ? (
                  <span className="h-2 w-2 rounded-full bg-[#AEF78E]" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-[#3B4154]" />
                )}
                <span className={hasRecoveryInput ? "text-[#B8F2E6]" : ""}>{recoveryHint}</span>
              </p>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRefreshing}
                className="rounded-2xl bg-[#FF6B35] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff7f52] disabled:cursor-not-allowed disabled:bg-[#7A4A38]"
              >
                {isRefreshing ? "AI가 새 프로그램을 만들고 있어요..." : "다시 생성"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-[#FF6B35]/40 bg-[#FF6B35]/10 p-4 text-sm text-[#FFD3C4]">
              {error}
            </div>
          ) : null}
        </header>

        <section className="flex flex-col gap-4 rounded-[28px] border border-[#2A2A3E] bg-[#16213E]/72 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="mb-2 inline-flex rounded-full border border-[#2A2A3E] bg-[#1A1A2E] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#B8F2E6]">
              Today&apos;s Focus
            </p>
            <h1 className="text-3xl font-black text-white sm:text-4xl">오늘의 운동</h1>
            <p className="mt-2 text-sm text-[#8892A0]">{todayLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/workout")}
            className="inline-flex items-center justify-center rounded-2xl bg-[#AEF78E] px-6 py-3 text-base font-black text-black transition hover:-translate-y-0.5 hover:bg-[#c0fb9d]"
          >
            운동 시작
          </button>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <DashboardCard eyebrow="Workout Plan" title="오늘의 운동">
              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4">
                <p className="text-sm font-semibold text-[#B8F2E6]">준비운동</p>
                <p className="mt-2 text-sm leading-6 text-[#C8CDD5]">
                  {program.todayWorkout.warmup}
                </p>
              </div>

              <div className="space-y-3">
                {program.todayWorkout.exercises.map((exercise) => (
                  <div
                    key={`${exercise.name}-${exercise.sets}-${exercise.reps}`}
                    className="rounded-2xl border border-[#2A2A3E] bg-[#16213E]/90 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base font-bold text-white">{exercise.name}</p>
                      <p className="text-sm text-[#AEF78E]">{exercise.rest} 휴식</p>
                    </div>
                    <p className="mt-2 text-sm text-[#C8CDD5]">
                      {exercise.reps} · {exercise.sets}세트
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#8892A0]">{exercise.note}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4">
                <p className="text-sm font-semibold text-[#B8F2E6]">중점사항</p>
                <p className="mt-2 text-sm leading-6 text-[#C8CDD5]">
                  {program.todayWorkout.focus}
                </p>
              </div>
            </DashboardCard>

            <DashboardCard eyebrow="Nutrition" title="오늘의 식단">
              <div className="space-y-3">
                {meals.map(([label, meal]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#2A2A3E] bg-[#16213E]/90 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-sm font-semibold text-[#AEF78E]">
                        {meal.calories} kcal
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#C8CDD5]">{meal.menu}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">총 칼로리</p>
                  <p className="text-lg font-black text-[#FF6B35]">
                    {program.todayDiet.totalCalories} kcal
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#8892A0]">{program.todayDiet.note}</p>
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-6">
            <DashboardCard eyebrow="Supplements" title="영양제">
              <SupplementGroup label="아침" items={program.supplements.morning} />
              <SupplementGroup label="운동 후" items={program.supplements.postWorkout} />
              <SupplementGroup label="자기 전" items={program.supplements.beforeBed} />
              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4 text-sm leading-6 text-[#8892A0]">
                {program.supplements.note}
              </div>
            </DashboardCard>

            <DashboardCard eyebrow="AI Advice" title="AI 조언">
              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4 text-sm leading-7 whitespace-pre-line text-[#C8CDD5]">
                {program.advice}
              </div>
              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4 text-sm leading-7 whitespace-pre-line text-[#8892A0]">
                {program.weeklyPlan}
              </div>
            </DashboardCard>

            <DashboardCard eyebrow="Recovery" title="회복 & 컨디션">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">오늘의 컨디션</p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {conditionOptions.map((option) => (
                      <button
                        key={option.apiValue}
                        type="button"
                        onClick={() => setCondition(option.apiValue)}
                        className={[
                          "rounded-2xl border px-4 py-3 text-sm font-bold transition",
                          condition === option.apiValue
                            ? "border-[#AEF78E] bg-[#AEF78E] text-black"
                            : "border-[#2A2A3E] bg-[#16213E] text-[#C8CDD5] hover:border-[#B8F2E6] hover:text-white",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">부상 부위 메모</p>
                  <textarea
                    value={injuryMemo}
                    onChange={(event) => setInjuryMemo(event.target.value)}
                    placeholder="불편한 부위가 있다면 적어주세요."
                    rows={4}
                    className="mt-3 w-full resize-none rounded-2xl border border-[#2A2A3E] bg-[#16213E] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6F7885] focus:border-[#AEF78E] focus:ring-2 focus:ring-[#AEF78E]/30"
                  />
                </div>
              </div>
            </DashboardCard>

            <DashboardCard eyebrow="Weekly Progress" title="이번 주 진행률">
              <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">
                    주 {profile.frequency}회 중 {progressCurrent}회 완료
                  </p>
                  <p className="text-sm font-black text-[#AEF78E]">{progressPercent}%</p>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#0F1419]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#AEF78E] to-[#B8F2E6]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </DashboardCard>
          </div>
        </section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 px-4 pb-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="pointer-events-auto rounded-[28px] border border-[#2A2A3E] bg-[#1A1A2E]/96 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
              {welcomeMessage ? <ChatBubble role="assistant" content={welcomeMessage} /> : null}
              {chatHistory.map((message, index) => (
                <ChatBubble
                  key={`${message.role}-${index}-${message.content.slice(0, 16)}`}
                  role={message.role}
                  content={message.content}
                />
              ))}
              {isSending ? <TypingBubble /> : null}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="AI에게 물어보세요"
                className="w-full rounded-2xl border border-[#2A2A3E] bg-[#16213E] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6F7885] focus:border-[#AEF78E] focus:ring-2 focus:ring-[#AEF78E]/30"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="rounded-2xl bg-[#FF6B35] px-5 py-3 text-sm font-black text-white transition hover:bg-[#ff7f52] disabled:cursor-not-allowed disabled:bg-[#7A4A38]"
              >
                보내기
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function ChatBubble({ content, role }: ChatMessage) {
  const isUser = role === "user";
  const isSystem = role === "system";

  return (
    <div className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-line",
          isUser
            ? "bg-[#AEF78E] text-black"
            : isSystem
              ? "border border-[#AEF78E]/30 bg-[#AEF78E]/10 text-[#B8F2E6]"
              : "border border-[#2A2A3E] bg-[#16213E] text-[#C8CDD5]",
        ].join(" ")}
      >
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E] px-4 py-3 text-sm text-[#C8CDD5]">
        <span>트레이너가 답변 중</span>
        <span className="inline-flex">
          <span className="animate-pulse">.</span>
          <span className="animate-pulse [animation-delay:0.2s]">.</span>
          <span className="animate-pulse [animation-delay:0.4s]">.</span>
        </span>
      </div>
    </div>
  );
}

function SupplementGroup({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="rounded-2xl border border-[#2A2A3E] bg-[#16213E]/90 p-4">
      <p className="text-sm font-semibold text-[#B8F2E6]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#2A2A3E] bg-[#1A1A2E] px-3 py-1 text-xs font-semibold text-[#C8CDD5]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

type DashboardCardProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
};

function DashboardCard({ children, eyebrow, title }: DashboardCardProps) {
  return (
    <section className="rounded-[28px] border border-[#2A2A3E] bg-[#1A1A2E]/94 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.24)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#AEF78E]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
