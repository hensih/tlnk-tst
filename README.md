# 💱 Currency Exchange

Our accountant Margaret needs to convert currencies every day. A colleague put together a small "Currency Exchange" app for her in a hurry. It works, mostly. Margaret is not entirely happy with it, and it certainly doesn't look like the design yet.

## 🙋‍♀️ Your task

- Rebuild the UI to match the [Figma design](https://www.figma.com/design/8BkixtyYPHDdRVNXsv0lI6/Calculator-and-currency-exchange-app?node-id=0-1&t=GKGWbEC9xGVoCvrY-1) as closely as possible. The current markup only follows the order of the components on the screens.
- Don't feel bound by the existing code. It was written with Sonnet 3.7 and reviewed with GPT-3.5, so it is far from perfect. You don't need to preserve any of it; on the contrary, we expect a much better implementation that follows the behaviour described below.
- Implement the `test:ci` script in `package.json`. It should run the whole test suite once and exit with the correct code so it can be used in a CI/CD pipeline.
- Our users have complained about a few things (see below). Look into them, and into anything else you notice along the way.

## 💸 How the app works

The app has two tabs: **Exchange Rate** and **History**. All input comes from the on-screen keypad.

### Exchange Rate

- Users choose both currencies with native Select elements.
- Users type the amount for the first currency on the keypad. The second currency is calculated from a fresh quote on every change of the amount or of either currency.
- The screen shows when the quote was last updated. The reload button requests a fresh quote.

### History

- Shows the saved conversions and the number of records.
- The app starts with a few records already in the history. History is kept in memory only.

### Keypad

| Key | Exchange Rate | History |
|---|---|---|
| `0`–`9`, `00`, `.` | Types the amount | Disabled |
| ⌫ | Removes the last typed character | Removes the selected record |
| `C` | Resets the amount to `0` | Removes all records |
| `m` | Saves the current conversion to the history | Disabled |
| ▲ / ▼ | — | Moves the selection up / down |
| 🆗 | — | Loads the currencies and amount of the selected record and switches to Exchange Rate |

## 😤 User complaints

- "Sometimes the result shows an amount for the wrong currency."
- "When I pick an old conversion from History, the amount is wrong."

## 👩‍💻 Development

- Using AI tools is allowed.
- Use React. All other libs are up to you.
- If any aspect of the desired UI behaviour is ambiguous, please use your expertise and implement the best UX. Feel free to add any third-party libraries you find useful.
- The API is available under `/api` (see `vite.config.ts`). Before you start, set `CANDIDATE_ID` in `.env` to the email address we sent the task to (copy `.env.example` to `.env` if it's missing) and keep it unchanged for the whole task.
- The app should run via `npm run dev` and build via `npm run build` (`npm run preview` serves the build).
- `npm test` runs the tests.

### Test ids

Whatever markup you end up with, please keep these `data-testid` attributes on the matching elements. The current code already has them.

| `data-testid` | Element |
|---|---|
| `tab-exchange`, `tab-history` | Tab buttons |
| `from-currency`, `to-currency` | Currency selects (keep them native `<select>` elements) |
| `amount` | Typed amount |
| `result` | Converted amount |
| `updated-at` | When the quote was last updated |
| `refresh` | Reload button |
| `key-0` … `key-9`, `key-00`, `key-dot` | Digit keys |
| `key-backspace`, `key-clear`, `key-save`, `key-up`, `key-down`, `key-ok` | `⌫`, `C`, `m`, `▲`, `▼`, 🆗 |
| `history-item` | Each history record, with `aria-selected="true"` on the selected one |
| `history-count` | Number of records |

## 📦 What we expect back

- Your changes as a branch or a pull request in a separate repository as a link or a zip with repo. Once ready, send a link (or attached zip) to email from which you received the task.
- Project should start with npm command.
- A `FINDINGS.md` file. For every problem you found: the symptom, the root cause, and the fix, or why you decided not to fix it.

## ⏱️ Time

Please don't spend more than 8 hours. We are interested in how you prioritise, not in a perfect result.

## 🚀 Getting started

```bash
npm install
npm run dev
```
