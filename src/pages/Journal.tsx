import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Bookmark,
  ListFilter,
  LayoutGrid,
  Table2,
  Download,
  Upload,
  Share2,
  SlidersHorizontal,
  CalendarDays,
  Layers,
  Globe2,
  Clock3,
  X,
  ArrowUpRight,
  Trash2,
  Sparkles,
} from "../lib/icons";
import type { Trade } from "../types";
import { useJournal } from "../context";
import {
  activeTrades,
  completed,
  metrics,
  fmtR,
  fmtMoney,
  fmtDate,
  parseCSV,
  uid,
  validateBackup,
  validTrade,
} from "../lib/domain";
import { download } from "../lib/storage";
import { importIntoJournal, startPersonalJournal } from "../lib/onboarding";
import {
  Button,
  IconButton,
  Badge,
  SearchBox,
  Tabs,
  Empty,
  Modal,
  FieldLabel,
  Rating,
} from "../components/ui";
import { TradeCard } from "../components/trades";

export default function Journal({
  trades,
  onTrade,
  onLog,
  openOnly = false,
}: {
  trades: Trade[];
  onTrade: (id: string) => void;
  onLog: () => void;
  openOnly?: boolean;
}) {
  const { data, update, notify } = useJournal(),
    [search, setSearch] = useState(""),
    [outcome, setOutcome] = useState("all"),
    [session, setSession] = useState("all"),
    [template, setTemplate] = useState("all"),
    [symbol, setSymbol] = useState("all"),
    [bookmarked, setBookmarked] = useState(false),
    [period, setPeriod] = useState("all"),
    [filtersOpen, setFiltersOpen] = useState(false),
    [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  useEffect(
    () => setPage(1),
    [search, outcome, session, template, symbol, bookmarked, period, sort],
  );
  const base = useMemo(
    () =>
      activeTrades(trades).filter((t) =>
        openOnly ? t.status === "open" : t.status === "completed",
      ),
    [trades, openOnly],
  );
  const filtered = useMemo(
    () =>
      base
        .filter(
          (t) =>
            (outcome === "all" || t.outcome === outcome) &&
            (!bookmarked || t.bookmarked) &&
            (session === "all" || t.session === session) &&
            (template === "all" || t.templateId === template) &&
            (symbol === "all" || t.symbol === symbol) &&
            (period === "all" ||
              new Date(t.date).getTime() >=
                Date.now() - Number(period) * 86400000) &&
            `${t.symbol} ${t.name} ${t.notes}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "r"
            ? (b.r ?? 0) - (a.r ?? 0)
            : sort === "oldest"
              ? a.date.localeCompare(b.date)
              : b.date.localeCompare(a.date),
        ),
    [
      base,
      outcome,
      bookmarked,
      session,
      template,
      symbol,
      period,
      search,
      sort,
    ],
  );
  const m = metrics(filtered),
    allStats = metrics(base),
    layout = data.settings.dataLayout,
    pages = Math.max(1, Math.ceil(filtered.length / 24)),
    currentPage = Math.min(page, pages),
    pageRows = filtered.slice((currentPage - 1) * 24, currentPage * 24);
  function clear() {
    setSearch("");
    setOutcome("all");
    setSession("all");
    setTemplate("all");
    setSymbol("all");
    setBookmarked(false);
    setPeriod("all");
  }
  function bulkDelete() {
    if (
      !selected.length ||
      !confirm(`Move ${selected.length} selected trades to trash?`)
    )
      return;
    update((d) => ({
      ...d,
      trades: d.trades.map((t) =>
        selected.includes(t.id)
          ? { ...t, deletedAt: new Date().toISOString() }
          : t,
      ),
    }));
    setSelected([]);
    notify("Selected trades moved to trash");
  }
  async function exportTrades(format: "csv" | "json") {
    if (format === "json")
      download(JSON.stringify(filtered, null, 2), "aftertrade-trades.json");
    else {
      const { csvExport } = await import("../lib/domain");
      download(csvExport(filtered), "aftertrade-trades.csv", "text/csv");
    }
    notify("Trade export downloaded");
  }
  return (
    <div className="journal-page">
      <aside className={`filter-rail ${filtersOpen ? "filters-open" : ""}`}>
        <div className="filter-rail-head">
          <span>
            <ListFilter size={14} />
            Filters
          </span>
          <button onClick={clear}>Clear all</button>
          <IconButton
            className="mobile-only"
            icon={X}
            label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
        </div>
        <FilterGroup title="Saved" icon={Bookmark}>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={bookmarked}
              onChange={(e) => setBookmarked(e.target.checked)}
            />
            Bookmarked only
          </label>
        </FilterGroup>
        <FilterGroup title="Date" icon={CalendarDays}>
          <select
            aria-label="Date filter"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </FilterGroup>
        <FilterGroup title="Template" icon={Layers}>
          <select
            aria-label="Checklist filter"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option value="all">All checklists</option>
            {data.checklists.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </FilterGroup>
        <FilterGroup title="Session" icon={Clock3}>
          {["all", ...data.settings.sessions].map((s) => (
            <button
              className={`filter-item ${session === s ? "selected" : ""}`}
              key={s}
              onClick={() => setSession(s)}
            >
              {s === "all" ? "All sessions" : s}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup title="Symbol" icon={Globe2}>
          <select
            aria-label="Symbol filter"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            <option value="all">All symbols</option>
            {[...new Set(base.map((t) => t.symbol))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FilterGroup>
        <FilterGroup title="Sort" icon={SlidersHorizontal}>
          <select
            aria-label="Sort trades"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="r">Highest R first</option>
          </select>
        </FilterGroup>
        <div className="filter-footer">
          <Button
            variant="secondary"
            icon={Upload}
            onClick={() => setImporting(true)}
          >
            Import trades
          </Button>
          <Button
            variant="ghost"
            icon={Download}
            onClick={() => void exportTrades("csv")}
          >
            Export CSV
          </Button>
        </div>
      </aside>
      <main className="journal-main">
        <div className="journal-title-row">
          <div>
            <h1>{openOnly ? "Open Trades" : "Trade History"}</h1>
            <p>
              {openOnly
                ? "Let your setups resolve. Record the process."
                : "Every trade is a chance to understand your edge."}
            </p>
          </div>
          <Button icon={Plus} onClick={onLog}>
            Log Trade
          </Button>
        </div>
        <div className="journal-toolbar">
          <IconButton
            icon={SlidersHorizontal}
            label="Toggle filters"
            className="filter-toggle"
            onClick={() => setFiltersOpen((v) => !v)}
          />
          <Tabs
            value={outcome}
            onChange={setOutcome}
            options={
              openOnly
                ? [{ value: "all", label: `All ${base.length}` }]
                : [
                    { value: "all", label: `All ${base.length}` },
                    { value: "win", label: `Win ${allStats.wins}` },
                    { value: "loss", label: `Loss ${allStats.losses}` },
                    { value: "breakeven", label: `B/E ${allStats.be}` },
                  ]
            }
          />
          {!openOnly && (
            <div className="journal-stat-pills">
              <span>
                <b>{m.winRate.toFixed(1)}%</b>
                <small>WR</small>
              </span>
              <span>
                <b>{fmtR(m.totalR)}</b>
                <small>Total</small>
              </span>
              <span>
                <b>{fmtR(m.avgR)}</b>
                <small>Avg R</small>
              </span>
            </div>
          )}
          <div className="toolbar-spacer" />
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search trades…"
          />
          <div className="layout-toggle">
            <IconButton
              className={layout === "cards" ? "selected" : ""}
              icon={LayoutGrid}
              label="Card grid"
              onClick={() =>
                update((d) => ({
                  ...d,
                  settings: { ...d.settings, dataLayout: "cards" },
                }))
              }
            />
            <IconButton
              className={layout === "table" ? "selected" : ""}
              icon={Table2}
              label="Table layout"
              onClick={() =>
                update((d) => ({
                  ...d,
                  settings: { ...d.settings, dataLayout: "table" },
                }))
              }
            />
          </div>
          <span className="micro muted">{filtered.length} trades</span>
          <IconButton
            icon={Download}
            label="Export filtered trades as JSON"
            onClick={() => void exportTrades("json")}
          />
        </div>
        {selected.length > 0 && (
          <div className="selection-bar">
            <span>{selected.length} selected</span>
            <Button variant="danger" icon={Trash2} onClick={bulkDelete}>
              Move to trash
            </Button>
            <Button variant="ghost" onClick={() => setSelected([])}>
              Cancel
            </Button>
          </div>
        )}
        {filtered.length ? (
          layout === "cards" ? (
            <div className="trade-grid">
              {pageRows.map((t) => (
                <TradeCard key={t.id} trade={t} onOpen={() => onTrade(t.id)} />
              ))}
            </div>
          ) : (
            <div className="journal-table table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="Select all visible trades"
                        type="checkbox"
                        checked={
                          pageRows.length > 0 &&
                          pageRows.every((t) => selected.includes(t.id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [
                                  ...new Set([
                                    ...selected,
                                    ...pageRows.map((t) => t.id),
                                  ]),
                                ]
                              : selected.filter(
                                  (id) => !pageRows.some((t) => t.id === id),
                                ),
                          )
                        }
                      />
                    </th>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Result</th>
                    <th>R</th>
                    <th>P&L</th>
                    <th>Session</th>
                    <th>Rating</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <input
                          aria-label={`Select ${t.symbol} trade`}
                          type="checkbox"
                          checked={selected.includes(t.id)}
                          onChange={(e) =>
                            setSelected((a) =>
                              e.target.checked
                                ? [...a, t.id]
                                : a.filter((id) => id !== t.id),
                            )
                          }
                        />
                      </td>
                      <td>{fmtDate(t.date, true)}</td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => onTrade(t.id)}
                        >
                          {t.symbol}
                        </button>
                      </td>
                      <td>
                        <Badge color={t.direction === "long" ? "green" : "red"}>
                          {t.direction}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          color={
                            t.outcome === "win"
                              ? "green"
                              : t.outcome === "loss"
                                ? "red"
                                : "neutral"
                          }
                        >
                          {t.outcome ?? "open"}
                        </Badge>
                      </td>
                      <td
                        className={
                          t.r !== null && t.r < 0 ? "negative" : "positive"
                        }
                      >
                        {fmtR(t.r)}
                      </td>
                      <td>{fmtMoney(t.pnl)}</td>
                      <td>{t.session}</td>
                      <td>
                        <Rating
                          value={t.rating}
                          onChange={(rating) =>
                            update((d) => ({
                              ...d,
                              trades: d.trades.map((row) =>
                                row.id === t.id ? { ...row, rating } : row,
                              ),
                            }))
                          }
                        />
                      </td>
                      <td className="notes-cell">
                        <input
                          aria-label={`Notes for ${t.symbol} trade`}
                          value={t.notes}
                          onChange={(e) =>
                            update((d) => ({
                              ...d,
                              trades: d.trades.map((row) =>
                                row.id === t.id
                                  ? { ...row, notes: e.target.value }
                                  : row,
                              ),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <Empty
            title={openOnly ? "A clear slate" : "Your story starts here"}
            description={
              base.length
                ? "No trades match these filters. Try clearing them."
                : "Run your checklist and record your next trade."
            }
            action={
              <Button icon={Plus} onClick={base.length ? clear : onLog}>
                {base.length ? "Clear filters" : "Log your first trade"}
              </Button>
            }
          />
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `Showing ${(currentPage - 1) * 24 + 1}–${Math.min(currentPage * 24, filtered.length)} of ${filtered.length} trades`
              : ""}
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              {currentPage} / {pages}
            </span>
            <Button
              variant="secondary"
              disabled={currentPage >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
      {importing && <ImportTrades onClose={() => setImporting(false)} />}
    </div>
  );
}
function FilterGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Bookmark;
  children: React.ReactNode;
}) {
  return (
    <section className="filter-group">
      <h3>
        <Icon size={13} />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ImportTrades({ onClose }: { onClose: () => void }) {
  const { data, update, notify, setAccount } = useJournal(),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [template, setTemplate] = useState(data.checklists[0]?.id ?? ""),
    [preview, setPreview] = useState<Trade[]>([]),
    [fileName, setFileName] = useState(""),
    [json, setJson] = useState<unknown>(null);
  const input = useRef<HTMLInputElement>(null);
  async function read(file?: File) {
    if (!file) return;
    setError("");
    setPreview([]);
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file smaller than 10 MB.");
      return;
    }
    setFileName(file.name);
    const content = await file.text();
    setText(content);
    setJson(null);
    if (file.name.endsWith(".json")) {
      try {
        setJson(JSON.parse(content));
      } catch {
        setError("The JSON file could not be read.");
      }
    }
  }
  function inspect() {
    setError("");
    try {
      if (json) {
        if (Array.isArray(json)) {
          const valid = json as Trade[];
          if (valid.some((t) => !validTrade(t)))
            throw new Error("This JSON trade export has invalid records.");
          setPreview(valid);
        } else {
          validateBackup(json);
        }
        return;
      }
      const rows = parseCSV(text);
      if (rows.length < 2)
        throw new Error("Add a header row and at least one trade.");
      const headers = rows[0].map((h) =>
        h
          .trim()
          .toLowerCase()
          .replaceAll(/[^a-z]/g, ""),
      );
      const col = (row: string[], names: string[]) =>
        row[headers.findIndex((h) => names.includes(h))]?.trim() ?? "";
      if (!headers.includes("symbol") || !headers.includes("direction"))
        throw new Error("The CSV needs symbol and direction columns.");
      if (!template)
        throw new Error("Create a checklist before importing CSV trades.");
      const parsed = rows.slice(1).map((row, i): Trade => {
        const symbol = col(row, ["symbol"]),
          direction = col(row, ["direction"]).toLowerCase(),
          rawDate = col(row, ["date", "tradedate", "datetime"]),
          r = col(row, ["r", "rmultiple", "result"]),
          pnl = col(row, ["pnl", "profit"]),
          outcome = col(row, ["outcome"]).toLowerCase();
        if (!symbol || !["long", "short"].includes(direction))
          throw new Error(
            `Row ${i + 2}: provide a symbol and long/short direction.`,
          );
        if (rawDate && !Number.isFinite(Date.parse(rawDate)))
          throw new Error(`Row ${i + 2}: use a valid ISO date.`);
        if (
          (r && !Number.isFinite(Number(r))) ||
          (pnl && !Number.isFinite(Number(pnl)))
        )
          throw new Error(`Row ${i + 2}: R and P&L must be numbers.`);
        const result =
          outcome ||
          (r
            ? Number(r) > 0
              ? "win"
              : Number(r) < 0
                ? "loss"
                : "breakeven"
            : "");
        if (result && !["win", "loss", "breakeven"].includes(result))
          throw new Error(
            `Row ${i + 2}: outcome must be win, loss or breakeven.`,
          );
        return {
          id: col(row, ["id"]) || uid(),
          symbol: symbol.toUpperCase(),
          direction: direction as Trade["direction"],
          date: rawDate
            ? new Date(rawDate).toISOString()
            : new Date().toISOString(),
          name: "",
          session: col(row, ["session"]),
          templateId: template,
          accountId: data.accounts[0]?.id ?? "",
          status: result ? "completed" : "open",
          outcome: (result as Trade["outcome"]) || null,
          r: r ? Number(r) : null,
          pnl: pnl ? Number(pnl) : null,
          risk: data.settings.defaultRisk,
          followedRules: col(row, ["followedrules"]) !== "false",
          notes: col(row, ["notes"]),
          emotions: [],
          answers: {},
          screenshots: [],
          rating: 0,
          bookmarked: false,
          mfe: null,
          mae: null,
          deletedAt: null,
        };
      });
      setPreview(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function save() {
    try {
      if (json && !Array.isArray(json)) {
        const backup = validateBackup(json);
        if (
          !confirm(
            "Replace this browser’s journal with the selected backup? Export your current data first if needed.",
          )
        )
          return;
        update(() => startPersonalJournal(backup));
        notify("Journal restored");
      } else {
        if (!preview.length) return;
        const result = importIntoJournal(data, preview);
        update(() => result.data);
        notify(
          `${result.imported} trades imported · ${result.duplicates} duplicates skipped${data.demo ? " · Demo data cleared" : ""}`,
        );
      }
      setAccount("all");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title="Import your journal"
      subtitle="Bring your trade history into one place."
      onClose={onClose}
    >
      <div className="modal-body">
        {data.demo && (
          <p className="inline-notice demo-import-notice">
            <Sparkles size={16} />
            <span>
              <strong>A fresh start for your trades.</strong> Your first import
              clears demo trades, notes and sample balances. Previewing or
              cancelling keeps the demo unchanged.
            </span>
          </p>
        )}
        <input
          hidden
          ref={input}
          type="file"
          accept=".csv,.json"
          onChange={(e) => void read(e.target.files?.[0])}
        />
        <button className="upload-zone" onClick={() => input.current?.click()}>
          <Upload size={27} />
          <strong>{fileName || "Choose a CSV or JSON file"}</strong>
          <small>Trade export or full AfterTrade backup · up to 10 MB</small>
        </button>
        <p className="small muted">
          CSV columns:{" "}
          <code>symbol, direction, date, outcome, r, pnl, session, notes</code>.
          Only symbol and direction are required. Dates use ISO format.
        </p>
        {!json && (
          <>
            <FieldLabel label="Assign to checklist">
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {data.checklists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Or paste CSV">
              <textarea
                rows={5}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setPreview([]);
                }}
                placeholder={
                  "symbol,direction,date,outcome,r\nNQ,long,2026-11-16T14:00:00,win,1.5"
                }
              />
            </FieldLabel>
          </>
        )}
        <Button variant="secondary" icon={ArrowUpRight} onClick={inspect}>
          Preview import
        </Button>
        {preview.length > 0 && (
          <div className="import-preview">
            <h3>{preview.length} trades ready</h3>
            {preview.slice(0, 4).map((t, i) => (
              <div key={i}>
                <strong>{t.symbol}</strong>
                <span>{t.direction}</span>
                <Badge color={t.outcome === "win" ? "green" : "neutral"}>
                  {t.outcome ?? "open"}
                </Badge>
                <span>{fmtR(t.r)}</span>
              </div>
            ))}
          </div>
        )}
        {!!json && !Array.isArray(json) && !error && (
          <p className="inline-notice">
            Full backup selected. Restoring replaces the current journal.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
      <footer className="modal-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          icon={CheckIcon}
          disabled={
            !!error || (!preview.length && !(json && !Array.isArray(json)))
          }
          onClick={save}
        >
          {json && !Array.isArray(json) ? "Restore backup" : "Import trades"}
        </Button>
      </footer>
    </Modal>
  );
}
const CheckIcon = ArrowUpRight;
