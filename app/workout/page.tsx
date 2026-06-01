"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Exercise = {
  name: string;
  note: string;
  reps: string;
  rest: string;
  sets: number;
};

type ProgramData = {
  todayWorkout: {
    exercises: Exercise[];
    focus: string;
    warmup: string;
  };
};

type WarmupScreenProps = {
  onComplete: () => void;
  warmup: string;
};

type ExerciseScreenProps = {
  exercise: Exercise;
  exerciseIndex: number;
  onCompleteSet: () => void;
  onSkip: () => void;
  setIndex: number;
  totalExercises: number;
};

type RestScreenProps = {
  exercise: Exercise;
  onSkip: () => void;
  remainingSeconds: number;
  setIndex: number;
};

type CompleteScreenProps = {
  completedExercises: number;
  elapsedTime: string;
  onBack: () => void;
  totalSets: number;
};

type StatCardProps = {
  label: string;
  value: string;
};

type WorkoutState =
  | { type: "warmup" }
  | { exerciseIndex: number; setIndex: number; type: "exercise" }
  | { exerciseIndex: number; remainingSeconds: number; setIndex: number; type: "rest" }
  | { type: "complete" };

function parseRestSeconds(rest: string) {
  const match = rest.match(/(\d+)/);
  return match ? Number(match[1]) : 60;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}초`;
  }

  return `${minutes}분 ${seconds}초`;
}

export default function WorkoutPage() {
  const router = useRouter();
  const [program, setProgram] = useState<ProgramData | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [state, setState] = useState<WorkoutState>({ type: "warmup" });

  useEffect(() => {
    const savedProgram = window.localStorage.getItem("traiq_program");

    if (!savedProgram) {
      router.replace("/");
      return;
    }

    try {
      setProgram(JSON.parse(savedProgram) as ProgramData);
      setStartTime(Date.now());
    } catch {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (state.type !== "rest") {
      return;
    }

    const interval = window.setInterval(() => {
      setState((current) => {
        if (current.type !== "rest") {
          return current;
        }

        if (current.remainingSeconds <= 1) {
          return {
            type: "exercise",
            exerciseIndex: current.exerciseIndex,
            setIndex: current.setIndex,
          };
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state.type]);

  const exercises = useMemo(() => program?.todayWorkout.exercises ?? [], [program]);
  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
    [exercises],
  );
  const elapsedTime = useMemo(() => {
    if (!startTime || state.type !== "complete") {
      return "0초";
    }

    return formatDuration(Date.now() - startTime);
  }, [startTime, state.type]);

  if (!program) {
    return <main className="min-h-screen bg-transparent" />;
  }

  const currentExercise =
    state.type === "exercise" || state.type === "rest"
      ? exercises[state.exerciseIndex]
      : null;

  const handleWarmupComplete = () => {
    if (!exercises.length) {
      setState({ type: "complete" });
      return;
    }

    setState({ type: "exercise", exerciseIndex: 0, setIndex: 0 });
  };

  const moveToNextExercise = (exerciseIndex: number) => {
    const nextExerciseIndex = exerciseIndex + 1;

    if (nextExerciseIndex >= exercises.length) {
      setState({ type: "complete" });
      return;
    }

    setState({ type: "exercise", exerciseIndex: nextExerciseIndex, setIndex: 0 });
  };

  const handleSetComplete = () => {
    if (state.type !== "exercise") {
      return;
    }

    const exercise = exercises[state.exerciseIndex];

    if (!exercise) {
      setState({ type: "complete" });
      return;
    }

    const nextSetIndex = state.setIndex + 1;

    if (nextSetIndex >= exercise.sets) {
      moveToNextExercise(state.exerciseIndex);
      return;
    }

    setState({
      type: "rest",
      exerciseIndex: state.exerciseIndex,
      setIndex: nextSetIndex,
      remainingSeconds: parseRestSeconds(exercise.rest),
    });
  };

  const handleSkipExercise = () => {
    if (state.type !== "exercise") {
      return;
    }

    moveToNextExercise(state.exerciseIndex);
  };

  const handleSkipRest = () => {
    if (state.type !== "rest") {
      return;
    }

    setState({
      type: "exercise",
      exerciseIndex: state.exerciseIndex,
      setIndex: state.setIndex,
    });
  };

  const handleClose = () => {
    const shouldLeave = window.confirm("운동을 중단하시겠어요?");

    if (shouldLeave) {
      router.push("/main");
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-[#C8CDD5] sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col rounded-[32px] border border-[#2A2A3E] bg-[#1A1A2E]/94 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-[#2A2A3E] px-4 py-2 text-sm font-semibold text-[#8892A0] transition hover:border-[#B8F2E6] hover:text-white"
          >
            닫기 X
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#AEF78E]">
            TRAIQ Workout Mode
          </p>
        </div>

        {state.type === "warmup" ? (
          <WarmupScreen
            warmup={program.todayWorkout.warmup}
            onComplete={handleWarmupComplete}
          />
        ) : null}

        {state.type === "exercise" && currentExercise ? (
          <ExerciseScreen
            exercise={currentExercise}
            exerciseIndex={state.exerciseIndex}
            setIndex={state.setIndex}
            totalExercises={exercises.length}
            onCompleteSet={handleSetComplete}
            onSkip={handleSkipExercise}
          />
        ) : null}

        {state.type === "rest" && currentExercise ? (
          <RestScreen
            exercise={currentExercise}
            setIndex={state.setIndex}
            remainingSeconds={state.remainingSeconds}
            onSkip={handleSkipRest}
          />
        ) : null}

        {state.type === "complete" ? (
          <CompleteScreen
            completedExercises={exercises.length}
            elapsedTime={elapsedTime}
            totalSets={totalSets}
            onBack={() => router.push("/main")}
          />
        ) : null}
      </div>
    </main>
  );
}

function WarmupScreen({
  warmup,
  onComplete,
}: WarmupScreenProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-between gap-8 text-center">
      <div className="mt-6">
        <p className="mb-3 inline-flex rounded-full border border-[#2A2A3E] bg-[#16213E] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B8F2E6]">
          준비운동
        </p>
        <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">{warmup}</h1>
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-2xl bg-[#AEF78E] px-6 py-5 text-lg font-black text-black transition hover:-translate-y-0.5 hover:bg-[#c0fb9d]"
      >
        완료, 운동 시작
      </button>
    </section>
  );
}

function ExerciseScreen({
  exercise,
  exerciseIndex,
  onCompleteSet,
  onSkip,
  setIndex,
  totalExercises,
}: ExerciseScreenProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-between gap-8 text-center">
      <div className="w-full">
        <p className="text-sm font-semibold text-[#AEF78E]">
          운동 {exerciseIndex + 1}/{totalExercises} · 세트 {setIndex + 1}/{exercise.sets}
        </p>
        <h1 className="mt-8 text-5xl font-black text-white sm:text-6xl">{exercise.name}</h1>
        <p className="mt-4 text-2xl font-bold text-[#C8CDD5]">
          {exercise.reps} × {exercise.sets}세트
        </p>
        <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#AEF78E]/40 bg-[#16213E] p-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8F2E6]">
            운동 팁
          </p>
          <p className="mt-3 text-base leading-7 text-[#C8CDD5]">{exercise.note}</p>
        </div>
      </div>

      <div className="w-full">
        <button
          type="button"
          onClick={onCompleteSet}
          className="w-full rounded-2xl bg-[#AEF78E] px-6 py-5 text-lg font-black text-black transition hover:-translate-y-0.5 hover:bg-[#c0fb9d]"
        >
          세트 완료
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="mt-4 text-sm font-semibold text-[#8892A0] underline-offset-4 transition hover:text-white hover:underline"
        >
          운동 건너뛰기
        </button>
      </div>
    </section>
  );
}

function RestScreen({
  exercise,
  onSkip,
  remainingSeconds,
  setIndex,
}: RestScreenProps) {
  const totalRest = parseRestSeconds(exercise.rest);
  const progress = Math.max((remainingSeconds / totalRest) * 100, 0);
  const radius = 92;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <section className="flex flex-1 flex-col items-center justify-between gap-8 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B8F2E6]">휴식</p>
        <div className="relative mx-auto mt-8 h-64 w-64">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
            <circle
              cx="110"
              cy="110"
              r={radius}
              stroke="#2A2A3E"
              strokeWidth="14"
              fill="none"
            />
            <circle
              cx="110"
              cy="110"
              r={radius}
              stroke="#AEF78E"
              strokeWidth="14"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-black text-white sm:text-6xl">
              {formatSeconds(remainingSeconds)}
            </p>
            <p className="mt-3 text-sm text-[#8892A0]">다음 세트 준비</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <p className="mb-4 text-sm text-[#8892A0]">
          다음: {exercise.name} 세트 {setIndex + 1}/{exercise.sets}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-2xl border border-[#2A2A3E] bg-[#16213E] px-6 py-4 text-base font-bold text-white transition hover:border-[#B8F2E6]"
        >
          건너뛰고 다음 세트로
        </button>
      </div>
    </section>
  );
}

function CompleteScreen({
  completedExercises,
  elapsedTime,
  onBack,
  totalSets,
}: CompleteScreenProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-between gap-8 text-center">
      <div className="mt-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#AEF78E] text-4xl font-black text-black">
          ✓
        </div>
        <h1 className="mt-8 text-4xl font-black text-white sm:text-5xl">오늘의 운동 완료!</h1>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-3">
        <StatCard label="완료한 운동 수" value={`${completedExercises}개`} />
        <StatCard label="총 세트 수" value={`${totalSets}세트`} />
        <StatCard label="총 운동 시간" value={elapsedTime} />
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-2xl bg-[#AEF78E] px-6 py-5 text-lg font-black text-black transition hover:-translate-y-0.5 hover:bg-[#c0fb9d]"
      >
        메인으로 돌아가기
      </button>
    </section>
  );
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-[#2A2A3E] bg-[#16213E] p-5">
      <p className="text-sm text-[#8892A0]">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
