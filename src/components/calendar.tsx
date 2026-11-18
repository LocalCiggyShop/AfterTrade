import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
  ArrowUpRight,
} from "../lib/icons";
import type { Trade } from "../types";
import { useJournal } from "../context";
import { completed, dateKey, fmtR, metrics, fmtTime } from "../lib/domain";
import { Button, IconButton, Tabs, Badge, Empty } from "./ui";

export function TradingCalendar({
  trades,
  compact = false,
  onTrade,
}: {
  trades: Trade[];
  compact?: boolean;
  onTrade: (id: string) => void;
}) {
  const { notify } = useJournal(),
    [cursor, setCursor] = useState(new Date()),
    [view, setView] = useState("month"),
    [selected, setSelected] = useState<string | null>(null),
    [filter, setFilter] = useState("all");
  const days = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    if (view === "week") {
      start.setFullYear(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
      );
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    }
    const needed =
      ((new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) %
        7) +
      new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from(
      { length: view === "week" ? 7 : needed > 35 ? 42 : 35 },
      (_, i) => {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        return date;
      },
    );
  }, [cursor, view]);
  const byDay = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of completed(trades)) {
      const key = dateKey(t.date);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [trades]);
  const visible = completed(trades).filter((t) =>
      view === "month"
        ? new Date(t.date).getMonth() === cursor.getMonth() &&
          new Date(t.date).getFullYear() === cursor.getFullYear()
        : days.some((d) => dateKey(d) === dateKey(t.date)),
    ),
    m = metrics(visible),
    buckets = [...new Set(visible.map((t) => dateKey(t.date)))].map((k) =>
      metrics(byDay.get(k) ?? []),
    ),
    daily = selected ? (byDay.get(selected) ?? []) : [],
    dm = metrics(daily);
  function move(n: number) {
    setCursor((old) => {
      const d = new Date(old);
      if (view === "month") {
        d.setDate(1);
        d.setMonth(d.getMonth() + n);
      } else d.setDate(d.getDate() + n * 7);
      return d;
    });
  }
  async function share() {
    const text = `My AfterTrade journal · ${cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}\n${m.count} trades · ${fmtR(m.totalR)} · ${m.winRate.toFixed(1)}% win rate`;
    try {
      await navigator.clipboard.writeText(text);
      notify("Calendar summary copied");
    } catch {
      notify("Clipboard unavailable. Export your journal from Settings.");
    }
  }
  return (
    <>
      <div className="calendar-tools">
        <h2>
          <CalendarDays size={17} />
          {compact ? "Trading Calendar" : "Your trading days"}
        </h2>
        <div className="heading-actions">
          <Tabs
            value={view}
            onChange={setView}
            options={[
              { value: "month", label: "Month" },
              { value: "week", label: "Week" },
            ]}
          />
          <Button
            variant={compact ? "ghost" : "primary"}
            icon={Share2}
            onClick={share}
          >
            Share
          </Button>
        </div>
      </div>
      {!compact && (
        <div className="calendar-stats">
          {[
            ["TOTAL R", fmtR(m.totalR)],
            [
              "GREEN / RED DAYS",
              `${buckets.filter((x) => x.totalR > 0).length} · ${buckets.filter((x) => x.totalR < 0).length}`,
            ],
            ["WIN RATE", `${m.winRate.toFixed(0)}%`],
            ["TRADING DAYS", buckets.length],
            ["TRADES", m.count],
          ].map(([k, v], i) => (
            <div key={k}>
              <span className="eyebrow">{k}</span>
              <strong className={i < 3 ? "positive" : ""}>{v}</strong>
            </div>
          ))}
        </div>
      )}
      <section
        className={`calendar-panel ${compact ? "calendar-compact" : ""}`}
      >
        <div className="calendar-month">
          <IconButton
            icon={ChevronLeft}
            label="Previous period"
            onClick={() => move(-1)}
          />
          <strong>
            {cursor.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <IconButton
            icon={ChevronRight}
            label="Next period"
            onClick={() => move(1)}
          />
        </div>
        <div className="calendar-grid weekday-row">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((date) => {
            const k = dateKey(date),
              rows = byDay.get(k) ?? [],
              day = metrics(rows),
              outside = date.getMonth() !== cursor.getMonth();
            return (
              <button
                key={k}
                className={`calendar-day ${outside ? "outside" : ""} ${rows.length ? (day.totalR > 0 ? "green-day" : day.totalR < 0 ? "red-day" : "") : ""} ${k === dateKey(new Date()) ? "today" : ""}`}
                aria-label={`${date.toLocaleDateString()}, ${rows.length} trades, ${fmtR(day.totalR)}`}
                onClick={() => {
                  setSelected(k);
                  setFilter("all");
                }}
              >
                <span className="day-number">{date.getDate()}</span>
                {rows.length > 0 && (
                  <div>
                    <strong>{fmtR(day.totalR, compact ? 1 : 2)}</strong>
                    <small>
                      {rows.length} trade{rows.length !== 1 ? "s" : ""}
                      {compact ? "" : ` · ${day.totalR >= 0 ? "W" : "L"}`}
                    </small>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <aside
            className="day-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Trading day details"
          >
            <div className="section-heading">
              <h3>
                {new Date(`${selected}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <IconButton
                icon={X}
                label="Close day details"
                onClick={() => setSelected(null)}
              />
            </div>
            <div className="day-stats">
              {[
                ["Trades", dm.count],
                ["Win Rate", `${dm.winRate.toFixed(0)}%`],
                ["Total R", fmtR(dm.totalR)],
                ["Rules Followed", `${dm.rules.toFixed(0)}%`],
              ].map(([k, v], i) => (
                <div key={k}>
                  <small>{k}</small>
                  <strong className={i ? "positive" : ""}>{v}</strong>
                </div>
              ))}
            </div>
            <Tabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "win", label: "Wins" },
                { value: "loss", label: "Losses" },
                { value: "broken", label: "Rule Broken" },
              ]}
            />
            <div className="day-trade-list">
              {daily
                .filter((t) =>
                  filter === "all" || filter === "broken"
                    ? filter !== "broken" || !t.followedRules
                    : t.outcome === filter,
                )
                .map((t) => (
                  <button key={t.id} onClick={() => onTrade(t.id)}>
                    <Badge color={t.direction === "long" ? "green" : "red"}>
                      <ArrowUpRight size={15} />
                    </Badge>
                    <span>
                      <strong>{t.symbol}</strong>
                      <small>
                        {t.session} {fmtTime(t.date)}
                      </small>
                    </span>
                    <b
                      className={
                        t.r !== null && t.r < 0 ? "negative" : "positive"
                      }
                    >
                      {fmtR(t.r)}
                    </b>
                  </button>
                ))}
              {!daily.length && (
                <Empty
                  title="A day to pause"
                  description="No completed trades on this date."
                  icon={CalendarDays}
                />
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
