import test from "node:test";
import assert from "node:assert/strict";
import {
  metrics,
  parseCSV,
  csvExport,
  simulate,
  setupMatches,
  validateBackup,
  validTrade,
} from "../src/lib/domain.ts";
import type { Trade, Checklist } from "../src/types.ts";
import { createSeed } from "../src/lib/seed.ts";
import {
  needsWelcome,
  startPersonalJournal,
  importIntoJournal,
} from "../src/lib/onboarding.ts";
const trade = (overrides: Partial<Trade> = {}): Trade => ({
  id: "one",
  name: "",
  symbol: "NQ",
  direction: "long",
  date: "2026-11-16T12:00:00Z",
  session: "London",
  templateId: "c",
  accountId: "",
  status: "completed",
  outcome: "win",
  r: 2,
  pnl: null,
  risk: 1,
  followedRules: true,
  emotions: [],
  notes: "",
  answers: {},
  screenshots: [],
  rating: 0,
  bookmarked: false,
  mfe: 3,
  mae: -0.5,
  deletedAt: null,
  ...overrides,
});
test("win rate excludes breakevens; open and deleted trades do not affect aggregates", () => {
  const m = metrics([
    trade(),
    trade({ id: "loss", outcome: "loss", r: -1 }),
    trade({ id: "be", outcome: "breakeven", r: 0 }),
    trade({ id: "open", status: "open", outcome: null, r: null }),
    trade({ id: "deleted", deletedAt: "2026-11-17" }),
  ]);
  assert.equal(m.count, 3);
  assert.equal(m.winRate, 50);
  assert.equal(m.totalR, 1);
  assert.equal(m.pf, 2);
  assert.equal(m.pnl, null);
});
test("missing R is excluded from averages without changing recorded outcome counts", () => {
  const m = metrics([trade(), trade({ id: "missing", r: null })]);
  assert.equal(m.wins, 2);
  assert.equal(m.avgR, 2);
  assert.equal(m.avgWin, 2);
});
test("drawdown follows chronological order, not input order", () => {
  const m = metrics([
    trade({ id: "third", date: "2026-11-18", r: 1 }),
    trade({ id: "first", date: "2026-11-16", r: 3 }),
    trade({ id: "second", date: "2026-11-17", r: -2, outcome: "loss" }),
  ]);
  assert.equal(m.drawdown, 2);
});
test("CSV round-trips commas, newlines, quotes and zero-valued results", () => {
  const source = trade({
    notes: 'Waited, then wrote "yes"\nA second line.',
    r: 0,
    pnl: 0,
  });
  const parsed = parseCSV(csvExport([source]));
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1][11], source.notes);
  assert.equal(parsed[1][7], "0");
  assert.equal(parsed[1][8], "0");
});
test("CSV rejects unterminated quoted values", () =>
  assert.throws(() => parseCSV('symbol,notes\nNQ,"unfinished'), /unclosed/));
test("simulation handles ambiguous stop/target order explicitly", () => {
  const rows = [trade({ mfe: 3, mae: -1.5 })];
  assert.equal(simulate(rows, 2, 1, "conservative")[0].r, -1);
  assert.equal(simulate(rows, 2, 1, "optimistic")[0].r, 2);
  assert.equal(simulate(rows, 2, 1, "exclude").length, 0);
});
test("core multi-select matching uses selected values as a subset", () => {
  const c = { fields: [{ id: "levels", role: "core" }] } as Checklist;
  assert.equal(
    setupMatches(
      trade({ answers: { levels: ["Daily", "1H"] } }),
      { levels: ["1H"] },
      c,
    ),
    true,
  );
  assert.equal(
    setupMatches(
      trade({ answers: { levels: ["Daily"] } }),
      { levels: ["1H"] },
      c,
    ),
    false,
  );
});
test("invalid imports cannot replace the current journal", () => {
  assert.equal(validTrade(trade()), true);
  assert.equal(validTrade(trade({ r: "2" as unknown as number })), false);
  assert.throws(() => validateBackup({ version: 1, trades: [] }), /backup/);
});
test("welcome appears once, with compatible behavior for existing journals", () => {
  const seed = createSeed();
  assert.equal(needsWelcome(seed), true);
  assert.equal(needsWelcome({ ...seed, onboardingCompleted: true }), false);
  delete seed.onboardingCompleted;
  assert.equal(needsWelcome(seed), true);
  assert.equal(
    needsWelcome({ ...seed, demo: false, trades: [trade()] }),
    false,
  );
});
test("starting a personal journal removes sample records and balances but keeps setup and preferences", () => {
  const seed = createSeed();
  const original = structuredClone(seed);
  const personal = startPersonalJournal(seed);
  assert.equal(personal.demo, false);
  assert.equal(personal.onboardingCompleted, true);
  assert.deepEqual(personal.trades, []);
  assert.deepEqual(personal.notes, []);
  assert.deepEqual(personal.reviews, []);
  assert.equal(personal.accounts[0].balance, 0);
  assert.equal(personal.settings.name, "");
  assert.deepEqual(personal.checklists, seed.checklists);
  assert.equal(personal.settings.theme, seed.settings.theme);
  assert.deepEqual(seed, original);
});
test("switching from a legacy demo preserves user-created records and removes dangling sample links", () => {
  const seed = createSeed();
  const real = trade({ id: "my-trade", demo: false });
  seed.trades.push(real);
  seed.notes.push({
    ...seed.notes[0],
    id: "my-note",
    demo: false,
    tradeIds: [real.id, "sample-1"],
  });
  seed.groups.push({
    id: "my-room",
    name: "Review",
    description: "",
    tradeIds: [real.id, "sample-1"],
    notes: [],
  });
  seed.accounts.push({
    ...seed.accounts[0],
    id: "my-account",
    demo: false,
    balance: 1234,
  });
  const personal = startPersonalJournal(seed);
  assert.deepEqual(personal.trades, [real]);
  assert.deepEqual(personal.notes[0].tradeIds, [real.id]);
  assert.deepEqual(personal.groups[0].tradeIds, [real.id]);
  assert.equal(
    personal.accounts.find((a) => a.id === "my-account")?.balance,
    1234,
  );
});
test("first import replaces the demo atomically and deduplicates the new batch", () => {
  const seed = createSeed();
  const row = trade({ id: "sample-1" });
  const result = importIntoJournal(seed, [row, row]);
  assert.equal(result.imported, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.data.demo, false);
  assert.equal(result.data.trades.length, 1);
  assert.equal(result.data.trades[0].demo, false);
  assert.equal(result.data.trades[0].r, 2);
  assert.equal(seed.trades.length, 46);
  assert.equal(seed.demo, true);
});
test("later imports append real trades without clearing existing data or reopening welcome", () => {
  const first = importIntoJournal(createSeed(), [trade({ id: "first" })]).data;
  first.notes.push({
    id: "personal-note",
    title: "My note",
    content: "Keep this",
    category: "Mindset",
    emotion: "Calm",
    pinned: false,
    color: "purple",
    date: "2026-11-17",
    tradeIds: [],
  });
  first.accounts[0].balance = 3000;
  const result = importIntoJournal(first, [
    trade({ id: "second" }),
    trade({ id: "first" }),
  ]);
  assert.equal(result.imported, 1);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(
    result.data.trades.map((t) => t.id),
    ["second", "first"],
  );
  assert.equal(result.data.notes[0].content, "Keep this");
  assert.equal(result.data.accounts[0].balance, 3000);
  assert.equal(needsWelcome(result.data), false);
});
