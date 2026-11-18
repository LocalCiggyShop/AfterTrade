import { useState } from "react";
import {
  BarChart3,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  Layers,
  CalendarDays,
  GripVertical,
  Eye,
  EyeOff,
} from "../lib/icons";
import type { Trade } from "../types";
import { useJournal } from "../context";
import {
  completed,
  metrics,
  filterPeriod,
  breakdown,
  fmtR,
} from "../lib/domain";
import {
  PageHeading,
  Button,
  Badge,
  SectionTitle,
  Tabs,
  Modal,
} from "../components/ui";
import {
  PerformanceMetrics,
  EquityPanel,
  TimingPanel,
  SymbolPanel,
  DisciplinePanel,
  DirectionPanel,
} from "../components/analytics";
import { BarChart } from "../components/charts";
import { TradingCalendar } from "../components/calendar";

export default function Analytics({
  trades,
  onTrade,
}: {
  trades: Trade[];
  onTrade: (id: string) => void;
}) {
  const { data } = useJournal(),
    [period, setPeriod] = useState("all"),
    [session, setSession] = useState("all"),
    [template, setTemplate] = useState("all"),
    [unit, setUnit] = useState("r"),
    [builder, setBuilder] = useState(false),
    [hidden, setHidden] = useState<string[]>([]);
  const filtered = filterPeriod(trades, period).filter(
      (t) =>
        (session === "all" || t.session === session) &&
        (template === "all" || t.templateId === template),
    ),
    m = metrics(filtered),
    all = completed(filtered),
    symbols = breakdown(all, (t) => t.symbol),
    sessions = breakdown(all, (t) => t.session),
    bins = [-2, -1, 0, 1, 2, 3, 4].map(
      (v, i) =>
        all.filter(
          (t) =>
            t.r !== null &&
            (i === 0 ? t.r < -1 : i === 6 ? t.r >= 4 : t.r >= v && t.r < v + 1),
        ).length,
    ),
    panels = [
      "Equity & drawdown",
      "R distribution",
      "Timing",
      "Longs vs Shorts",
      "Symbol performance",
      "Risk & discipline",
      "Setup leaderboard",
      "Trading calendar",
    ];
  const setups = breakdown(all, (t) => {
    const c = data.checklists.find((c) => c.id === t.templateId);
    const core = c?.fields.filter((f) => f.role === "core") ?? [];
    return core.length
      ? core
          .map(
            (f) =>
              `${f.label}: ${Array.isArray(t.answers[f.id]) ? (t.answers[f.id] as string[]).join(", ") : t.answers[f.id] || "Not logged"}`,
          )
          .join(" · ")
      : t.direction;
  });
  const show = (name: string) => !hidden.includes(name);
  return (
    <div className="workspace-content analytics-page">
      <PageHeading
        title="Analytics"
        subtitle="Understand the decisions behind your results."
        icon={BarChart3}
      >
        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          onClick={() => setBuilder(true)}
        >
          Analytics Builder
        </Button>
      </PageHeading>
      <div className="analytics-controls">
        <Badge color="purple">{m.count} trades analysed</Badge>
        <div className="toolbar-spacer" />
        <select
          aria-label="Analytics time period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="all">All Time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select
          aria-label="Analytics session"
          value={session}
          onChange={(e) => setSession(e.target.value)}
        >
          <option value="all">All Sessions</option>
          {data.settings.sessions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Analytics checklist"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        >
          <option value="all">All Checklists</option>
          {data.checklists.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <PerformanceMetrics trades={filtered} />
      <section className="insights-section">
        <SectionTitle title="Key insights from your trades" icon={Sparkles}>
          <span className="micro muted">Computed from your journal</span>
        </SectionTitle>
        {[
          {
            text: sessions[0]
              ? `${sessions[0].name} contributed ${fmtR(sessions[0].totalR)} across ${sessions[0].count} trades.`
              : "Add sessions to your trades to discover your best windows.",
            icon: CalendarDays,
          },
          {
            text: symbols[0]
              ? `${symbols[0].name} is your leading symbol (${symbols[0].winRate.toFixed(0)}% win rate, ${symbols[0].count} trades).`
              : "Log your first trade to build instrument insights.",
            icon: TrendingUp,
          },
          {
            text: `${m.rules.toFixed(0)}% of your completed trades followed your rules. Keep recording process as well as outcome.`,
            icon: Layers,
          },
        ].map((insight, i) => (
          <div className="insight-card" key={i}>
            <span className="insight-icon">
              <insight.icon size={16} />
            </span>
            <p>{insight.text}</p>
            <Badge color={m.count < 30 ? "gold" : "neutral"}>
              {m.count < 30 ? "Small sample" : "Observation"}
            </Badge>
          </div>
        ))}
      </section>
      {show("Equity & drawdown") && (
        <>
          <div className="section-heading">
            <span className="eyebrow">Performance over time</span>
            <Tabs
              value={unit}
              onChange={setUnit}
              options={[
                { value: "r", label: "R multiples" },
                { value: "pnl", label: "Money P&L" },
              ]}
            />
          </div>
          <div className="analytics-grid">
            <EquityPanel trades={filtered} unit={unit as "r" | "pnl"} />
            <EquityPanel
              trades={filtered}
              drawdown
              unit={unit as "r" | "pnl"}
            />
          </div>
        </>
      )}
      <div className="analytics-grid">
        {show("R distribution") && (
          <section className="panel distribution-panel">
            <SectionTitle title="R distribution" icon={BarChart3}>
              <Badge color="neutral">{all.length} trades</Badge>
            </SectionTitle>
            <BarChart
              values={bins}
              labels={["<−1", "−1–0", "0–1", "1–2", "2–3", "3–4", "4+"]}
              height={220}
            />
            <p className="micro muted">
              Outcome distribution in risk multiples
            </p>
          </section>
        )}
        {show("Timing") && <TimingPanel trades={filtered} />}
      </div>
      {show("Longs vs Shorts") && <DirectionPanel trades={filtered} />}
      <div className="analytics-grid">
        {show("Symbol performance") && <SymbolPanel trades={filtered} />}
        {show("Risk & discipline") && <DisciplinePanel trades={filtered} />}
      </div>
      {show("Setup leaderboard") && (
        <section className="panel setup-leaderboard">
          <SectionTitle title="Setup leaderboard" icon={Layers}>
            <span className="micro muted">Grouped by your core fields</span>
          </SectionTitle>
          {setups.slice(0, 6).map((s, i) => (
            <div key={s.name}>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <strong>{s.name}</strong>
              <span className="positive">{s.winRate.toFixed(0)}%</span>
              <span>{fmtR(s.avgR)}</span>
              <Badge color={s.count < 15 ? "gold" : "green"}>
                {s.count < 15 ? "Low" : "Building"} ({s.count})
              </Badge>
            </div>
          ))}
          {!setups.length && <p className="muted">No completed setups yet.</p>}
        </section>
      )}
      {show("Trading calendar") && (
        <section className="panel">
          <TradingCalendar trades={filtered} compact onTrade={onTrade} />
        </section>
      )}
      {builder && (
        <Modal
          title="Analytics Builder"
          subtitle="Choose which panels belong in your workspace."
          onClose={() => setBuilder(false)}
        >
          <div className="modal-body builder-list">
            {panels.map((p) => (
              <button
                key={p}
                onClick={() =>
                  setHidden((h) =>
                    h.includes(p) ? h.filter((x) => x !== p) : [...h, p],
                  )
                }
              >
                <GripVertical size={15} />
                <span>{p}</span>
                {hidden.includes(p) ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} className="accent" />
                )}
              </button>
            ))}
          </div>
          <footer className="modal-footer">
            <Button variant="ghost" onClick={() => setHidden([])}>
              Show all panels
            </Button>
            <Button onClick={() => setBuilder(false)}>Done</Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
