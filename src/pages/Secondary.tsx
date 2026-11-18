import { useMemo, useState, useRef } from "react";
import {
  Plus,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Target,
  AlertTriangle,
  FlaskConical,
  Check,
  StickyNote,
  Pin,
  Pencil,
  Trash2,
  Search,
  Wallet,
  Archive,
  Download,
  Upload,
  Settings2,
  ShieldCheck,
  EyeOff,
  Database,
  ExternalLink,
  Users,
  MessageSquare,
  Share2,
  BookOpen,
  Calculator,
  CalendarDays,
  RefreshCw,
  FileText,
  Copy,
  ArrowLeft,
} from "../lib/icons";
import type { Trade, Note, Account, Settings, Group } from "../types";
import { useJournal } from "../context";
import {
  metrics,
  completed,
  fmtR,
  fmtMoney,
  fmtDate,
  uid,
  makeReview,
  simulate,
  breakdown,
  validateBackup,
} from "../lib/domain";
import { download } from "../lib/storage";
import {
  Button,
  IconButton,
  Badge,
  PageHeading,
  Modal,
  FieldLabel,
  Empty,
  SearchBox,
  Tabs,
  SectionTitle,
  Metric,
} from "../components/ui";
import { LineChart, BarChart } from "../components/charts";
import { equityValues } from "../components/analytics";
import { ImportTrades } from "./Journal";

export function Reviews({ trades }: { trades: Trade[] }) {
  const { data, update, notify } = useJournal(),
    [template, setTemplate] = useState("all"),
    [selected, setSelected] = useState(""),
    [section, setSection] = useState("snapshot");
  const history = data.reviews
      .filter((r) => r.templateId === template)
      .sort((a, b) => b.date.localeCompare(a.date)),
    review = history.find((r) => r.id === selected) ?? history[0],
    relevant = completed(trades).filter(
      (t) => template === "all" || t.templateId === template,
    ),
    m = metrics(relevant);
  const sections = [
    "Snapshot",
    "Strongest edge",
    "Patterns",
    "Risk",
    "Action plan",
    "Questions",
  ];
  function generate() {
    if (relevant.length < 3) {
      notify("Complete at least 3 trades to create a useful review.");
      return;
    }
    const r = makeReview(trades, template);
    update((d) => ({ ...d, reviews: [r, ...d.reviews] }));
    setSelected(r.id);
    notify("Journal review ready");
  }
  return (
    <div className="workspace-content review-page">
      <PageHeading
        title="Review assistant"
        subtitle="A thoughtful second look at the process behind your trades."
        icon={Sparkles}
      >
        <select
          aria-label="Review checklist"
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value);
            setSelected("");
          }}
        >
          <option value="all">All checklists (combined)</option>
          {data.checklists.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button icon={Sparkles} onClick={generate}>
          {review ? "Refresh review" : "Generate review"}
        </Button>
      </PageHeading>
      <div className="review-meta">
        <Badge color="blue">Data-driven review</Badge>
        <span>Computed from your journal · no external AI calls</span>
      </div>
      <div className="review-history">
        {history.slice(0, 8).map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={r.id === review?.id ? "selected" : ""}
          >
            {fmtDate(r.date)}
          </button>
        ))}
      </div>
      {review ? (
        <>
          <section className="panel coach-summary">
            <span className="eyebrow accent">Coach’s summary</span>
            <h2>{review.summary}</h2>
            <p>
              Your {review.tradeCount} completed trades recorded a{" "}
              {review.winRate.toFixed(1)}% win rate and {fmtR(review.avgR)}{" "}
              average R. Use these observations to guide your next review, with
              sample size in mind.
            </p>
            <small>
              Created {fmtDate(review.date)} · a snapshot of your journal at
              that moment
            </small>
          </section>
          <div className="review-anchor-nav">
            {sections.map((s) => (
              <a
                key={s}
                className={section === s.toLowerCase() ? "selected" : ""}
                href={`#${s}`}
                onClick={(e) => {
                  e.preventDefault();
                  setSection(s.toLowerCase());
                  document
                    .getElementById(
                      `review-${s.toLowerCase().replaceAll(" ", "-")}`,
                    )
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {s}
              </a>
            ))}
          </div>
          <section id="review-snapshot" className="review-snapshot-grid">
            {[
              {
                label: "Reviewed trades",
                value: review.tradeCount,
                sub: "Completed trades in this review",
              },
              {
                label: "Win rate",
                value: `${review.winRate.toFixed(1)}%`,
                sub: "Excludes breakeven outcomes",
              },
              {
                label: "Average result",
                value: fmtR(review.avgR),
                sub: "Based on recorded R multiples",
              },
            ].map((c) => (
              <Metric
                key={c.label}
                label={c.label}
                value={c.value}
                sub={c.sub}
                tone="positive"
              />
            ))}
          </section>
          <ReviewSection
            id="strongest-edge"
            title="Strongest edge this period"
            icon={Target}
            tone="purple"
          >
            <h3>{review.strengths[1]}</h3>
            <p>{review.strengths[0]}</p>
            <div className="row">
              <Badge color={review.tradeCount < 30 ? "gold" : "green"}>
                {review.tradeCount < 30 ? "Small sample" : "Building evidence"}
              </Badge>
              <span className="micro muted">{review.tradeCount} trades</span>
            </div>
          </ReviewSection>
          <ReviewSection
            id="patterns"
            title="Key patterns"
            icon={Sparkles}
            tone="green"
          >
            {review.strengths.map((s, i) => (
              <p key={i}>
                <Check size={14} className="positive" />
                {s}
              </p>
            ))}
          </ReviewSection>
          <ReviewSection
            id="risk"
            title="What to watch"
            icon={AlertTriangle}
            tone="red"
          >
            {review.watch.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </ReviewSection>
          <ReviewSection
            id="action-plan"
            title="Action plan"
            icon={FlaskConical}
            tone="green"
          >
            {review.actions.map((s, i) => (
              <div className="action-row" key={i}>
                <Badge color={i === 0 ? "green" : i === 1 ? "gold" : "blue"}>
                  {["Do more", "Watch", "Test"][i]}
                </Badge>
                <p>{s}</p>
              </div>
            ))}
          </ReviewSection>
          <ReviewSection
            id="questions"
            title="Questions to ask yourself"
            icon={MessageSquare}
            tone="purple"
          >
            {[
              "Which condition was present in your cleanest trades?",
              "Did your risk change after a losing trade?",
              "What is one behaviour you can repeat next session?",
            ].map((q, i) => (
              <div className="coach-question" key={q}>
                <span>{i + 1}</span>
                {q}
              </div>
            ))}
          </ReviewSection>
        </>
      ) : (
        <div className="review-intro">
          <div className="assistant-orb">
            <Sparkles size={32} />
          </div>
          <Badge>Meet your review assistant</Badge>
          <h2>
            Your journal has a story.
            <br />
            <span className="gradient-text">Let’s make sense of it.</span>
          </h2>
          <p>
            Surface strong sessions, recurring habits and one practical next
            step. Every observation starts with the trades you’ve recorded.
          </p>
          <div className="review-intro-cards">
            <Metric label="Completed trades" value={m.count} />
            <Metric
              label="Win rate"
              value={`${m.winRate.toFixed(1)}%`}
              tone="positive"
            />
            <Metric label="Avg R" value={fmtR(m.avgR)} tone="positive" />
          </div>
          <Button
            icon={Sparkles}
            onClick={generate}
            disabled={relevant.length < 3}
          >
            Create your first review
          </Button>
          <small className="muted">
            {relevant.length < 3
              ? "Complete 3 trades to get started."
              : "Runs locally. Your journal stays on this device."}
          </small>
        </div>
      )}
    </div>
  );
}
function ReviewSection({
  id,
  title,
  icon: Icon,
  tone,
  children,
}: {
  id: string;
  title: string;
  icon: typeof Sparkles;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`review-${id}`}
      className={`panel review-section review-section-${tone}`}
    >
      <span className="eyebrow">
        <Icon size={16} />
        {title}
      </span>
      {children}
    </section>
  );
}

