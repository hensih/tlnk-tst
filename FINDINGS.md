# Complaints

## ✅ Sometimes the result shows an amount for the wrong currency

**Symptom:** A result sometimes belonged to a previously selected currency or amount.

**Root cause:** The quote effect accepted every response without cancellation or a freshness check. Older requests could overwrite newer conversions, and previous results remained visible beside changed inputs.

**Fixed:** Superseded requests are aborted and late responses or errors are ignored. Results are associated with the requested amount, currencies, and refresh generation. Results and timestamps are hidden immediately when inputs change. Responses with mismatched currencies or amounts are rejected. See src/exchange/useQuote.ts and src/app/App.tsx.

## ✅ When I pick an old conversion from History, the amount is wrong

**Symptom:** Restoring a saved conversion changed its amount.

**Root cause:** History stored display strings such as 1,000, which parseFloat reads as 1. Saving also rounded the entered amount.

**Fixed:** Seeded amounts are unformatted decimal strings. Saving preserves entered precision, formatting occurs only when rendering, and loading restores the raw amount.

# Other findings

## Typed keypad actions and validated API boundaries

**Symptom:** Keypad behaviour depended on button display labels, amount editing lived inside the app component, and malformed quote data could crash timestamp rendering or accept a partially numeric rate such as `2abc`.

**Root cause:** UI labels doubled as commands, and TypeScript response annotations were treated as runtime validation.

**Fixed:** Keypad buttons emit typed actions. A pure amount editor preserves decimal editing states and entered precision, and keeps `00` on an initial zero as `0`. API functions validate currency lists and the quote fields used by the app, reject mismatched conversions, invalid timestamps, non-positive or malformed rates, and numeric overflow. Cancellation and freshness checks remain in the request lifecycle.

**Validation:** Existing regression tests are retained, with additional amount-editing, API-validation, and app-level recovery and keypad-routing tests.

## ✅ Stale, accumulating keypad listeners

**Symptom:** Keypad actions could use stale inputs or run multiple times after switching tabs.

**Root cause:** The DOM listener effect depended only on the tab and never removed listeners. Handlers retained old inputs and history state; tab changes accumulated duplicate handlers.

**Fixed:** Keypad buttons use React callbacks with current state. The DOM listener effect and table ref were removed.

## ✅ Misleading history rows after deletion

**Symptom:** Deleting a history record could leave another record displaying the wrong label.

**Root cause:** Array-index keys and cached labels allowed reused rows to display another record's label.

**Fixed:** History records have stable IDs used as React keys. Labels derive from current props.

## ✅ Invalid selection

**Symptom:** Deletion and navigation through an empty history could leave an invalid selection.

**Root cause:** Deletion left selection outside history bounds; moving down through empty history could select index -1.

**Fixed:** Selection uses record IDs. Deletion selects the successor or preceding final record. Empty history has no selection, navigation respects bounds, and saving into empty history selects the new record.

## ✅ Incomplete request handling

**Symptom:** Failed requests left loading active, saving accepted unavailable results, and currency initialization could choose invalid defaults.

**Root cause:** Failures only reached the console and left quote loading active. Saving was allowed before a matching quote arrived. Currency initialization blindly overwrote defaults with the first two API entries.

**Fixed:**

- Currency and quote failures appear in visible alerts. Quote failures end loading; refresh retries quotes and a dedicated retry button reloads currencies.
- Save is disabled and its callback guarded until a successful quote matches the current inputs and refresh generation.
- Currency initialization preserves valid defaults, chooses available fallbacks, handles a single currency, and reports empty or invalid currency lists. Quotes wait until both selected currencies are available.
- Currency and quote requests are cancelled on cleanup, including unmount, and obsolete responses or failures are ignored.

**Validation:** Regression tests cover out-of-order responses even when fetch ignores cancellation, input and refresh changes, mismatched quotes, failure recovery, currency initialization and retry, saving and restoring raw amounts, and history selection.

## Vulnerable development and test dependencies

**Symptom:** npm audit reported five vulnerabilities, including critical remote code execution advisories in Tinypool.

**Root cause:** The original pinned Vitest and Vite versions pulled vulnerable worker-pool, mocking, and development-server dependencies. The Tinypool issues require a separate prototype-pollution primitive and concern Node worker execution on developer machines or CI, rather than the browser bundle. They still warrant remediation.

**Fixed:** Upgraded Vitest from 2.1.1 to 4.1.11, Vite from 5.4.8 to 6.4.4, and the compatible React plugin from 4.3.2 to 4.7.0. The installed tree no longer includes Tinypool; the mocker is patched and esbuild is 0.25.12. Exact versions and the updated lockfile make the change reproducible. No forced audit fix or transitive dependency override was used. Node support is declared in package.json and documented in the README.

**Validation:** A fresh full npm audit reported zero known vulnerabilities on 2026-10-07; all 74 tests, formatting checks, and the production build passed. This describes the audit result at that time, not a guarantee against future advisories. The supplied auditlog.txt is the original report from before the fix.

**References:** [Tinypool worker-options advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), [Tinypool run-options advisory](https://github.com/advisories/GHSA-85c8-ppgw-ccpr), [Vitest mocker advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), and [esbuild development-server advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

## UI and accessibility

The UI follows the phone-sized design, with a centered calculator on wider screens. Both views share the available space above the keypad, with reduced spacing on short screens. Long numbers remain readable through horizontal scrolling, and history navigation keeps the selected row visible.

Native currency selects and required test IDs are retained. Controls have descriptive accessible names and visible focus indicators; view buttons expose their selected state. The history list supports arrow-key navigation and identifies its selected option. Restored unavailable currencies stay visible with an explanation until the user chooses an available currency.

## Deliberate tradeoffs and validation

- History stays in memory, as required.
- Amounts are stored as raw decimal strings, preserving editing precision. Calculations use JavaScript numbers to match the API contract; the 12-digit keypad limit bounds input but does not guarantee exact decimal arithmetic.
- Component styles use CSS modules; fonts, resets, tokens, and small utilities remain global. Prettier provides consistent formatting.
- All 74 tests, formatting checks, and the production build passed after the dependency updates. Tests cover request races, API validation, amount editing, history selection, recovery, and mocked scrolling geometry. Browser layout and assistive technology behavior require separate manual verification.
