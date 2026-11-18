import { useState, useRef, type FormEvent } from "react";
import {
  Plus,
  Check,
  ArrowRight,
  ArrowLeft,
  ImagePlus,
  X,
  Bookmark,
  Trash2,
  Pencil,
  Share2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Layers,
  ShieldCheck,
  Camera,
  Sparkles,
} from "../lib/icons";
import type {
  Trade,
  Checklist,
  Field,
  Answer,
  Outcome,
  Attachment,
} from "../types";
import { useJournal } from "../context";
import { startPersonalJournal } from "../lib/onboarding";
import {
  uid,
  fmtR,
  fmtMoney,
  fmtDate,
  fmtTime,
  hasAnswer,
  setupMatches,
  metrics,
} from "../lib/domain";
import {
  Button,
  IconButton,
  Badge,
  Modal,
  FieldLabel,
  Rating,
  Metric,
} from "./ui";
import { CandleChart } from "./charts";

export function ChecklistField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: Answer | undefined;
  onChange: (value: Answer) => void;
}) {
  return (
    <div className={`checklist-field field-${field.color}`}>
      <label>
        {field.label}
        {field.required && <span className="accent"> *</span>}
        {field.role !== "none" && (
          <span
            title={
              field.role === "core" ? "Core setup field" : "Confluence filter"
            }
          >
            <Layers size={11} />
          </span>
        )}
      </label>
      {field.type === "boolean" ? (
        <div className="answer-pills">
          {["Yes", "No", "Unsure"].map((v) => (
            <button
              type="button"
              key={v}
              className={
                value === v
                  ? `active ${v === "Yes" ? "positive" : v === "No" ? "negative" : ""}`
                  : ""
              }
              onClick={() => onChange(value === v ? "" : v)}
            >
              {value === v && <Check size={11} />}
              {v}
            </button>
          ))}
        </div>
      ) : field.type === "multiselect" ? (
        <div className="answer-pills">
          {field.options.map((v) => (
            <button
              type="button"
              key={v}
              className={
                Array.isArray(value) && value.includes(v) ? "active" : ""
              }
              onClick={() => {
                const list = Array.isArray(value) ? value : [];
                onChange(
                  list.includes(v) ? list.filter((a) => a !== v) : [...list, v],
                );
              }}
            >
              {v}
            </button>
          ))}
        </div>
      ) : field.type === "select" ? (
        <select
          aria-label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select an option…</option>
          {field.options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          aria-label={field.label}
          placeholder={
            field.type === "number" ? "Enter a value…" : "Your answer…"
          }
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function TradeEditor({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial?: Trade;
}) {
  const { data, update, account, notify } = useJournal();
  const [step, setStep] = useState(initial ? 2 : 1),
    [mode, setMode] = useState<"pre" | "post">(
      initial ? "post" : data.settings.loggingMode,
    ),
    [templateId, setTemplateId] = useState(
      initial?.templateId ?? data.checklists[0]?.id ?? "",
    ),
    [answers, setAnswers] = useState<Record<string, Answer>>(
      initial?.answers ?? {},
    ),
    [error, setError] = useState(""),
    [guided, setGuided] = useState(0);
  const date = new Date(initial?.date ?? Date.now());
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  const [form, setForm] = useState({
    symbol: initial?.symbol ?? data.settings.symbols[0] ?? "",
    direction: initial?.direction ?? "long",
    accountId:
      initial?.accountId ??
      (account === "all"
        ? (data.accounts.find((a) => a.status === "active")?.id ?? "")
        : account),
    session: initial?.session ?? data.settings.sessions[0] ?? "",
    risk: String(initial?.risk ?? data.settings.defaultRisk),
    date: date.toISOString().slice(0, 16),
    notes: initial?.notes ?? "",
    emotions: initial?.emotions ?? ([] as string[]),
    outcome: initial?.outcome ?? ("" as string),
    r: initial?.r?.toString() ?? "",
    pnl: initial?.pnl?.toString() ?? "",
    mfe: initial?.mfe?.toString() ?? "",
    mae: initial?.mae?.toString() ?? "",
    followedRules: initial?.followedRules ?? true,
  });
  const [screenshots, setScreenshots] = useState<Attachment[]>(
      initial?.screenshots ?? [],
    ),
    [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const checklist = data.checklists.find((t) => t.id === templateId),
    required = checklist?.fields.filter((f) => f.required) ?? [],
    done = required.filter((f) => hasAnswer(answers[f.id])).length,
    progress = required.length ? (done / required.length) * 100 : 100;
  const core = checklist?.fields.some(
      (f) => f.role === "core" && hasAnswer(answers[f.id]),
    ),
    matches = checklist
      ? data.trades.filter(
          (t) =>
            t.templateId === templateId && setupMatches(t, answers, checklist),
        )
      : [],
    stats = metrics(matches);
  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  function next() {
    if (!checklist) {
      setError("Create or select a checklist to continue.");
      return;
    }
    if (done < required.length) {
      setError("Complete the required fields before continuing.");
      return;
    }
    setError("");
    setStep(2);
  }
  async function attach(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      const selected = Array.from(files);
      if (screenshots.length + selected.length > 6)
        throw new Error("Attach up to 6 screenshots per trade.");
      const attachments = await Promise.all(
        selected.map(
          (file) =>
            new Promise<Attachment>((resolve, reject) => {
              if (
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 5 * 1024 * 1024
              ) {
                reject(
                  new Error("Choose PNG, JPEG or WebP images up to 5 MB."),
                );
                return;
              }
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  id: uid(),
                  name: file.name,
                  timeframe: "15m",
                  src: String(reader.result),
                });
              reader.onerror = () =>
                reject(new Error("Could not read this image."));
              reader.readAsDataURL(file);
            }),
        ),
      );
      setScreenshots((s) => [...s, ...attachments]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (
      !form.symbol.trim() ||
      !templateId ||
      !Number.isFinite(Date.parse(form.date))
    ) {
      setError("Choose a checklist, symbol and valid date.");
      return;
    }
    if (mode === "post" && !form.outcome) {
      setError("Select an outcome for the completed trade.");
      return;
    }
    const number = (s: string) => (s.trim() === "" ? null : Number(s));
    if (
      [form.r, form.pnl, form.mfe, form.mae].some(
        (s) => s !== "" && !Number.isFinite(Number(s)),
      ) ||
      !Number.isFinite(Number(form.risk)) ||
      Number(form.risk) < 0 ||
      Number(form.risk) > 100
    ) {
      setError("Enter valid numbers. Risk must be between 0 and 100%.");
      return;
    }
    const trade: Trade = {
      id: initial?.id ?? uid(),
      name: initial?.name ?? "",
      symbol: form.symbol.trim().toUpperCase(),
      direction: form.direction as Trade["direction"],
      date: new Date(form.date).toISOString(),
      session: form.session,
      accountId: form.accountId,
      templateId,
      answers,
      status: mode === "post" ? "completed" : "open",
      outcome: mode === "post" ? (form.outcome as Outcome) : null,
      r: mode === "post" ? number(form.r) : null,
      pnl: mode === "post" ? number(form.pnl) : null,
      risk: Number(form.risk),
      followedRules: form.followedRules,
      notes: form.notes,
      emotions: form.emotions,
      screenshots,
      rating: initial?.rating ?? 0,
      bookmarked: initial?.bookmarked ?? false,
      mfe: number(form.mfe),
      mae: form.mae === "" ? null : -Math.abs(Number(form.mae)),
      deletedAt: null,
      demo: initial?.demo ?? false,
    };
    update((d) => {
      const journal = initial ? d : startPersonalJournal(d);
      return {
        ...journal,
        trades: initial
          ? journal.trades.map((t) => (t.id === initial.id ? trade : t))
          : [trade, ...journal.trades],
      };
    });
    notify(
      initial
        ? "Trade updated"
        : mode === "post"
          ? "Trade journaled. Keep building your edge."
          : "Trade logged. Record the outcome when it resolves.",
    );
    onClose();
  }
  return (
    <Modal
      title={initial ? "Edit trade" : "Log Trade"}
      subtitle={
        step === 1
          ? "Start with your process. Let the data tell the story."
          : "Capture the details while they’re still fresh."
      }
      onClose={onClose}
      wide
    >
      <div className="step-indicator">
        <span className={step === 1 ? "active" : "complete"}>
          1 <span>Check your setup</span>
        </span>
        <div />
        <span className={step === 2 ? "active" : ""}>
          2 <span>Trade details</span>
        </span>
      </div>
      {data.demo && !initial && (
        <p className="demo-entry-notice">
          <Sparkles size={14} />
          <span>
            Saving your first trade starts your own journal and clears the demo
            records. Cancelling keeps the demo.
          </span>
        </p>
      )}
      {step === 1 ? (
        <>
          <div className="modal-body">
            <div className="checklist-toolbar">
              <label>
                Checklist{" "}
                <select
                  aria-label="Choose checklist"
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    setAnswers({});
                    setGuided(0);
                  }}
                >
                  <option value="" disabled>
                    Select a checklist
                  </option>
                  {data.checklists.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <Badge color="blue">Your process, first</Badge>
            </div>
            <div className="log-grid">
              <section className="panel checklist-panel">
                <SectionChecklistHeader
                  count={checklist?.fields.length ?? 0}
                  done={done}
                  required={required.length}
                  progress={progress}
                />
                {checklist &&
                  (checklist.mode === "guided" ? (
                    <div>
                      <span className="eyebrow">
                        Question {guided + 1} of {checklist.fields.length}
                      </span>
                      {checklist.fields[guided] && (
                        <ChecklistField
                          field={checklist.fields[guided]}
                          value={answers[checklist.fields[guided].id]}
                          onChange={(v) =>
                            setAnswers((a) => ({
                              ...a,
                              [checklist.fields[guided].id]: v,
                            }))
                          }
                        />
                      )}
                      <div className="split-actions">
                        <Button
                          variant="ghost"
                          disabled={guided === 0}
                          onClick={() => setGuided((i) => i - 1)}
                          icon={ArrowLeft}
                        >
                          Previous
                        </Button>
                        <Button
                          disabled={guided === checklist.fields.length - 1}
                          onClick={() => setGuided((i) => i + 1)}
                          icon={ArrowRight}
                        >
                          Next question
                        </Button>
                      </div>
                    </div>
                  ) : (
                    [
                      ...new Set([
                        ...checklist.groups,
                        ...checklist.fields.map((f) => f.group),
                      ]),
                    ].map((group) => (
                      <details className="field-group" key={group} open>
                        <summary>
                          <Layers size={14} />
                          {group}
                          <span>
                            {
                              checklist.fields.filter((f) => f.group === group)
                                .length
                            }
                          </span>
                        </summary>
                        {checklist.fields
                          .filter((f) => f.group === group)
                          .map((field) => (
                            <ChecklistField
                              key={field.id}
                              field={field}
                              value={answers[field.id]}
                              onChange={(v) =>
                                setAnswers((a) => ({ ...a, [field.id]: v }))
                              }
                            />
                          ))}
                      </details>
                    ))
                  ))}
              </section>
              <aside className="log-aside">
                <section className="panel">
                  <h3>
                    <Target size={17} className="accent" />
                    Combination Stats
                  </h3>
                  {core && stats.count ? (
                    <>
                      <div className="metric-grid two">
                        <Metric
                          label="Win rate"
                          value={`${stats.winRate.toFixed(1)}%`}
                          tone="positive"
                        />
                        <Metric label="Trades" value={stats.count} />
                      </div>
                      <Metric
                        label="Average R"
                        value={fmtR(stats.avgR)}
                        tone={stats.avgR >= 0 ? "positive" : "negative"}
                      />
                      <p className="micro muted">
                        Historical sample ·{" "}
                        {stats.count < 15
                          ? "small sample, use cautiously"
                          : "compare conditions before drawing conclusions"}
                      </p>
                    </>
                  ) : (
                    <div className="stats-placeholder">
                      <Target size={28} />
                      <p>Select a core setup to see stats</p>
                      <small>Core fields define your trade identity.</small>
                    </div>
                  )}
                </section>
                <section className="panel">
                  <h3>Trade logging flow</h3>
                  <p className="muted small">
                    Prepare a trade now, or journal one that’s complete.
                  </p>
                  <div className="segmented">
                    <button
                      className={mode === "pre" ? "selected" : ""}
                      onClick={() => setMode("pre")}
                    >
                      Pre trade
                    </button>
                    <button
                      className={mode === "post" ? "selected" : ""}
                      onClick={() => setMode("post")}
                    >
                      Post trade
                    </button>
                  </div>
                </section>
                <div className="subtle-tip">
                  <ShieldCheck size={17} />
                  <p>
                    A clean no-trade decision is still good risk management.
                  </p>
                </div>
              </aside>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <footer className="modal-footer">
            <span className="muted small">
              A consistent checklist makes every trade useful.
            </span>
            <Button icon={ArrowRight} onClick={next}>
              Continue to Trade Entry
            </Button>
          </footer>
        </>
      ) : (
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-grid">
              <FieldLabel label="Symbol *">
                <input
                  list="trade-symbols"
                  required
                  value={form.symbol}
                  onChange={(e) => set("symbol", e.target.value)}
                  placeholder="e.g. NQ, EURUSD"
                />
                <datalist id="trade-symbols">
                  {data.settings.symbols.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </datalist>
              </FieldLabel>
              <FieldLabel label="Account">
                <select
                  value={form.accountId}
                  onChange={(e) => set("accountId", e.target.value)}
                >
                  <option value="">No account</option>
                  {data.accounts
                    .filter((a) => a.status === "active")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Direction">
                <select
                  value={form.direction}
                  onChange={(e) => set("direction", e.target.value)}
                >
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Trade date & time">
                <input
                  required
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </FieldLabel>
              <FieldLabel label="Session">
                <select
                  value={form.session}
                  onChange={(e) => set("session", e.target.value)}
                >
                  {data.settings.sessions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Risk %">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.risk}
                  onChange={(e) => set("risk", e.target.value)}
                />
              </FieldLabel>
            </div>
            <div className="form-section">
              <span className="label">Emotions</span>
              <div className="answer-pills">
                {[
                  "Calm",
                  "Focused",
                  "Confident",
                  "Anxious",
                  "FOMO",
                  "Frustrated",
                ].map((em) => (
                  <button
                    type="button"
                    className={form.emotions.includes(em) ? "active" : ""}
                    key={em}
                    onClick={() =>
                      set(
                        "emotions",
                        form.emotions.includes(em)
                          ? form.emotions.filter((x) => x !== em)
                          : [...form.emotions, em],
                      )
                    }
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <FieldLabel label="Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="What did you see? What was your plan?"
              />
            </FieldLabel>
            <div className="form-grid">
              {checklist?.trackMfe && (
                <FieldLabel label="Max favorable (R)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.mfe}
                    onChange={(e) => set("mfe", e.target.value)}
                    placeholder="e.g. 2.5"
                  />
                </FieldLabel>
              )}
              {checklist?.trackMae && (
                <FieldLabel label="Max adverse (R)">
                  <input
                    type="number"
                    step="0.01"
                    value={form.mae}
                    onChange={(e) => set("mae", e.target.value)}
                    placeholder="e.g. −0.5"
                  />
                </FieldLabel>
              )}
            </div>
            {mode === "post" && (
              <section className="outcome-section">
                <h3>The outcome</h3>
                <div className="form-grid three">
                  <FieldLabel label="Outcome *">
                    <select
                      required
                      value={form.outcome}
                      onChange={(e) => set("outcome", e.target.value)}
                    >
                      <option value="">Select outcome</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="breakeven">Breakeven</option>
                    </select>
                  </FieldLabel>
                  <FieldLabel label="Result (R)">
                    <input
                      type="number"
                      step="0.01"
                      value={form.r}
                      onChange={(e) => set("r", e.target.value)}
                      placeholder="e.g. 1.5 or −1"
                    />
                  </FieldLabel>
                  <FieldLabel label="Money P&L ($)">
                    <input
                      type="number"
                      step="0.01"
                      value={form.pnl}
                      onChange={(e) => set("pnl", e.target.value)}
                      placeholder="Optional"
                    />
                  </FieldLabel>
                </div>
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={form.followedRules}
                    onChange={(e) => set("followedRules", e.target.checked)}
                  />
                  I followed my trading rules
                </label>
              </section>
            )}
            <div className="form-section">
              <div className="section-heading">
                <h3>
                  <Camera size={16} />
                  Chart screenshots
                </h3>
                <span className="micro muted">
                  PNG, JPEG, WebP · max 5 MB each
                </span>
              </div>
              <input
                hidden
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(e) => {
                  void attach(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus size={24} />
                <span>
                  {uploading ? "Reading images…" : "Choose chart screenshots"}
                </span>
                <small>Attach the context behind your trade</small>
              </button>
              {screenshots.length > 0 && (
                <div className="attachment-grid">
                  {screenshots.map((s) => (
                    <div key={s.id}>
                      <img src={s.src} alt={s.name} />
                      <div>
                        <select
                          aria-label={`Timeframe for ${s.name}`}
                          value={s.timeframe}
                          onChange={(e) =>
                            setScreenshots((a) =>
                              a.map((x) =>
                                x.id === s.id
                                  ? { ...x, timeframe: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        >
                          {["1m", "5m", "15m", "1H", "4H", "Daily"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                        <IconButton
                          icon={X}
                          label={`Remove ${s.name}`}
                          onClick={() =>
                            setScreenshots((a) =>
                              a.filter((x) => x.id !== s.id),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <footer className="modal-footer">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>
              Back to checklist
            </Button>
            <Button type="submit" disabled={uploading} icon={Check}>
              {initial
                ? "Save changes"
                : mode === "post"
                  ? "Save completed trade"
                  : "Log trade"}
            </Button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
function SectionChecklistHeader({
  count,
  done,
  required,
  progress,
}: {
  count: number;
  done: number;
  required: number;
  progress: number;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h3>Checklist</h3>
          <p className="micro muted">{count} conditions</p>
        </div>
        <span className="micro">
          <span className="muted">
            {done}/{required}
          </span>{" "}
          <strong>{Math.round(progress)}%</strong>
        </span>
      </div>
      <div className="progress">
        <div style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}

export function TradeCard({
  trade,
  onOpen,
}: {
  trade: Trade;
  onOpen: () => void;
}) {
  const { update } = useJournal();
  return (
    <article className="trade-card">
      <button
        className="trade-chart-button"
        onClick={onOpen}
        aria-label={`Open ${trade.symbol} trade`}
      >
        <div className="trade-chart">
          {trade.screenshots[0] ? (
            <img
              src={trade.screenshots[0].src}
              alt={`${trade.symbol} chart`}
              loading="lazy"
            />
          ) : (
            <CandleChart
              seed={trade.id.split("").reduce((a, b) => a + b.charCodeAt(0), 0)}
            />
          )}
          <div className="chart-badges">
            <Badge color={trade.direction === "long" ? "green" : "red"}>
              {trade.direction === "long" ? (
                <ArrowUpRight size={11} />
              ) : (
                <ArrowDownRight size={11} />
              )}
              {trade.direction}
            </Badge>
            <Badge
              color={
                trade.outcome === "loss"
                  ? "red"
                  : trade.outcome === "win"
                    ? "green"
                    : "neutral"
              }
            >
              {trade.outcome ?? "open"}
            </Badge>
          </div>
        </div>
      </button>
      <div className="trade-card-body">
        <button className="trade-title" onClick={onOpen}>
          <strong>{trade.symbol}</strong>
          <span>
            {fmtDate(trade.date, true)}
            <small>{fmtTime(trade.date)}</small>
          </span>
        </button>
        <p className="trade-name muted">{trade.name || "Journaled trade"}</p>
        <div className="trade-result">
          <b
            className={
              trade.r !== null && trade.r < 0 ? "negative" : "positive"
            }
          >
            {fmtR(trade.r)}
          </b>
          {trade.pnl !== null && (
            <span className="muted small">{fmtMoney(trade.pnl)}</span>
          )}
          <span className="muted small">{trade.session}</span>
        </div>
        <div className="card-rating">
          <Rating
            value={trade.rating}
            onChange={(rating) =>
              update((d) => ({
                ...d,
                trades: d.trades.map((t) =>
                  t.id === trade.id ? { ...t, rating } : t,
                ),
              }))
            }
          />
          <button
            className={`bookmark-button ${trade.bookmarked ? "accent" : ""}`}
            title="Bookmark trade"
            aria-label="Bookmark trade"
            onClick={() =>
              update((d) => ({
                ...d,
                trades: d.trades.map((t) =>
                  t.id === trade.id ? { ...t, bookmarked: !t.bookmarked } : t,
                ),
              }))
            }
          >
            <Bookmark
              size={13}
              fill={trade.bookmarked ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    </article>
  );
}

export function TradeDetail({
  tradeId,
  onClose,
  onNavigate,
  ids,
}: {
  tradeId: string;
  onClose: () => void;
  onNavigate?: (id: string) => void;
  ids?: string[];
}) {
  const { data, update, notify } = useJournal(),
    [editing, setEditing] = useState(false),
    [zoom, setZoom] = useState<string | null>(null),
    [shareOpen, setShareOpen] = useState(false);
  const trade = data.trades.find((t) => t.id === tradeId),
    checklist = data.checklists.find((t) => t.id === trade?.templateId);
  if (!trade) return null;
  if (editing)
    return <TradeEditor initial={trade} onClose={() => setEditing(false)} />;
  const index = ids?.indexOf(tradeId) ?? -1;
  function remove() {
    if (!confirm("Move this trade to trash? You can restore it later.")) return;
    update((d) => ({
      ...d,
      trades: d.trades.map((t) =>
        t.id === tradeId ? { ...t, deletedAt: new Date().toISOString() } : t,
      ),
    }));
    notify("Trade moved to trash");
    onClose();
  }
  async function share() {
    const safe = { ...trade!, screenshots: [], accountId: "", emotions: [] };
    const json = JSON.stringify({ trade: safe, checklist });
    const bytes = new TextEncoder().encode(json);
    const encoded = btoa(
      Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
    );
    const url = `${location.origin}${location.pathname}#/shared/${encodeURIComponent(encoded)}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Trade link copied. It includes the selected trade and notes.");
    } catch {
      setShareOpen(true);
    }
  }
  return (
    <Modal
      title={`${trade.symbol}${trade.name ? ` · ${trade.name}` : ""}`}
      subtitle={`${trade.direction.toUpperCase()} · ${fmtDate(trade.date)} · ${checklist?.name ?? "Checklist"}`}
      onClose={onClose}
      wide
    >
      <div className="detail-toolbar">
        <Badge
          color={
            trade.outcome === "win"
              ? "green"
              : trade.outcome === "loss"
                ? "red"
                : "neutral"
          }
        >
          {trade.outcome ?? "Open trade"}
        </Badge>
        <div className="toolbar-spacer" />
        {ids && (
          <>
            <IconButton
              icon={ChevronLeft}
              label="Previous trade"
              onClick={() =>
                onNavigate?.(ids[(index - 1 + ids.length) % ids.length])
              }
            />
            <span className="micro muted">
              {index + 1} / {ids.length}
            </span>
            <IconButton
              icon={ChevronRight}
              label="Next trade"
              onClick={() => onNavigate?.(ids[(index + 1) % ids.length])}
            />
          </>
        )}
        <Button variant="secondary" icon={Share2} onClick={share}>
          Share trade
        </Button>
        <Button
          variant="secondary"
          icon={Pencil}
          onClick={() => setEditing(true)}
        >
          {trade.status === "open" ? "Mark outcome" : "Edit"}
        </Button>
      </div>
      {shareOpen && (
        <div className="inline-notice">
          Clipboard is unavailable here. Use Export on the Trade History page to
          share the trade data.
        </div>
      )}
      <div className="modal-body">
        <div className="metric-grid four">
          <Metric label="Trade date" value={fmtDate(trade.date)} />
          <Metric
            label="Money P&L"
            value={fmtMoney(trade.pnl)}
            tone={trade.pnl !== null && trade.pnl < 0 ? "negative" : ""}
          />
          <Metric
            label="R multiple"
            value={fmtR(trade.r)}
            tone={trade.r !== null && trade.r < 0 ? "negative" : "positive"}
          />
          <Metric
            label="Process"
            value={trade.followedRules ? "Followed rules" : "Rule break"}
            tone={trade.followedRules ? "positive" : "negative"}
          />
        </div>
        <h3 className="detail-section-title">Trade details</h3>
        <div className="detail-strip">
          {[
            ["Symbol", trade.symbol],
            ["Direction", trade.direction],
            ["Trade time", fmtTime(trade.date)],
            ["Session", trade.session || "—"],
            ["Risk", `${trade.risk}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <div className="detail-columns">
          <section>
            <div className="section-heading">
              <h3>
                <Layers size={16} />
                Checklist answers
              </h3>
              <span className="micro muted">{checklist?.name}</span>
            </div>
            <div className="answer-table">
              {checklist?.groups.map((group) => (
                <div key={group}>
                  <div className="answer-table-group">{group}</div>
                  {checklist.fields
                    .filter((f) => f.group === group)
                    .map((f) => (
                      <div className="answer-table-row" key={f.id}>
                        <span>{f.label}</span>
                        <span>
                          {Array.isArray(trade.answers[f.id]) ? (
                            (trade.answers[f.id] as string[]).map((a) => (
                              <Badge key={a} color={f.color}>
                                {a}
                              </Badge>
                            ))
                          ) : hasAnswer(trade.answers[f.id]) ? (
                            <Badge color={f.color}>{trade.answers[f.id]}</Badge>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </div>
            <h3 className="detail-section-title">Notes</h3>
            <p className="note-prose">
              {trade.notes || "No notes added to this trade."}
            </p>
            <div className="emotion-row">
              {trade.emotions.map((e) => (
                <Badge key={e} color="neutral">
                  {e}
                </Badge>
              ))}
            </div>
          </section>
          <aside>
            <h3>
              <Camera size={16} />
              Chart screenshots
            </h3>
            {trade.screenshots.length ? (
              trade.screenshots.map((s) => (
                <button
                  key={s.id}
                  className="detail-screenshot"
                  onClick={() => setZoom(s.src)}
                >
                  <span>
                    {s.timeframe}
                    <small>Click to zoom</small>
                  </span>
                  <img src={s.src} alt={s.name} />
                </button>
              ))
            ) : trade.demo ? (
              <div className="detail-screenshot">
                <span>Illustrative chart</span>
                <CandleChart seed={tradeId.length * 23} height={230} />
              </div>
            ) : (
              <div className="stats-placeholder">
                <Camera size={25} />
                <p>No screenshots attached</p>
              </div>
            )}
            <div className="panel excursion-detail">
              <div>
                <span className="muted small">Max favorable</span>
                <strong className="positive">{fmtR(trade.mfe)}</strong>
              </div>
              <div>
                <span className="muted small">Max adverse</span>
                <strong className="negative">{fmtR(trade.mae)}</strong>
              </div>
            </div>
            <div className="detail-rating">
              <span className="muted small">Trade rating</span>
              <Rating
                value={trade.rating}
                onChange={(rating) =>
                  update((d) => ({
                    ...d,
                    trades: d.trades.map((t) =>
                      t.id === tradeId ? { ...t, rating } : t,
                    ),
                  }))
                }
              />
            </div>
          </aside>
        </div>
      </div>
      <footer className="modal-footer">
        <Button variant="danger" icon={Trash2} onClick={remove}>
          Move to trash
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </footer>
      {zoom && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-label="Chart image viewer"
        >
          <IconButton
            icon={X}
            label="Close image"
            onClick={() => setZoom(null)}
          />
          <img src={zoom} alt="Enlarged trade chart" />
        </div>
      )}
    </Modal>
  );
}
