import {
  Clock3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from "../lib/icons";
import type { Trade } from "../types";
import { completed, metrics, breakdown, fmtR, fmtMoney } from "../lib/domain";
import { Metric, SectionTitle } from "./ui";
import { LineChart, BarChart, WinRing } from "./charts";

export function PerformanceMetrics({
  trades,
  compact = false,
  money = true,
}: {
  trades: Trade[];
  compact?: boolean;
  money?: boolean;
}) {
  const m = metrics(trades);
  return (
    <div className={`metric-grid ${compact ? "five" : "eight"}`}>
      <Metric
        label="Win rate"
        value={`${m.winRate.toFixed(1)}%`}
        tone="positive"
        sub={`${m.wins}W · ${m.losses}L · ${m.be}BE`}
      >
        {compact && <WinRing value={m.winRate} />}
      </Metric>
      {compact ? (
        <>
          <Metric
            label="Profit factor"
            value={m.pf === Infinity ? "∞" : m.pf.toFixed(2)}
            tone="positive"
            sub={
              <span className="pf-scale">
                <i style={{ width: `${Math.min(100, m.pf * 20)}%` }} />
              </span>
            }
          />
          <Metric
            label={money ? "Net P&L" : "Total R"}
            value={money ? fmtMoney(m.pnl) : fmtR(m.totalR)}
            tone={(money ? (m.pnl ?? 0) : m.totalR) < 0 ? "negative" : ""}
            sub="Across completed trades"
          />
          <Metric
            label="Total trades"
            value={m.count}
            sub="Trades in this period"
          />
          <Metric
            label="Avg R / trade"
            value={fmtR(m.avgR)}
            tone={m.avgR >= 0 ? "positive" : "negative"}
            sub="Based on recorded R"
          />
        </>
      ) : (
        <>
          <Metric
            label="Avg R"
            value={fmtR(m.avgR)}
            tone={m.avgR >= 0 ? "positive" : "negative"}
          />
          <Metric
            label="Total R"
            value={fmtR(m.totalR)}
            tone={m.totalR >= 0 ? "positive" : "negative"}
          />
          <Metric
            label="Profit factor"
            value={m.pf === Infinity ? "∞" : m.pf.toFixed(2)}
            tone="positive"
          />
          <Metric
            label="Expectancy"
            value={fmtR(m.avgR)}
            tone={m.avgR >= 0 ? "positive" : "negative"}
          />
          <Metric label="Avg win" value={fmtR(m.avgWin)} tone="positive" />
          <Metric label="Avg loss" value={fmtR(m.avgLoss)} tone="negative" />
          <Metric
            label="Streak"
            value={Math.abs(m.streak)}
            tone={m.streak >= 0 ? "positive" : "negative"}
            sub={m.streak >= 0 ? "wins" : "losses"}
          />
        </>
      )}
    </div>
  );
}
export function equityValues(trades: Trade[], unit: "r" | "pnl" = "r") {
  let sum = 0;
  return [
    0,
    ...[...completed(trades)]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => (sum += t[unit] ?? 0)),
  ];
}
export function TimingPanel({ trades }: { trades: Trade[] }) {
  const sessions = breakdown(trades, (t) => t.session || "Unspecified"),
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"],
    all = completed(trades),
    hours = Array.from(
      { length: 12 },
      (_, i) =>
        metrics(
          all.filter((t) => Math.floor(new Date(t.date).getHours() / 2) === i),
        ).totalR,
    );
  return (
    <section className="panel timing-panel">
      <SectionTitle title="Timing" icon={Clock3}>
        <span className="micro muted">Your strongest windows</span>
      </SectionTitle>
      <div className="timing-columns">
        <div>
          <span className="eyebrow">By day</span>
          {days.map((name, i) => {
            const m = metrics(
              all.filter((t) => new Date(t.date).getDay() === i + 1),
            );
            return (
              <TimingRow
                key={name}
                name={name}
                rate={m.winRate}
                count={m.count}
              />
            );
          })}
        </div>
        <div>
          <span className="eyebrow">By session</span>
          {sessions.length ? (
            sessions
              .slice(0, 5)
              .map((s) => (
                <TimingRow
                  key={s.name}
                  name={s.name}
                  rate={s.winRate}
                  count={s.count}
                />
              ))
          ) : (
            <p className="muted small">No sessions recorded.</p>
          )}
        </div>
      </div>
      <div className="hour-chart">
        <span className="eyebrow">By hour</span>
        <BarChart
          values={hours}
          labels={hours.map((_, i) => (i % 2 === 0 ? `${i * 2}:00` : ""))}
          height={90}
        />
      </div>
    </section>
  );
}
function TimingRow({
  name,
  rate,
  count,
}: {
  name: string;
  rate: number;
  count: number;
}) {
  return (
    <div className="timing-row">
      <span>{name}</span>
      <div className="timing-bar">
        <i style={{ width: `${rate}%` }} />
      </div>
      <strong className="positive">{rate.toFixed(0)}%</strong>
      <small>{count}</small>
    </div>
  );
}
export function SymbolPanel({ trades }: { trades: Trade[] }) {
  const list = breakdown(trades, (t) => t.symbol);
  return (
    <section className="panel">
      <SectionTitle title="Symbol performance" icon={TrendingUp} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Trades</th>
              <th>Win%</th>
              <th>Avg R</th>
              <th>Total R</th>
              <th>PF</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.name}>
                <td>
                  <b>{s.name}</b>
                </td>
                <td>{s.count}</td>
                <td className={s.winRate >= 50 ? "positive" : "negative"}>
                  {s.winRate.toFixed(0)}%
                </td>
                <td>{s.avgR.toFixed(2)}</td>
                <td className={s.totalR >= 0 ? "positive" : "negative"}>
                  {fmtR(s.totalR)}
                </td>
                <td>{s.pf === Infinity ? "∞" : s.pf.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <p className="muted small">
            Complete a trade to see instrument results.
          </p>
        )}
      </div>
    </section>
  );
}
export function DisciplinePanel({ trades }: { trades: Trade[] }) {
  const all = completed(trades),
    m = metrics(all),
    avgRisk = all.length ? all.reduce((s, t) => s + t.risk, 0) / all.length : 0,
    good = metrics(all.filter((t) => t.followedRules)),
    broken = metrics(all.filter((t) => !t.followedRules));
  return (
    <section className="panel">
      <SectionTitle title="Risk & discipline" icon={ShieldCheck} />
      <div className="discipline-grid">
        <Metric label="Avg risk %" value={`${avgRisk.toFixed(2)}%`} />
        <Metric
          label="Rules followed"
          value={`${m.rules.toFixed(0)}%`}
          tone="positive"
        />
        <Metric
          label="Rules followed WR"
          value={`${good.winRate.toFixed(1)}%`}
          tone="positive"
          sub={`${good.count} trades`}
        />
        <Metric
          label="Rules broken WR"
          value={broken.count ? `${broken.winRate.toFixed(1)}%` : "—"}
          tone="negative"
          sub={`${broken.count} trades`}
        />
      </div>
    </section>
  );
}
export function DirectionPanel({ trades }: { trades: Trade[] }) {
  const long = metrics(trades.filter((t) => t.direction === "long")),
    short = metrics(trades.filter((t) => t.direction === "short")),
    total = long.count + short.count,
    pct = total ? (long.count / total) * 100 : 50;
  return (
    <section className="panel direction-panel">
      <SectionTitle title="Longs vs Shorts">
        <span className="micro muted">
          Ratio (L:S) {long.count} : {short.count}
        </span>
      </SectionTitle>
      <div className="direction-columns">
        {[
          { name: "Long", icon: ArrowUpRight, m: long },
          { name: "Short", icon: ArrowDownRight, m: short },
        ].map(({ name, icon: Icon, m }) => (
          <div key={name}>
            <h3 className={name === "Long" ? "positive" : "negative"}>
              <Icon size={15} />
              {name}
            </h3>
            <strong className="direction-count">
              {m.count}
              <small> trades</small>
            </strong>
            <dl>
              <div>
                <dt>Win rate</dt>
                <dd className="positive">{m.winRate.toFixed(0)}%</dd>
              </div>
              <div>
                <dt>W / L / BE</dt>
                <dd>
                  {m.wins} / {m.losses} / {m.be}
                </dd>
              </div>
              <div>
                <dt>Avg R</dt>
                <dd>{fmtR(m.avgR)}</dd>
              </div>
              <div>
                <dt>Total R</dt>
                <dd className="positive">{fmtR(m.totalR)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <div className="direction-ratio">
        <i style={{ width: `${pct}%` }} />
        <i style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="split-actions micro muted">
        <span>{pct.toFixed(0)}% Long</span>
        <span>{(100 - pct).toFixed(0)}% Short</span>
      </div>
    </section>
  );
}
export function EquityPanel({
  trades,
  drawdown = false,
  compact = false,
  unit = "r",
}: {
  trades: Trade[];
  drawdown?: boolean;
  compact?: boolean;
  unit?: "r" | "pnl";
}) {
  let values = equityValues(trades, unit);
  if (drawdown) {
    let peak = 0;
    values = values.map((v) => {
      peak = Math.max(peak, v);
      return v - peak;
    });
  }
  return (
    <section className={`panel ${compact ? "compact-equity" : ""}`}>
      <SectionTitle
        title={`${drawdown ? "Drawdown" : "Equity curve"}${compact ? "" : unit === "r" ? " (R)" : " (P&L)"}`}
        icon={TrendingUp}
      >
        {!compact && (
          <span className="micro muted">{completed(trades).length} trades</span>
        )}
      </SectionTitle>
      <LineChart
        values={values}
        height={compact ? 100 : 180}
        compact={compact}
        color={drawdown ? "var(--red)" : "var(--green)"}
      />
    </section>
  );
}
