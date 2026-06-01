# TRAIQ AI Workout Program Generator

TRAIQ is a Next.js app that generates personalized workout and diet guidance with AI.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- OpenAI-compatible API endpoint

## Features

- Collects a user's workout profile
- Generates a personalized workout plan
- Suggests daily meal guidance
- Returns AI-generated fitness advice through API routes

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and fill in your values:

```bash
copy .env.example .env.local
```

3. Start the development server:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Environment Variables

Set these values in `.env.local`.

```env
OPENAI_BASE_URL=your_api_base_url
OPENAI_API_KEY=your_api_key
```

## Project Structure

- `app/page.tsx`: profile input screen
- `app/main/page.tsx`: main experience page
- `app/workout/page.tsx`: workout result page
- `app/api/generate-program/route.ts`: workout program generation API
- `app/api/assistant/route.ts`: assistant API

## Notes

- `.env.local` is ignored by Git and should never be committed.
- Codex development log files are also ignored by Git.
