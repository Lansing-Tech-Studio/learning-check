# Quiz file format

A Learning Check quiz is a single JSON file you host anywhere the app can fetch it over
HTTPS — most commonly committed straight into a workshop folder in the
[`workshops`](https://github.com/Lansing-Tech-Studio/workshops) repo, e.g.
`javascript-basics/quiz.json`, which is then served at
`https://lansingtechstudio.org/workshops/javascript-basics/quiz.json`.

The instructor pastes that URL into the host console to start a live quiz.

## Shape

```jsonc
{
  "title": "JavaScript Basics Learning Check",   // required — shown to the room
  "workshop": "javascript-basics",                // optional — label only
  "description": "A quick check after the workshop.", // optional
  "defaultTimeLimit": 30,                          // optional — seconds, applied to any
                                                   //   question without its own timeLimit
  "questions": [                                   // required — at least one
    {
      "prompt": "Which keyword declares a block-scoped variable?", // required
      "choices": ["var", "let", "function", "print"],              // required — 2 to 4
      "correctIndex": 1,                            // required — 0-based index into choices
      "explanation": "let is block-scoped; var is function-scoped.", // optional — shown on reveal
      "timeLimit": 20                               // optional — seconds for this question
    }
  ]
}
```

## Rules

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Non-empty string. |
| `workshop` | no | Free-text label. |
| `description` | no | Free-text. |
| `defaultTimeLimit` | no | Whole seconds, 1–600. Defaults to 30 if omitted. |
| `questions` | yes | At least one question. |
| `questions[].prompt` | yes | Non-empty string. |
| `questions[].choices` | yes | **2 to 4** non-empty strings. |
| `questions[].correctIndex` | yes | 0-based; must be a valid index into `choices`. |
| `questions[].explanation` | no | Shown on the reveal screen. |
| `questions[].timeLimit` | no | Whole seconds, 1–600. Falls back to `defaultTimeLimit`. |

The app validates the file when it loads and shows a clear list of problems if anything is
off (e.g. `questions.0.correctIndex: "correctIndex" 4 is out of range for 4 choices.`).

## Where the answers go

Students never receive `correctIndex`. When the host loads the quiz, the full file
(including answers) is written to a host-only document; only the question prompt and
choices are published to students. The correct answer is revealed to the room only after
the host clicks **Reveal**.

See [`sample-quiz.json`](./sample-quiz.json) for a complete working example.
