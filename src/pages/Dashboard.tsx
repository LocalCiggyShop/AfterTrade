import { useMemo, useState } from "react";
import {
  Plus,
  Sparkles,
  StickyNote,
  ArrowRight,
  Clock3,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Target,
  EyeOff,
  Upload,
} from "../lib/icons";
import type { Trade } from "../types";
import { useJournal } from "../context";
import {
  metrics,
  completed,
  filterPeriod,
  breakdown,
  fmtR,
  fmtDate,
} from "../lib/domain";
import { Button, Badge, Tabs, SectionTitle, Empty } from "../components/ui";
import {
  PerformanceMetrics,
  TimingPanel,
  EquityPanel,
} from "../components/analytics";
import { TradingCalendar } from "../components/calendar";

export default function Dashboard({
  trades,
  onLog,
  onImport,
  onTrade,
  navigate,
}: {
  trades: Trade[];
  onLog: () => void;
  onImport: () => void;
  onTrade: (id: string) => void;
  navigate: (path: string) => void;
}) {
  const { data } = useJournal(),
    [period, setPeriod] = useState("30"),
    [unit, setUnit] = useState("r");
  const filtered = useMemo(
      () => filterPeriod(trades, period),
      [trades, period],
    ),
    m = metrics(filtered),
    best = breakdown(filtered, (t) => t.session || "Unspecified")[0],
    pinned = data.notes.filter((n) => n.pinned),
    open = trades.filter((t) => !t.deletedAt && t.status === "open"),
    today = completed(trades).filter(
      (t) => new Date(t.date).toDateString() === new Date().toDateString(),
    ),
    todayM = metrics(today),
    hour = new Date().getHours(),
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
  return (
    <div className="workspace-content dashboard">
      <header className="dashboard-greeting">
        <div className="eyebrow greeting-eyebrow">
          <span className="status-dot" />A fresh perspective
        </div>
        <h1>
          {greeting}, {data.settings.name || "trader"}
          <span className="accent">.</span>
        </h1>
        <p>Consistency is built one well-executed decision at a time.</p>
      </header>
      {!data.demo && !data.trades.some((trade) => !trade.deletedAt) && (
        <section
          className="journal-start panel"
          aria-label="Get started with your journal"
        >
          <span className="journal-start-icon">
            <Upload size={23} />
          </span>
          <div>
            <span className="eyebrow accent">Your journal starts here</span>
            <h2>Bring your first trade into focus.</h2>
            <p>
              Import your history or log a trade. Your calendar and analytics
              will fill in as you go.
            </p>
            <div className="journal-start-actions">
              <Button icon={Upload} onClick={onImport}>
                Import trades
              </Button>
              <Button variant="secondary" icon={Plus} onClick={onLog}>
                Log my first trade
              </Button>
              <Button variant="ghost" onClick={() => navigate("/templates")}>
                Edit my checklist <ArrowRight size={13} />
              </Button>
            </div>
          </div>
        </section>
      )}
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section>
            <div className="performance-heading">
              <div>
                <h2>Performance Overview</h2>
                <p className="muted small">
                  {period === "all"
                    ? "Your complete trading picture"
                    : period === "month"
                      ? "Showing results for this month"
                      : `Showing results for the last ${period} days`}
                </p>
              </div>
              <div className="heading-actions">
                <Tabs
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: "7", label: "7D" },
                    { value: "30", label: "30D" },
                    { value: "365", label: "365D" },
                    { value: "all", label: "All" },
                    { value: "month", label: "Month" },
                  ]}
                />
                <Button icon={Plus} onClick={onLog}>
                  Log Trade
                </Button>
              </div>
            </div>
            {data.settings.blinded ? (
              <div className="panel blinded-notice">
                <EyeOff size={22} />
                <h3>Focus on the process</h3>
                <p>Your statistics are hidden while blinded mode is on.</p>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/settings")}
                >
                  Manage preferences
                </Button>
              </div>
            ) : (
              <>
                <div className="metric-unit-toggle">
                  <button onClick={() => setUnit(unit === "r" ? "pnl" : "r")}>
                    Showing {unit === "r" ? "R multiples" : "money P&L"}{" "}
                    <ChevronRight size={11} />
                  </button>
                </div>
                <PerformanceMetrics
                  trades={filtered}
                  compact
                  money={unit === "pnl"}
                />
              </>
            )}
          </section>
          {!data.settings.blinded && (
            <section className="best-edge">
              <div className="best-edge-top">
                <span>
                  <Sparkles size={17} />
                  Your Best Edge This Period
                </span>
                <Badge color="purple">
                  {m.count < 30 ? "Building your sample" : "Keep exploring"}
                </Badge>
              </div>
              <p>
                {best
                  ? `${best.name} · consistent conditions · a clear process`
                  : "Your edge starts with a well-documented trade."}
              </p>
              <div>
                {best ? (
                  <>
                    <Badge color="green">
                      <ArrowUpRight size={12} />
                      {best.winRate.toFixed(0)}% Win Rate
                    </Badge>
                    <span>
                      Avg <b className="positive">{fmtR(best.avgR)}</b>
                    </span>
                    <span className="muted small">({best.count} trades)</span>
                  </>
                ) : (
                  <Button variant="secondary" onClick={onLog}>
                    Log your first trade
                  </Button>
                )}
                <button
                  className="text-link edge-link"
                  onClick={() => navigate("/analytics")}
                >
                  Explore your data <ArrowRight size={14} />
                </button>
              </div>
            </section>
          )}
          <div className="dashboard-bottom-grid">
            <section className="panel calendar-widget">
              <TradingCalendar trades={trades} compact onTrade={onTrade} />
              <button
                className="full-view-link"
                onClick={() => navigate("/calendar")}
              >
                Full calendar <ArrowUpRight size={13} />
              </button>
            </section>
            {!data.settings.blinded && <TimingPanel trades={filtered} />}
          </div>
          <section className="panel recent-trades">
            <SectionTitle title="Recent trades" icon={Clock3}>
              <button className="text-link" onClick={() => navigate("/data")}>
                View all <ArrowRight size={13} />
              </button>
            </SectionTitle>
            {completed(trades)
              .slice(0, 4)
              .map((t) => (
                <button
                  className="recent-trade"
                  key={t.id}
                  onClick={() => onTrade(t.id)}
                >
                  <span
                    className={`trade-direction ${t.direction === "long" ? "positive" : "negative"}`}
                  >
                    <ArrowUpRight size={17} />
                  </span>
                  <div>
                    <strong>{t.symbol}</strong>
                    <small>
                      {t.session} · {fmtDate(t.date, true)}
                    </small>
                  </div>
                  <Badge
                    color={
                      t.outcome === "win"
                        ? "green"
                        : t.outcome === "loss"
                          ? "red"
                          : "neutral"
                    }
                  >
                    {t.outcome}
                  </Badge>
                  <b
                    className={
                      t.r !== null && t.r < 0 ? "negative" : "positive"
                    }
                  >
                    {fmtR(t.r)}
                  </b>
                  <ChevronRight size={15} />
                </button>
              ))}
            {!m.count && (
              <Empty
                title="A little context goes a long way"
                description="Add your next trade, then start finding the patterns."
                icon={Target}
              />
            )}
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="pinned-panel">
            <h3>
              <StickyNote size={15} />
              Pinned notes
            </h3>
            {pinned[0] ? (
              <>
                <button
                  className="pinned-note-title"
                  onClick={() => navigate("/mental-notes")}
                >
                  {pinned[0].title}
                </button>
                <p>{pinned[0].content.slice(0, 115)}…</p>
              </>
            ) : (
              <p>
                Pin reminders and quick notes. Keep the important things close.
              </p>
            )}
            <Button
              variant="ghost"
              icon={Plus}
              onClick={() => navigate("/mental-notes")}
            >
              Add a note
            </Button>
          </section>
          {!data.settings.blinded && <EquityPanel trades={filtered} compact />}
          <section className="review-preview panel">
            <div className="section-heading">
              <h3>
                <Sparkles size={17} className="accent" />
                Review assistant
              </h3>
              <Badge color="blue">Insights</Badge>
            </div>
            <p className="micro muted">A clearer view of your journal</p>
            <h3>
              {best
                ? `${best.name} is worth a closer look`
                : "Your next insight starts here"}
            </h3>
            <div className="review-preview-item">
              <Badge color="green">Do more</Badge>
              <p>Give your best setups the time and space they need.</p>
            </div>
            <div className="review-preview-item">
              <Badge color="gold">Watch</Badge>
              <p>
                {today.length >= data.settings.maxTrades
                  ? "You’ve reached your daily trade limit. Take a moment to review."
                  : "Keep your risk consistent, especially after a loss."}
              </p>
            </div>
            <button className="text-link" onClick={() => navigate("/reviews")}>
              Open journal reviews <ArrowRight size={14} />
            </button>
          </section>
          <section className="panel daily-guardrail">
            <SectionTitle title="Daily guardrails" icon={ShieldCheck} />
            <div
              className={`guardrail-status ${todayM.totalR <= -data.settings.maxDailyLoss || today.length >= data.settings.maxTrades ? "warning" : "positive"}`}
            >
              <ShieldCheck size={23} />
              <div>
                <strong>
                  {todayM.totalR <= -data.settings.maxDailyLoss ||
                  today.length >= data.settings.maxTrades
                    ? "Time to pause and review"
                    : "Stay patient. Stay consistent."}
                </strong>
                <span>
                  {today.length} / {data.settings.maxTrades} trades today
                </span>
              </div>
            </div>
            <div className="today-sequence">
              <span className="eyebrow">Today’s sequence</span>
              <div>
                {today.length ? (
                  today.slice(0, 8).map((t) => (
                    <Badge
                      key={t.id}
                      color={
                        t.outcome === "win"
                          ? "green"
                          : t.outcome === "loss"
                            ? "red"
                            : "neutral"
                      }
                    >
                      {t.outcome === "win"
                        ? "W"
                        : t.outcome === "loss"
                          ? "L"
                          : "BE"}
                    </Badge>
                  ))
                ) : (
                  <span className="muted small">A clean slate.</span>
                )}
              </div>
            </div>
          </section>
          {open.length > 0 && (
            <section className="panel">
              <SectionTitle title="Open trades">
                <Badge color="neutral">{open.length}</Badge>
              </SectionTitle>
              {open.slice(0, 3).map((t) => (
                <button
                  className="open-trade-mini"
                  key={t.id}
                  onClick={() => onTrade(t.id)}
                >
                  <strong>{t.symbol}</strong>
                  <span className="muted">{t.direction}</span>
                  <span className="text-link">
                    Mark <ArrowRight size={12} />
                  </span>
                </button>
              ))}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
