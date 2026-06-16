# Learning Check

A live, instructor-driven quiz app for [Lansing Tech Studio](https://lansingtechstudio.org)
workshops — like Kahoot, but it loads questions straight from a URL (typically a
`quiz.json` committed into a workshop repo).

An instructor starts a quiz, students join with a 5-character code on their own devices,
and the instructor advances question-by-question. After each question the room sees a bar
chart of how many students picked each answer with the correct answer highlighted, then
moves on. A live leaderboard keeps it fun.

Built to run entirely on Firebase's **free Spark plan**: React + Vite static hosting,
Firestore for live state, and Firebase Auth — no Cloud Functions, no billing required.

## How it works

- **Instructor** signs in with Google, pastes a quiz URL, and gets a join code.
- **Students** open the app, enter the code + a nickname (anonymous auth), and play.
- Correct answers are never sent to students — they live in a host-only Firestore
  document and are only revealed when the instructor clicks **Reveal**. This is enforced
  by [`firestore.rules`](./firestore.rules), which act as the backend.

See [`docs/quiz-schema.md`](./docs/quiz-schema.md) for the quiz file format and
[`docs/sample-quiz.json`](./docs/sample-quiz.json) for a working example.

## One-click host links (for slides)

You can link straight into host mode with a quiz pre-loaded — handy for a workshop slide:

```
https://<your-app>/host?quiz=<url-encoded quiz URL>
```

For example, to host the JavaScript Basics quiz:

```
https://learning-check.web.app/host?quiz=https%3A%2F%2Flansingtechstudio.org%2Fworkshops%2Fjavascript-basics%2Fquiz.json
```

Opening it signs you in (if needed), fetches the quiz, and drops you straight into the
lobby with a join code — no pasting. The URL then becomes `…/host?session=CODE`, so a
refresh resumes the same live session instead of starting a new one.

The easiest way to get one: on the **Start a quiz** screen, paste your quiz URL and copy
the generated **📎 Slide link**.

## Quick start (local development)

```bash
npm install

# Terminal 1 — Firebase Emulator Suite (Auth + Firestore)
npm run emulators

# Terminal 2 — Vite dev server pointed at the emulators
npm run dev:emulators
```

Open the printed URL. Use one tab as the instructor (`/host`) and another as a student
(`/play`). Load the bundled sample quiz with the URL `http://localhost:5173/sample-quiz.json`.

> The emulators don't need real Firebase credentials. To run against a **real** project,
> copy `.env.example` to `.env.local`, fill in your web config, and use `npm run dev`.

## Connecting a real Firebase project (one-time)

1. Create a project at <https://console.firebase.google.com> (Spark/free plan is fine).
2. **Build → Firestore Database** → create database (production mode).
3. **Build → Authentication** → enable the **Google** and **Anonymous** providers.
4. **Project settings → Your apps** → register a Web app; copy its config into `.env.local`.
5. Deploy rules and the app:

   ```bash
   npm run build
   firebase deploy --only firestore:rules,hosting
   ```

   (Update the project id in [`.firebaserc`](./.firebaserc) first.)

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (uses `.env.local`). |
| `npm run dev:emulators` | Vite dev server pointed at local emulators. |
| `npm run emulators` | Start the Firebase Emulator Suite. |
| `npm run build` | Type-check and build to `dist/`. |
| `npm test` | Run unit + rules tests (Vitest). |

## Tech

React 19 · Vite · TypeScript · Tailwind CSS · Firebase (Firestore + Auth + Hosting) · Zod.
