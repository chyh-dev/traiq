"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

const purposeOptions = [
  "다이어트",
  "벌크업",
  "스트렝스 강화",
  "근비대",
  "체력 향상",
] as const;

const experienceOptions = ["입문", "초급", "중급", "상급"] as const;
const equipmentOptions = ["헬스장", "홈트", "맨몸"] as const;
const genderOptions = ["남", "여"] as const;
const intensityOptions = ["저", "중", "고"] as const;

const loadingMessages = [
  "분석 중...",
  "운동 설계 중...",
  "식단 구성 중...",
  "마지막 점검 중...",
] as const;

type ProfileForm = {
  age: string;
  equipment: (typeof equipmentOptions)[number] | "";
  experience: (typeof experienceOptions)[number] | "";
  favoriteExercise: string;
  frequency: number;
  gender: (typeof genderOptions)[number] | "";
  height: string;
  intensity: (typeof intensityOptions)[number] | "";
  name: string;
  purpose: (typeof purposeOptions)[number] | "";
  weight: string;
};

type GenerateProgramResponse = {
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

const initialForm: ProfileForm = {
  age: "",
  equipment: "",
  experience: "",
  favoriteExercise: "",
  frequency: 3,
  gender: "",
  height: "",
  intensity: "",
  name: "",
  purpose: "",
  weight: "",
};

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingMessages.length);
    }, 3500);

    return () => window.clearInterval(interval);
  }, [isGenerating]);

  const isValid = useMemo(() => {
    return Boolean(
      form.name &&
        form.age &&
        form.gender &&
        form.height &&
        form.weight &&
        form.purpose &&
        form.intensity &&
        form.experience &&
        form.equipment,
    );
  }, [form]);

  const handleTextChange =
    (key: keyof Pick<ProfileForm, "name" | "age" | "height" | "weight" | "favoriteExercise">) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const handleSubmit = async () => {
    if (!isValid) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    window.localStorage.setItem("traiq_user_profile", JSON.stringify(form));

    try {
      const response = await fetch("/api/generate-program", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = (await response.json()) as GenerateProgramResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "프로그램 생성에 실패했습니다.");
      }

      window.localStorage.setItem("traiq_program", JSON.stringify(result));
      router.push("/main");
    } catch (requestError) {
      console.error("[TRAIQ] generate-program 에러", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "알 수 없는 오류가 발생했습니다.",
      );
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-10 text-[#C8CDD5] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl flex-col items-center justify-center gap-8">
        <header className="text-center">
          <p className="text-4xl font-black tracking-[0.32em] text-[#AEF78E] sm:text-5xl">
            TRAIQ
          </p>
          <p className="mt-3 text-sm text-[#8892A0] sm:text-base">
            AI Personal Training, Reimagined
          </p>
        </header>

        <section className="w-full max-w-2xl rounded-[28px] border border-[#2A2A3E] bg-[#1A1A2E]/95 p-6 shadow-[0_0_0_1px_rgba(174,247,142,0.06),0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8">
          {isGenerating ? (
            <GeneratingState message={loadingMessages[loadingIndex]} />
          ) : (
            <>
              <div className="mb-8">
                <p className="mb-3 inline-flex rounded-full border border-[#2A2A3E] bg-[#16213E] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B8F2E6]">
                  Build Your Profile
                </p>
                <h1 className="text-3xl font-bold text-white sm:text-4xl">
                  당신의 운동을 설계합니다
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#C8CDD5] sm:text-base">
                  몇 가지 정보만 알려주세요. AI가 당신만의 프로그램을 만들어드립니다.
                </p>
              </div>

              <div className="space-y-8">
                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">기본 정보</h2>
                    <p className="mt-1 text-sm text-[#8892A0]">
                      신체 정보와 기본 프로필을 입력해주세요.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <LabeledInput
                      label="이름 (또는 닉네임)"
                      type="text"
                      value={form.name}
                      onChange={handleTextChange("name")}
                      placeholder="예: 홍길동"
                    />
                    <LabeledInput
                      label="연령"
                      type="number"
                      value={form.age}
                      onChange={handleTextChange("age")}
                      placeholder="예: 29"
                    />
                    <div className="space-y-2">
                      <FieldLabel label="성별" />
                      <div className="grid grid-cols-2 gap-3">
                        {genderOptions.map((option) => (
                          <ToggleButton
                            key={option}
                            isActive={form.gender === option}
                            onClick={() =>
                              setForm((current) => ({ ...current, gender: option }))
                            }
                          >
                            {option}
                          </ToggleButton>
                        ))}
                      </div>
                    </div>
                    <LabeledInput
                      label="키 (cm)"
                      type="number"
                      value={form.height}
                      onChange={handleTextChange("height")}
                      placeholder="예: 175"
                    />
                    <LabeledInput
                      label="몸무게 (kg)"
                      type="number"
                      value={form.weight}
                      onChange={handleTextChange("weight")}
                      placeholder="예: 72"
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">운동 목표</h2>
                    <p className="mt-1 text-sm text-[#8892A0]">
                      목표와 운동 환경을 선택하면 더 맞춤형 프로그램을 만들 수 있어요.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <FieldLabel label="운동 목적" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {purposeOptions.map((option) => (
                          <SelectCard
                            key={option}
                            isActive={form.purpose === option}
                            onClick={() =>
                              setForm((current) => ({ ...current, purpose: option }))
                            }
                          >
                            {option}
                          </SelectCard>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel label="운동 강도" />
                      <div className="grid grid-cols-3 gap-3">
                        {intensityOptions.map((option) => (
                          <ToggleButton
                            key={option}
                            isActive={form.intensity === option}
                            onClick={() =>
                              setForm((current) => ({ ...current, intensity: option }))
                            }
                          >
                            {option}
                          </ToggleButton>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel label="운동 경력" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {experienceOptions.map((option) => (
                          <SelectCard
                            key={option}
                            isActive={form.experience === option}
                            onClick={() =>
                              setForm((current) => ({ ...current, experience: option }))
                            }
                          >
                            {option}
                          </SelectCard>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <FieldLabel label="운동 빈도" />
                        <span className="text-sm font-semibold text-[#AEF78E]">
                          주 {form.frequency}회
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={form.frequency}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            frequency: Number(event.target.value),
                          }))
                        }
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#16213E] accent-[#AEF78E]"
                      />
                      <div className="flex justify-between text-xs text-[#8892A0]">
                        <span>주 1회</span>
                        <span>주 7회</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel label="보유 장비" />
                      <div className="grid grid-cols-3 gap-3">
                        {equipmentOptions.map((option) => (
                          <SelectCard
                            key={option}
                            isActive={form.equipment === option}
                            onClick={() =>
                              setForm((current) => ({ ...current, equipment: option }))
                            }
                          >
                            {option}
                          </SelectCard>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">추가 정보</h2>
                    <p className="mt-1 text-sm text-[#8892A0]">
                      프로그램에 반영하고 싶은 취향이 있다면 적어주세요.
                    </p>
                  </div>

                  <LabeledInput
                    label="즐겨하는 운동"
                    type="text"
                    value={form.favoriteExercise}
                    onChange={handleTextChange("favoriteExercise")}
                    placeholder="예: 미식축구, 농구, 러닝"
                  />
                </section>
              </div>

              {error ? (
                <div className="mt-6 rounded-2xl border border-[#FF6B35]/40 bg-[#FF6B35]/10 p-4 text-sm text-[#FFD3C4]">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isValid}
                  className="w-full rounded-2xl px-5 py-4 text-base font-black transition focus:outline-none focus:ring-2 focus:ring-[#AEF78E] focus:ring-offset-2 focus:ring-offset-[#1A1A2E] disabled:cursor-not-allowed disabled:bg-[#3B4154] disabled:text-[#8892A0] enabled:bg-[#AEF78E] enabled:text-black enabled:hover:-translate-y-0.5 enabled:hover:bg-[#c0fb9d]"
                >
                  프로그램 만들기
                </button>

                {error ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full rounded-2xl border border-[#2A2A3E] bg-[#16213E] px-5 py-3 text-sm font-bold text-white transition hover:border-[#B8F2E6]"
                  >
                    다시 시도
                  </button>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function GeneratingState({
  message,
}: {
  message: (typeof loadingMessages)[number];
}) {
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#2A2A3E] border-t-[#AEF78E]" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#B8F2E6]">
        AI Program Builder
      </p>
      <h2 className="mt-3 text-3xl font-bold text-white">AI가 프로그램을 만들고 있어요...</h2>
      <p className="mt-3 text-sm text-[#8892A0]">{message}</p>
      <div className="mt-8 grid w-full max-w-md gap-3 text-left">
        {loadingMessages.map((item, index) => (
          <div
            key={item}
            className={[
              "rounded-2xl border px-4 py-3 text-sm transition",
              index === loadingMessages.indexOf(message)
                ? "border-[#AEF78E] bg-[#AEF78E]/10 text-white"
                : "border-[#2A2A3E] bg-[#16213E] text-[#8892A0]",
            ].join(" ")}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <label className="text-sm font-semibold text-white">{label}</label>;
}

type LabeledInputProps = {
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type: "number" | "text";
  value: string;
};

function LabeledInput({
  label,
  onChange,
  placeholder,
  type,
  value,
}: LabeledInputProps) {
  return (
    <div className="space-y-2">
      <FieldLabel label={label} />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#2A2A3E] bg-[#16213E] px-4 py-3 text-[#FFFFFF] outline-none transition placeholder:text-[#6F7885] focus:border-[#AEF78E] focus:ring-2 focus:ring-[#AEF78E]/30"
      />
    </div>
  );
}

type ButtonLikeProps = {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
};

function ToggleButton({ children, isActive, onClick }: ButtonLikeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-4 py-3 text-sm font-bold transition",
        isActive
          ? "border-[#AEF78E] bg-[#AEF78E] text-black"
          : "border-[#2A2A3E] bg-[#16213E] text-[#C8CDD5] hover:border-[#B8F2E6] hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SelectCard({ children, isActive, onClick }: ButtonLikeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-14 rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition",
        isActive
          ? "border-[#AEF78E] bg-[#AEF78E]/12 text-white shadow-[0_0_0_1px_rgba(174,247,142,0.18)]"
          : "border-[#2A2A3E] bg-[#16213E]/90 text-[#C8CDD5] hover:border-[#B8F2E6] hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
