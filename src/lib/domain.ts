import type { Trade, Checklist, Answer, AppData, Review } from "../types.ts";

export const uid = () => crypto.randomUUID();
export const dateKey = (date: string | Date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtR = (v: number | null, digits = 2) =>
  v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}R`;
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
export const fmtMoney = (v: number | null) =>
  v === null ? "—" : money.format(v);
export const fmtDate = (d: string, short = false) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(short ? {} : { year: "numeric" }),
  });
export const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
export const activeTrades = (trades: Trade[]) =>
  trades.filter((t) => !t.deletedAt);
export const completed = (trades: Trade[]) =>
  activeTrades(trades).filter((t) => t.status === "completed");
export function metrics(trades: Trade[]) {
  const all = completed(trades),
    wins = all.filter((t) => t.outcome === "win").length,
    losses = all.filter((t) => t.outcome === "loss").length;
  const rs = all.filter((t) => t.r !== null).map((t) => t.r!),
    pnls = all.filter((t) => t.pnl !== null).map((t) => t.pnl!);
  const totalR = rs.reduce((a, b) => a + b, 0),
    grossWin = rs.filter((r) => r > 0).reduce((a, b) => a + b, 0),
    grossLoss = -rs.filter((r) => r < 0).reduce((a, b) => a + b, 0);
  let equity = 0,
    peak = 0,
    drawdown = 0,
    streak = 0;
  for (const t of [...all].sort((a, b) => a.date.localeCompare(b.date))) {
    equity += t.r ?? 0;
    peak = Math.max(peak, equity);
    drawdown = Math.max(drawdown, peak - equity);
    streak =
      t.outcome === "win"
        ? streak > 0
          ? streak + 1
          : 1
        : t.outcome === "loss"
          ? streak < 0
            ? streak - 1
            : -1
          : streak;
  }
  return {
    count: all.length,
    wins,
    losses,
    be: all.length - wins - losses,
    winRate: wins + losses ? (wins / (wins + losses)) * 100 : 0,
    totalR,
    avgR: rs.length ? totalR / rs.length : 0,
    pnl: pnls.length ? pnls.reduce((a, b) => a + b, 0) : null,
    pf: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    avgWin: rs.some((r) => r > 0)
      ? grossWin / rs.filter((r) => r > 0).length
      : 0,
    avgLoss: rs.some((r) => r < 0)
      ? -grossLoss / rs.filter((r) => r < 0).length
      : 0,
    drawdown,
    streak,
    rules: all.length
      ? (all.filter((t) => t.followedRules).length / all.length) * 100
      : 0,
  };
}
export function filterPeriod(trades: Trade[], period: string) {
  if (period === "all") return trades;
  const cutoff = new Date();
  period === "month"
    ? cutoff.setDate(1)
    : cutoff.setDate(cutoff.getDate() - Number(period));
  cutoff.setHours(0, 0, 0, 0);
  return trades.filter((t) => new Date(t.date) >= cutoff);
}
export function breakdown(trades: Trade[], key: (trade: Trade) => string) {
  const buckets = new Map<string, Trade[]>();
  for (const t of completed(trades)) {
    const name = key(t);
    buckets.set(name, [...(buckets.get(name) ?? []), t]);
  }
  return [...buckets]
    .map(([name, rows]) => ({ name, ...metrics(rows) }))
    .sort((a, b) => b.totalR - a.totalR);
}
export const hasAnswer = (a: Answer | undefined) =>
  a !== undefined && a !== "" && (!Array.isArray(a) || a.length > 0);
export function setupMatches(
  trade: Trade,
  answers: Record<string, Answer>,
  checklist: Checklist,
) {
  return checklist.fields
    .filter((f) => f.role === "core" && hasAnswer(answers[f.id]))
    .every((f) =>
      Array.isArray(answers[f.id])
        ? (answers[f.id] as string[]).every((v) =>
            (Array.isArray(trade.answers[f.id])
              ? trade.answers[f.id]
              : [trade.answers[f.id]]
            ).includes(v),
          )
        : trade.answers[f.id] === answers[f.id],
    );
}
export function makeReview(trades: Trade[], templateId = "all"): Review {
  const rows = completed(trades).filter(
      (t) => templateId === "all" || t.templateId === templateId,
    ),
    m = metrics(rows),
    sessions = breakdown(rows, (t) => t.session || "Unspecified"),
    symbols = breakdown(rows, (t) => t.symbol),
    broken = rows.filter((t) => !t.followedRules);
  const strongest = sessions[0];
  return {
    id: uid(),
    date: new Date().toISOString(),
    templateId,
    tradeCount: m.count,
    winRate: m.winRate,
    avgR: m.avgR,
    summary: !m.count
      ? "Your next chapter starts with the first trade."
      : `${strongest?.name ?? "Your journal"} is worth a closer look.`,
    strengths: [
      `${m.wins} of ${m.wins + m.losses} decided trades were winners (${m.winRate.toFixed(1)}%).`,
      strongest
        ? `${strongest.name} contributed ${fmtR(strongest.totalR)} across ${strongest.count} trades.`
        : "Log a session with each trade to find your best trading window.",
      symbols[0]
        ? `${symbols[0].name} leads your instrument results at ${fmtR(symbols[0].totalR)}.`
        : "Add instruments to build a performance picture.",
    ],
    watch: [
      broken.length
        ? `${broken.length} trade${broken.length === 1 ? "" : "s"} were marked as breaking your rules. Review the decisions behind them.`
        : "Your recorded trades follow your rules. Keep recording the exceptions honestly.",
      rows.length < 30
        ? "This is a small sample. Treat these patterns as questions to investigate."
        : "Compare the same setup across sessions before changing your process.",
      `Your largest closed-trade drawdown was ${m.drawdown.toFixed(2)}R.`,
    ],
    actions: [
      "Keep the checklist consistent for your next 10 trades.",
      "Review one trade where the process mattered more than the outcome.",
      "Write one specific adjustment in your notebook before your next session.",
    ],
  };
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted value.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function csvExport(trades: Trade[]) {
  const fields = [
    "id",
    "symbol",
    "direction",
    "date",
    "session",
    "status",
    "outcome",
    "r",
    "pnl",
    "risk",
    "followedRules",
    "notes",
    "templateId",
    "accountId",
  ] as const;
  return [
    fields.join(","),
    ...trades.map((t) =>
      fields
        .map((f) => `"${String(t[f] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\r\n");
}
export function validTrade(value: unknown): value is Trade {
  const t = value as Trade;
  const numeric = (v: unknown) =>
    v === null || (typeof v === "number" && Number.isFinite(v));
  return (
    !!t &&
    [
      "id",
      "name",
      "symbol",
      "date",
      "session",
      "templateId",
      "accountId",
      "notes",
    ].every((k) => typeof t[k as keyof Trade] === "string") &&
    !!t.id &&
    !!t.symbol &&
    ["long", "short"].includes(t.direction) &&
    ["open", "completed"].includes(t.status) &&
    (t.outcome === null || ["win", "loss", "breakeven"].includes(t.outcome)) &&
    Number.isFinite(Date.parse(t.date)) &&
    typeof t.risk === "number" &&
    Number.isFinite(t.risk) &&
    t.risk >= 0 &&
    t.risk <= 100 &&
    [t.r, t.pnl, t.mfe, t.mae].every(numeric) &&
    typeof t.rating === "number" &&
    t.rating >= 0 &&
    t.rating <= 5 &&
    typeof t.followedRules === "boolean" &&
    !!t.answers &&
    typeof t.answers === "object" &&
    Object.values(t.answers).every(
      (a) =>
        typeof a === "string" ||
        (Array.isArray(a) && a.every((v) => typeof v === "string")),
    ) &&
    Array.isArray(t.emotions) &&
    t.emotions.every((v) => typeof v === "string") &&
    Array.isArray(t.screenshots) &&
    t.screenshots.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.name === "string" &&
        typeof s.timeframe === "string" &&
        typeof s.src === "string" &&
        /^data:image\/(png|jpeg|webp);base64,/.test(s.src),
    ) &&
    typeof t.bookmarked === "boolean" &&
    (t.deletedAt === null || typeof t.deletedAt === "string")
  );
}
export function validateBackup(value: unknown): AppData {
  const d = value as AppData;
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.trades) ||
    !Array.isArray(d.checklists) ||
    !Array.isArray(d.accounts) ||
    !Array.isArray(d.notes) ||
    !Array.isArray(d.groups) ||
    !Array.isArray(d.reviews) ||
    !d.settings
  )
    throw new Error("This file is not an AfterTrade backup.");
  if (
    d.trades.some((t) => !validTrade(t)) ||
    new Set(d.trades.map((t) => t.id)).size !== d.trades.length
  )
    throw new Error("The backup contains an invalid or duplicate trade.");
  if (
    d.checklists.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        !Array.isArray(c.groups) ||
        !c.groups.every((g) => typeof g === "string") ||
        !Array.isArray(c.fields) ||
        c.fields.some(
          (f) =>
            !f ||
            typeof f.id !== "string" ||
            typeof f.label !== "string" ||
            !["boolean", "select", "multiselect", "number", "text"].includes(
              f.type,
            ) ||
            !Array.isArray(f.options) ||
            !f.options.every((o) => typeof o === "string"),
        ),
    )
  )
    throw new Error("The backup contains an invalid checklist.");
  if (
    typeof d.settings.name !== "string" ||
    !["purple", "clean", "light"].includes(d.settings.theme) ||
    !Array.isArray(d.settings.symbols) ||
    !Array.isArray(d.settings.sessions)
  )
    throw new Error("The backup contains invalid preferences.");
  if (
    d.accounts.some(
      (a) =>
        !a ||
        typeof a.id !== "string" ||
        typeof a.name !== "string" ||
        !Number.isFinite(a.balance) ||
        !Array.isArray(a.payouts),
    ) ||
    d.notes.some(
      (n) =>
        !n ||
        typeof n.id !== "string" ||
        typeof n.title !== "string" ||
        typeof n.content !== "string" ||
        !Array.isArray(n.tradeIds),
    ) ||
    d.groups.some(
      (g) =>
        !g ||
        typeof g.id !== "string" ||
        typeof g.name !== "string" ||
        !Array.isArray(g.tradeIds) ||
        !Array.isArray(g.notes),
    ) ||
    d.reviews.some(
      (r) =>
        !r ||
        typeof r.id !== "string" ||
        typeof r.summary !== "string" ||
        !Array.isArray(r.strengths) ||
        !Array.isArray(r.watch) ||
        !Array.isArray(r.actions),
    )
  )
    throw new Error("The backup contains invalid journal records.");
  return d;
}
export function simulate(
  trades: Trade[],
  tp: number,
  sl: number,
  mode: "conservative" | "optimistic" | "exclude",
) {
  return completed(trades)
    .filter((t) => t.mfe !== null && t.mae !== null && t.r !== null)
    .flatMap((t) => {
      const hitTP = t.mfe! >= tp,
        hitSL = Math.abs(t.mae!) >= sl,
        ambiguous = hitTP && hitSL;
      if (ambiguous && mode === "exclude") return [];
      const r = ambiguous
        ? mode === "optimistic"
          ? tp
          : -sl
        : hitSL
          ? -sl
          : hitTP
            ? tp
            : -sl;
      return [
        {
          ...t,
          r,
          outcome: (r > 0
            ? "win"
            : r < 0
              ? "loss"
              : "breakeven") as Trade["outcome"],
        },
      ];
    });
}