export function Notebook() {
  const { data, update, notify } = useJournal(),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [editing, setEditing] = useState<Note | null>(null);
  const categories = [
    "Mindset",
    "Strategy",
    "Lesson",
    "Idea",
    "Mistake",
    "Reminder",
  ];
  const notes = data.notes
    .filter(
      (n) =>
        `${n.title} ${n.content}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (category === "all" || n.category === category),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date),
    );
  function create() {
    setEditing({
      id: uid(),
      title: "",
      content: "",
      category: "Mindset",
      emotion: "",
      pinned: false,
      color: "purple",
      date: new Date().toISOString(),
      tradeIds: [],
    });
  }
  return (
    <div className="workspace-content notebook-page">
      <PageHeading
        title="Notebook"
        subtitle="Make a note of the moment. Remember what mattered."
        icon={StickyNote}
      >
        <Button icon={Plus} onClick={create}>
          New entry
        </Button>
      </PageHeading>
      <div className="notebook-controls">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search your journal…"
        />
        <select
          aria-label="Note category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="micro muted">{notes.length} entries</span>
      </div>
      <div className="notes-grid">
        {notes.map((n) => (
          <article key={n.id} className={`panel notebook-card note-${n.color}`}>
            <div className="section-heading">
              <Badge color={n.color}>{n.category}</Badge>
              <div className="row">
                <IconButton
                  icon={Pin}
                  label={n.pinned ? "Unpin entry" : "Pin entry"}
                  className={n.pinned ? "accent" : ""}
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      notes: d.notes.map((a) =>
                        a.id === n.id ? { ...a, pinned: !a.pinned } : a,
                      ),
                    }))
                  }
                />
                <IconButton
                  icon={Pencil}
                  label={`Edit ${n.title}`}
                  onClick={() => setEditing(n)}
                />
              </div>
            </div>
            <button className="note-open" onClick={() => setEditing(n)}>
              <h2>{n.title}</h2>
              <p>{n.content}</p>
            </button>
            <div className="note-footer">
              <span>{fmtDate(n.date)}</span>
              {n.emotion && <span>{n.emotion}</span>}
              {n.pinned && (
                <span className="accent">
                  <Pin size={11} />
                  Pinned
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!notes.length && (
        <Empty
          title="A place to think clearly"
          description="Capture what you saw, what you learned, and what you’ll do differently."
          action={
            <Button icon={Plus} onClick={create}>
              Write your first entry
            </Button>
          }
        />
      )}
      {editing && (
        <NoteEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(note) => {
            update((d) => ({
              ...d,
              notes: d.notes.some((n) => n.id === note.id)
                ? d.notes.map((n) => (n.id === note.id ? note : n))
                : [note, ...d.notes],
            }));
            setEditing(null);
            notify("Journal entry saved");
          }}
          onDelete={() => {
            if (confirm("Delete this journal entry permanently?")) {
              update((d) => ({
                ...d,
                notes: d.notes.filter((n) => n.id !== editing.id),
              }));
              setEditing(null);
              notify("Journal entry deleted");
            }
          }}
        />
      )}
    </div>
  );
}
function NoteEditor({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Note;
  onClose: () => void;
  onSave: (note: Note) => void;
  onDelete: () => void;
}) {
  const { data } = useJournal(),
    [note, set] = useState({ ...initial });
  return (
    <Modal
      title={initial.title || "New journal entry"}
      subtitle="What did you notice? What should you remember next time?"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...note, date: new Date().toISOString() });
        }}
      >
        <div className="modal-body">
          <FieldLabel label="Title">
            <input
              required
              autoFocus
              value={note.title}
              onChange={(e) => set((n) => ({ ...n, title: e.target.value }))}
              placeholder="Give your thought a title…"
            />
          </FieldLabel>
          <FieldLabel label="Your notes">
            <textarea
              required
              className="journal-editor"
              rows={9}
              value={note.content}
              onChange={(e) => set((n) => ({ ...n, content: e.target.value }))}
              placeholder="What happened? What did you learn? What will you repeat?"
            />
          </FieldLabel>
          <div className="form-grid">
            <FieldLabel label="Category">
              <select
                value={note.category}
                onChange={(e) =>
                  set((n) => ({ ...n, category: e.target.value }))
                }
              >
                {[
                  "Mindset",
                  "Strategy",
                  "Lesson",
                  "Idea",
                  "Mistake",
                  "Reminder",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Emotion">
              <select
                value={note.emotion}
                onChange={(e) =>
                  set((n) => ({ ...n, emotion: e.target.value }))
                }
              >
                <option value="">No emotion</option>
                {["Calm", "Focused", "Confident", "Anxious", "Frustrated"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </FieldLabel>
            <FieldLabel label="Colour">
              <select
                value={note.color}
                onChange={(e) => set((n) => ({ ...n, color: e.target.value }))}
              >
                {["purple", "green", "blue", "gold"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Link a trade">
              <select
                value={note.tradeIds[0] ?? ""}
                onChange={(e) =>
                  set((n) => ({
                    ...n,
                    tradeIds: e.target.value ? [e.target.value] : [],
                  }))
                }
              >
                <option value="">No linked trade</option>
                {completed(data.trades)
                  .slice(0, 100)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.symbol} · {fmtDate(t.date, true)} · {fmtR(t.r)}
                    </option>
                  ))}
              </select>
            </FieldLabel>
          </div>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={note.pinned}
              onChange={(e) => set((n) => ({ ...n, pinned: e.target.checked }))}
            />
            Pin this entry to your dashboard
          </label>
        </div>
        <footer className="modal-footer">
          <Button variant="danger" icon={Trash2} onClick={onDelete}>
            Delete
          </Button>
          <Button type="submit" icon={Check}>
            Save entry
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function RCalculator({ trades }: { trades: Trade[] }) {
  const [tp, setTp] = useState(2),
    [sl, setSl] = useState(1),
    [mode, setMode] = useState<"conservative" | "optimistic" | "exclude">(
      "conservative",
    ),
    simulated = useMemo(
      () => simulate(trades, tp, sl, mode),
      [trades, tp, sl, mode],
    ),
    usable = completed(trades).filter(
      (t) => t.mfe !== null && t.mae !== null && t.r !== null,
    ),
    actual = metrics(usable),
    m = metrics(simulated);
  const sweep = Array.from(
    { length: 12 },
    (_, i) => metrics(simulate(usable, (i + 1) * 0.5, sl, mode)).totalR,
  );
  return (
    <div className="workspace-content">
      <PageHeading
        title="R Calculator"
        subtitle="What take-profit fits your data? Explore the trade-offs."
        icon={Calculator}
      >
        <Badge color="purple">{usable.length} trades with excursion data</Badge>
      </PageHeading>
      <section className="panel simulation-controls">
        <FieldLabel label={`Take profit · ${tp.toFixed(2)}R`}>
          <input
            aria-label="Take profit R"
            type="range"
            min="0.25"
            max="6"
            step="0.25"
            value={tp}
            onChange={(e) => setTp(Number(e.target.value))}
          />
        </FieldLabel>
        <FieldLabel label={`Stop loss · ${sl.toFixed(2)}R`}>
          <input
            aria-label="Stop loss R"
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={sl}
            onChange={(e) => setSl(Number(e.target.value))}
          />
        </FieldLabel>
        <FieldLabel label="When stop and target were both reached">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="conservative">Conservative · stop first</option>
            <option value="optimistic">Optimistic · target first</option>
            <option value="exclude">Exclude ambiguous trades</option>
          </select>
        </FieldLabel>
      </section>
      <div className="metric-grid four">
        <Metric
          label="Simulated total R"
          value={fmtR(m.totalR)}
          tone={m.totalR >= 0 ? "positive" : "negative"}
          sub={`Actual ${fmtR(actual.totalR)}`}
        />
        <Metric
          label="Simulated win rate"
          value={`${m.winRate.toFixed(1)}%`}
          tone="positive"
          sub={`Actual ${actual.winRate.toFixed(1)}%`}
        />
        <Metric
          label="Expectancy"
          value={fmtR(m.avgR)}
          tone={m.avgR >= 0 ? "positive" : "negative"}
        />
        <Metric
          label="Max drawdown"
          value={`${m.drawdown.toFixed(2)}R`}
          tone="negative"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <SectionTitle title="Take-profit performance" icon={Target} />
          <BarChart
            values={sweep}
            labels={sweep.map((_, i) => `${(i + 1) * 0.5}R`)}
            height={220}
          />
          <p className="muted micro">
            Total R at each target, using your selected stop.
          </p>
        </section>
        <section className="panel">
          <SectionTitle title="Simulated equity curve" icon={FlaskConical} />
          <LineChart values={equityValues(simulated)} height={220} />
        </section>
      </div>
      <div className="inline-notice">
        <AlertTriangle size={17} />
        <span>
          Excursions show extremes, not which price was reached first. This is a
          hypothetical comparison. A target that was never reached counts as a
          loss at the selected stop.
        </span>
      </div>
      <section className="panel">
        <SectionTitle title="Trade-by-trade comparison" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Trade</th>
                <th>Date</th>
                <th>MFE</th>
                <th>MAE</th>
                <th>Actual</th>
                <th>Simulated</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {simulated.slice(0, 50).map((t) => {
                const old = usable.find((a) => a.id === t.id);
                return (
                  <tr key={t.id}>
                    <td>{t.symbol}</td>
                    <td>{fmtDate(t.date, true)}</td>
                    <td>{fmtR(t.mfe)}</td>
                    <td>{fmtR(t.mae)}</td>
                    <td>{fmtR(old?.r ?? null)}</td>
                    <td className={t.r! >= 0 ? "positive" : "negative"}>
                      {fmtR(t.r)}
                    </td>
                    <td>{fmtR(t.r! - (old?.r ?? 0))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!usable.length && (
            <Empty
              title="Add the context behind the move"
              description="Record MFE, MAE and realised R on completed trades to explore this analysis."
              icon={Target}
            />
          )}
        </div>
      </section>
    </div>
  );
}

export function Accounts() {
  const { data, update, notify } = useJournal(),
    [editing, setEditing] = useState<Account | null>(null),
    [showArchived, setShowArchived] = useState(false);
  const list = data.accounts.filter(
    (a) => showArchived || a.status === "active",
  );
  function create() {
    setEditing({
      id: uid(),
      name: "",
      type: "Demo",
      balance: 25000,
      target: 2000,
      maxDrawdown: 2500,
      dailyDrawdown: 1000,
      status: "active",
      payouts: [],
    });
  }
  function payout(a: Account) {
    const input = prompt("Record a payout amount ($)");
    if (!input) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Enter a positive payout amount");
      return;
    }
    update((d) => ({
      ...d,
      accounts: d.accounts.map((x) =>
        x.id === a.id
          ? {
              ...x,
              payouts: [
                ...x.payouts,
                {
                  amount,
                  date: new Date().toISOString(),
                  note: "Recorded payout",
                },
              ],
            }
          : x,
      ),
    }));
    notify("Payout recorded");
  }
  return (
    <div className="workspace-content">
      <PageHeading
        title="Accounts"
        subtitle="Keep your capital, targets and risk in perspective."
        icon={Wallet}
      >
        <Button
          variant="secondary"
          icon={Archive}
          onClick={() => setShowArchived((s) => !s)}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
        <Button icon={Plus} onClick={create}>
          Add account
        </Button>
      </PageHeading>
      <div className="account-grid">
        {list.map((a) => {
          const m = metrics(data.trades.filter((t) => t.accountId === a.id)),
            payouts = a.payouts.reduce((s, p) => s + p.amount, 0),
            balance = a.balance + (m.pnl ?? 0) - payouts,
            progress =
              a.target > 0
                ? Math.max(0, Math.min(100, ((m.pnl ?? 0) / a.target) * 100))
                : 0;
          return (
            <section className="panel account-card" key={a.id}>
              <div className="section-heading">
                <span className="account-icon">
                  <Wallet size={22} />
                </span>
                <div className="toolbar-spacer" />
                <Badge color={a.status === "archived" ? "neutral" : "green"}>
                  {a.status}
                </Badge>
                <IconButton
                  icon={Pencil}
                  label={`Edit ${a.name}`}
                  onClick={() => setEditing(a)}
                />
              </div>
              <h2>{a.name}</h2>
              <span className="micro muted">{a.type} account</span>
              <div className="account-balance">
                <span className="eyebrow">Balance</span>
                <strong>{fmtMoney(balance)}</strong>
                <span className={(m.pnl ?? 0) >= 0 ? "positive" : "negative"}>
                  {fmtMoney(m.pnl)} total P&L
                </span>
              </div>
              <div className="account-details">
                <div>
                  <span>Starting balance</span>
                  <b>{fmtMoney(a.balance)}</b>
                </div>
                <div>
                  <span>Total R</span>
                  <b className="positive">{fmtR(m.totalR)}</b>
                </div>
                <div>
                  <span>Win rate</span>
                  <b>{m.winRate.toFixed(1)}%</b>
                </div>
                <div>
                  <span>Drawdown limit</span>
                  <b>{fmtMoney(a.maxDrawdown)}</b>
                </div>
                <div>
                  <span>Payouts</span>
                  <b>{fmtMoney(payouts)}</b>
                </div>
              </div>
              <div className="account-target">
                <div>
                  <span>Profit target</span>
                  <strong>{progress.toFixed(0)}%</strong>
                </div>
                <div className="progress">
                  <div style={{ width: `${progress}%` }} />
                </div>
                <small>
                  {fmtMoney(m.pnl ?? 0)} / {fmtMoney(a.target)}
                </small>
              </div>
              <div className="row">
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() => payout(a)}
                >
                  Record payout
                </Button>
                <IconButton
                  icon={Archive}
                  label={
                    a.status === "active"
                      ? "Archive account"
                      : "Restore account"
                  }
                  onClick={() => {
                    update((d) => ({
                      ...d,
                      accounts: d.accounts.map((x) =>
                        x.id === a.id
                          ? {
                              ...x,
                              status:
                                x.status === "active" ? "archived" : "active",
                            }
                          : x,
                      ),
                    }));
                    notify("Account updated");
                  }}
                />
              </div>
            </section>
          );
        })}
      </div>
      {!list.length && (
        <Empty
          title="Give your trades a home"
          description="Add an account to track your balance and targets."
          icon={Wallet}
          action={
            <Button icon={Plus} onClick={create}>
              Create an account
            </Button>
          }
        />
      )}
      {editing && (
        <AccountEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(a) => {
            update((d) => ({
              ...d,
              accounts: d.accounts.some((x) => x.id === a.id)
                ? d.accounts.map((x) => (x.id === a.id ? a : x))
                : [...d.accounts, a],
            }));
            setEditing(null);
            notify("Account saved");
          }}
        />
      )}
    </div>
  );
}
function AccountEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Account;
  onClose: () => void;
  onSave: (a: Account) => void;
}) {
  const [a, set] = useState({ ...initial });
  return (
    <Modal
      title={initial.name ? "Edit account" : "New trading account"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(a);
        }}
      >
        <div className="modal-body">
          <FieldLabel label="Account name">
            <input
              autoFocus
              required
              value={a.name}
              onChange={(e) => set((s) => ({ ...s, name: e.target.value }))}
              placeholder="e.g. Evaluation 50K"
            />
          </FieldLabel>
          <div className="form-grid">
            <FieldLabel label="Type">
              <select
                value={a.type}
                onChange={(e) =>
                  set((s) => ({
                    ...s,
                    type: e.target.value as Account["type"],
                  }))
                }
              >
                {["Live", "Demo", "Funded", "1-Step", "2-Step"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </FieldLabel>
            {(
              ["balance", "target", "maxDrawdown", "dailyDrawdown"] as const
            ).map((key, i) => (
              <FieldLabel
                key={key}
                label={
                  [
                    "Starting balance ($)",
                    "Profit target ($)",
                    "Total drawdown limit ($)",
                    "Daily drawdown limit ($)",
                  ][i]
                }
              >
                <input
                  type="number"
                  min="0"
                  required
                  step="0.01"
                  value={a[key]}
                  onChange={(e) =>
                    set((s) => ({ ...s, [key]: Number(e.target.value) }))
                  }
                />
              </FieldLabel>
            ))}
          </div>
        </div>
        <footer className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={Check}>
            Save account
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export function Preferences({ profile = false }: { profile?: boolean }) {
  const { data, update, notify, saveError } = useJournal(),
    [s, set] = useState<Settings>(structuredClone(data.settings)),
    [importing, setImporting] = useState(false);
  function save() {
    update((d) => ({
      ...d,
      settings: {
        ...s,
        name: s.name.trim(),
        sessions: s.sessions.filter(Boolean),
        symbols: s.symbols.filter(Boolean),
      },
    }));
    notify("Preferences saved");
  }
  function clear() {
    if (
      !confirm(
        "Start a fresh journal? This clears trades, entries and reviews on this device. Export a backup first if you want to keep them.",
      )
    )
      return;
    update((d) => ({
      ...d,
      trades: [],
      notes: [],
      reviews: [],
      groups: [],
      demo: false,
      onboardingCompleted: true,
    }));
    notify("Your fresh journal is ready");
  }
  return (
    <div className="workspace-content settings-page">
      <PageHeading
        title={profile ? "Your profile" : "Settings"}
        subtitle="Make the journal feel like yours."
        icon={Settings2}
      >
        <Button icon={Check} onClick={save}>
          Save preferences
        </Button>
      </PageHeading>
      <div className="settings-layout">
        <nav className="settings-nav">
          {["General", "Trading", "Guardrails", "Data & backup"].map((name) => (
            <a
              key={name}
              href={`#${name}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(`settings-${name}`)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {name}
            </a>
          ))}
        </nav>
        <div className="settings-panels">
          <section id="settings-General" className="panel">
            <SectionTitle title="General" />
            <FieldLabel label="Your name">
              <input
                value={s.name}
                onChange={(e) => set((a) => ({ ...a, name: e.target.value }))}
                maxLength={80}
                placeholder="Your first name"
              />
            </FieldLabel>
            <div className="form-section">
              <span className="label">Appearance</span>
              <div className="theme-grid">
                {[
                  {
                    id: "purple",
                    title: "Colorful Dark",
                    sub: "Violet glow. A focused workspace.",
                  },
                  {
                    id: "clean",
                    title: "Clean Dark",
                    sub: "Quiet, neutral and restrained.",
                  },
                  {
                    id: "light",
                    title: "Light",
                    sub: "A clear view in daylight.",
                  },
                ].map((theme) => (
                  <button
                    key={theme.id}
                    className={s.theme === theme.id ? "selected" : ""}
                    onClick={() => {
                      set((a) => ({
                        ...a,
                        theme: theme.id as Settings["theme"],
                      }));
                      update((d) => ({
                        ...d,
                        settings: {
                          ...d.settings,
                          theme: theme.id as Settings["theme"],
                        },
                      }));
                    }}
                  >
                    <span className={`theme-swatch swatch-${theme.id}`} />
                    <strong>{theme.title}</strong>
                    <small>{theme.sub}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="switch-row">
              <div>
                <strong>Blinded mode</strong>
                <p>Hide dashboard statistics and focus on execution.</p>
              </div>
              <input
                role="switch"
                type="checkbox"
                checked={s.blinded}
                onChange={(e) =>
                  set((a) => ({ ...a, blinded: e.target.checked }))
                }
              />
            </label>
          </section>
          <section id="settings-Trading" className="panel">
            <SectionTitle title="Trading preferences" />
            <div className="form-grid">
              <FieldLabel label="Default risk %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={s.defaultRisk}
                  onChange={(e) =>
                    set((a) => ({
                      ...a,
                      defaultRisk: Math.min(
                        100,
                        Math.max(0, Number(e.target.value)),
                      ),
                    }))
                  }
                />
              </FieldLabel>
              <FieldLabel label="Trade logging flow">
                <select
                  value={s.loggingMode}
                  onChange={(e) =>
                    set((a) => ({
                      ...a,
                      loggingMode: e.target.value as Settings["loggingMode"],
                    }))
                  }
                >
                  <option value="pre">Pre / during trade</option>
                  <option value="post">After trade — 2-step journal</option>
                </select>
              </FieldLabel>
            </div>
            <FieldLabel label="Trading symbols (comma separated)">
              <input
                value={s.symbols.join(", ")}
                onChange={(e) =>
                  set((a) => ({
                    ...a,
                    symbols: e.target.value
                      .split(",")
                      .map((v) => v.trim().toUpperCase()),
                  }))
                }
              />
            </FieldLabel>
            <FieldLabel label="Sessions (comma separated)">
              <input
                value={s.sessions.join(", ")}
                onChange={(e) =>
                  set((a) => ({
                    ...a,
                    sessions: e.target.value.split(",").map((v) => v.trim()),
                  }))
                }
              />
            </FieldLabel>
            <p className="small muted">
              Dates and times follow this browser’s local timezone:{" "}
              {Intl.DateTimeFormat().resolvedOptions().timeZone}.
            </p>
          </section>
          <section id="settings-Guardrails" className="panel">
            <SectionTitle title="Daily guardrails" icon={ShieldCheck} />
            <p className="small muted">
              Reminders to pause when your process needs a reset.
            </p>
            <div className="form-grid">
              <FieldLabel label="Daily loss threshold (R)">
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={s.maxDailyLoss}
                  onChange={(e) =>
                    set((a) => ({
                      ...a,
                      maxDailyLoss: Math.max(0.25, Number(e.target.value)),
                    }))
                  }
                />
              </FieldLabel>
              <FieldLabel label="Maximum trades per day">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={s.maxTrades}
                  onChange={(e) =>
                    set((a) => ({
                      ...a,
                      maxTrades: Math.max(
                        1,
                        Math.floor(Number(e.target.value)),
                      ),
                    }))
                  }
                />
              </FieldLabel>
            </div>
          </section>
          <section id="settings-Data & backup" className="panel">
            <SectionTitle title="Data & backup" icon={Database} />
            <p className="small muted">
              Your journal is saved in this browser. Back it up to move devices
              or keep a separate copy.
            </p>
            {saveError && <p className="form-error">{saveError}</p>}
            <div className="backup-actions">
              <Button
                variant="secondary"
                icon={Download}
                onClick={() => {
                  download(
                    JSON.stringify(data),
                    `aftertrade-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  );
                  notify("Full journal backup downloaded");
                }}
              >
                Export full backup
              </Button>
              <Button
                variant="secondary"
                icon={Upload}
                onClick={() => setImporting(true)}
              >
                Import / restore
              </Button>
            </div>
            <div className="storage-summary">
              {[
                ["Trades", data.trades.length],
                ["Checklists", data.checklists.length],
                ["Journal entries", data.notes.length],
                ["Accounts", data.accounts.length],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="danger-zone">
              <div>
                <h3>Start a fresh journal</h3>
                <p>
                  Clear trade history, notes, rooms and reviews. Keep your
                  checklists and settings.
                </p>
              </div>
              <Button variant="danger" onClick={clear}>
                Clear journal
              </Button>
            </div>
          </section>
        </div>
      </div>
      {importing && <ImportTrades onClose={() => setImporting(false)} />}
    </div>
  );
}

export function Trash() {
  const { data, update, notify } = useJournal(),
    rows = data.trades.filter((t) => t.deletedAt);
  function remove(id?: string) {
    if (!confirm("Permanently delete these trades? This cannot be undone."))
      return;
    update((d) => ({
      ...d,
      trades: d.trades.filter((t) => (id ? t.id !== id : !t.deletedAt)),
    }));
    notify("Trades permanently removed");
  }
  return (
    <div className="workspace-content">
      <PageHeading
        title="Trash"
        subtitle="Restore a trade, or let it go for good."
        icon={Trash2}
      >
        <Button
          variant="danger"
          onClick={() => remove()}
          disabled={!rows.length}
        >
          Empty trash
        </Button>
      </PageHeading>
      {rows.length ? (
        <section className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Direction</th>
                <th>Result</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.date)}</td>
                  <td>{t.symbol}</td>
                  <td>{t.direction}</td>
                  <td>{fmtR(t.r)}</td>
                  <td>
                    <div className="row">
                      <Button
                        variant="secondary"
                        icon={RefreshCw}
                        onClick={() => {
                          update((d) => ({
                            ...d,
                            trades: d.trades.map((x) =>
                              x.id === t.id ? { ...x, deletedAt: null } : x,
                            ),
                          }));
                          notify("Trade restored");
                        }}
                      >
                        Restore
                      </Button>
                      <IconButton
                        icon={Trash2}
                        label={`Permanently delete ${t.symbol}`}
                        onClick={() => remove(t.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <Empty
          title="Nothing left behind"
          description="Trades you move to trash will appear here until you restore or permanently remove them."
          icon={Trash2}
        />
      )}
    </div>
  );
}

export function Rooms({
  trades,
  onTrade,
}: {
  trades: Trade[];
  onTrade: (id: string) => void;
}) {
  const { data, update, notify } = useJournal(),
    [active, setActive] = useState(""),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [note, setNote] = useState("");
  const room = data.groups.find((g) => g.id === active);
  function create() {
    if (!name.trim()) return;
    const g: Group = {
      id: uid(),
      name: name.trim(),
      description,
      tradeIds: [],
      notes: [],
    };
    update((d) => ({ ...d, groups: [...d.groups, g] }));
    setCreating(false);
    setActive(g.id);
    setName("");
    setDescription("");
  }
  function post() {
    if (!note.trim() || !room) return;
    update((d) => ({
      ...d,
      groups: d.groups.map((g) =>
        g.id === room.id
          ? {
              ...g,
              notes: [
                ...g.notes,
                {
                  id: uid(),
                  text: note.trim(),
                  date: new Date().toISOString(),
                },
              ],
            }
          : g,
      ),
    }));
    setNote("");
  }
  return (
    <div className="workspace-content">
      <PageHeading
        title={room ? room.name : "Review rooms"}
        subtitle={
          room
            ? room.description
            : "Collect trades and ideas around a shared review topic."
        }
        icon={Users}
      >
        {room && (
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => setActive("")}
          >
            All rooms
          </Button>
        )}
        <Button icon={Plus} onClick={() => setCreating(true)}>
          New room
        </Button>
      </PageHeading>
      {room ? (
        <div className="room-columns">
          <section className="panel">
            <SectionTitle title="Trades to review">
              <select
                aria-label="Add trade to room"
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id)
                    update((d) => ({
                      ...d,
                      groups: d.groups.map((g) =>
                        g.id === room.id
                          ? {
                              ...g,
                              tradeIds: [...new Set([...g.tradeIds, id])],
                            }
                          : g,
                      ),
                    }));
                }}
              >
                <option value="">+ Attach a trade</option>
                {completed(trades)
                  .filter((t) => !room.tradeIds.includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.symbol} · {fmtDate(t.date, true)} · {fmtR(t.r)}
                    </option>
                  ))}
              </select>
            </SectionTitle>
            {room.tradeIds.map((id) => {
              const t = data.trades.find((t) => t.id === id);
              return t ? (
                <button
                  className="room-trade"
                  key={id}
                  onClick={() => onTrade(id)}
                >
                  <strong>{t.symbol}</strong>
                  <span>{t.session}</span>
                  <b
                    className={
                      t.r !== null && t.r < 0 ? "negative" : "positive"
                    }
                  >
                    {fmtR(t.r)}
                  </b>
                  <ArrowUpRight size={15} />
                </button>
              ) : null;
            })}
            {!room.tradeIds.length && (
              <Empty
                title="Give this review some context"
                description="Attach a trade from your journal."
                icon={LayersIcon}
              />
            )}
          </section>
          <section className="panel">
            <SectionTitle title="Room notebook" icon={MessageSquare} />
            {room.notes.map((n) => (
              <div className="room-note" key={n.id}>
                <span className="micro muted">{fmtDate(n.date)}</span>
                <p>{n.text}</p>
              </div>
            ))}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="What should you discuss or remember?"
            />
            <div className="split-actions">
              <Button
                variant="secondary"
                icon={Share2}
                onClick={() => {
                  download(
                    JSON.stringify(
                      {
                        room,
                        trades: data.trades.filter((t) =>
                          room.tradeIds.includes(t.id),
                        ),
                      },
                      null,
                      2,
                    ),
                    "aftertrade-review-room.json",
                  );
                  notify("Review room exported for sharing");
                }}
              >
                Export room
              </Button>
              <Button onClick={post} disabled={!note.trim()}>
                Add note
              </Button>
            </div>
            <p className="micro muted">
              Rooms are saved on this device. Export a room to share its review
              material.
            </p>
          </section>
        </div>
      ) : (
        <>
          <div className="room-grid">
            {data.groups.map((g) => (
              <button
                className="panel room-card"
                key={g.id}
                onClick={() => setActive(g.id)}
              >
                <span className="room-icon">
                  <Users size={24} />
                </span>
                <h2>{g.name}</h2>
                <p>{g.description || "A space to review with intention."}</p>
                <div>
                  <span>{g.tradeIds.length} trades</span>
                  <span>{g.notes.length} notes</span>
                  <ArrowUpRight size={18} />
                </div>
              </button>
            ))}
          </div>
          {!data.groups.length && (
            <Empty
              title="A fresh perspective helps"
              description="Create a room to organise trades, review questions and discussion notes. Export the material when you’re ready to share."
              icon={Users}
              action={
                <Button icon={Plus} onClick={() => setCreating(true)}>
                  Create a review room
                </Button>
              }
            />
          )}
        </>
      )}
      {creating && (
        <Modal title="Create review room" onClose={() => setCreating(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="modal-body">
              <FieldLabel label="Room name">
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekly review"
                />
              </FieldLabel>
              <FieldLabel label="What is this room for?">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="The setups or habits you want to review…"
                />
              </FieldLabel>
            </div>
            <footer className="modal-footer">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Create room</Button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
const LayersIcon = BookOpen;

export function Support() {
  const { notify } = useJournal();
  return (
    <div className="workspace-content help-page">
      <PageHeading
        title="A little guidance"
        subtitle="Build a journal that makes your next decision clearer."
        icon={BookOpen}
      />
      <div className="help-grid">
        {[
          {
            title: "Define the setup",
            icon: Target,
            text: "Start with two or three core checklist questions. These define the trade you’re taking. Add confluences to capture supporting context.",
          },
          {
            title: "Record the process",
            icon: Pencil,
            text: "Run the checklist before a trade, or use post-trade mode to journal it afterward. Add a screenshot, risk, emotion and one honest note.",
          },
          {
            title: "Review the pattern",
            icon: Sparkles,
            text: "Use Analytics to compare sessions and symbols. Generate a journal review for a concise set of observations and questions.",
          },
          {
            title: "Keep a backup",
            icon: Database,
            text: "Your records are stored in this browser. Export a full backup in Settings before changing devices or clearing browser data.",
          },
        ].map((c) => (
          <section className="panel help-card" key={c.title}>
            <c.icon size={25} className="accent" />
            <h2>{c.title}</h2>
            <p>{c.text}</p>
          </section>
        ))}
      </div>
      <section className="panel">
        <h3>Keyboard shortcuts</h3>
        <div className="shortcut-list">
          <div>
            <span>Log a trade</span>
            <kbd>N</kbd>
          </div>
          <div>
            <span>Close a dialog</span>
            <kbd>Esc</kbd>
          </div>
          <div>
            <span>Navigate interactive controls</span>
            <kbd>Tab</kbd>
          </div>
        </div>
        <Button
          variant="secondary"
          icon={Copy}
          onClick={() => {
            navigator.clipboard
              ?.writeText(
                `AfterTrade 1.0.0\nBrowser: ${navigator.userAgent}\nTime: ${new Date().toISOString()}`,
              )
              .then(() => notify("Diagnostic details copied"))
              .catch(() => notify("Clipboard unavailable"));
          }}
        >
          Copy diagnostic details
        </Button>
      </section>
    </div>
  );
}
