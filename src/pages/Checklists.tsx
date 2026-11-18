import { useState } from "react";
import {
  Plus,
  Layers,
  Pencil,
  Trash2,
  Copy,
  ArrowLeft,
  Save,
  Sparkles,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Share2,
  Upload,
  Target,
  Check,
} from "../lib/icons";
import type { Checklist, Field } from "../types";
import { useJournal } from "../context";
import { uid } from "../lib/domain";
import { download } from "../lib/storage";
import {
  Button,
  IconButton,
  Badge,
  PageHeading,
  Modal,
  FieldLabel,
  Empty,
} from "../components/ui";
import { ChecklistField } from "../components/trades";

export default function Checklists() {
  const { data, update, notify } = useJournal(),
    [editing, setEditing] = useState<Checklist | null>(null),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [quick, setQuick] = useState(false),
    [strategy, setStrategy] = useState("");
  function create() {
    if (!name.trim()) return;
    const checklist: Checklist = {
      id: uid(),
      name: name.trim(),
      strategy,
      description: "",
      groups: ["What", "Where", "When"],
      fields: quick
        ? [
            {
              id: uid(),
              label: "Higher timeframe bias",
              type: "select",
              options: ["Bullish", "Bearish", "Neutral"],
              group: "What",
              role: "core",
              required: true,
              color: "purple",
            },
            {
              id: uid(),
              label: "Entry model",
              type: "select",
              options: ["Breakout", "Retest", "Reversal"],
              group: "What",
              role: "core",
              required: true,
              color: "blue",
            },
            {
              id: uid(),
              label: "At a key level",
              type: "boolean",
              options: [],
              group: "Where",
              role: "confluence",
              required: false,
              color: "green",
            },
            {
              id: uid(),
              label: "Entry confirmation",
              type: "boolean",
              options: [],
              group: "When",
              role: "confluence",
              required: true,
              color: "purple",
            },
          ]
        : [],
      mode: "standard",
      trackMfe: false,
      trackMae: false,
    };
    update((d) => ({ ...d, checklists: [...d.checklists, checklist] }));
    setCreating(false);
    setName("");
    setStrategy("");
    setEditing(checklist);
    notify("Checklist created");
  }
  function remove(c: Checklist) {
    if (
      !confirm(
        `Delete “${c.name}”? Existing trades will keep their answers, but this checklist will no longer be editable.`,
      )
    )
      return;
    update((d) => ({
      ...d,
      checklists: d.checklists.filter((t) => t.id !== c.id),
    }));
    notify("Checklist deleted");
  }
  async function importShared() {
    const code = prompt("Paste an AfterTrade checklist JSON to import.");
    if (!code) return;
    try {
      const c = JSON.parse(code) as Checklist;
      if (
        typeof c.name !== "string" ||
        !Array.isArray(c.fields) ||
        !Array.isArray(c.groups) ||
        c.fields.some(
          (f) =>
            !f.id ||
            !f.label ||
            !["boolean", "select", "multiselect", "number", "text"].includes(
              f.type,
            ),
        )
      )
        throw new Error();
      const copy = { ...c, id: uid(), name: `${c.name} (imported)` };
      update((d) => ({ ...d, checklists: [...d.checklists, copy] }));
      notify("Checklist imported");
    } catch {
      notify(
        "Could not read that checklist. Use an exported AfterTrade checklist.",
      );
    }
  }
  if (editing)
    return (
      <ChecklistEditor
        key={editing.id}
        initial={editing}
        onClose={() => setEditing(null)}
      />
    );
  return (
    <div className="workspace-content">
      <PageHeading
        title="Checklists"
        subtitle="Turn your strategy into a repeatable process."
        icon={Layers}
      >
        <Button
          variant="secondary"
          icon={Upload}
          onClick={() => void importShared()}
        >
          Import Shared
        </Button>
        <Button
          variant="secondary"
          icon={Sparkles}
          onClick={() => {
            setQuick(true);
            setCreating(true);
          }}
        >
          Quick build
        </Button>
        <Button
          icon={Plus}
          onClick={() => {
            setQuick(false);
            setCreating(true);
          }}
        >
          New Checklist
        </Button>
      </PageHeading>
      <div className="checklist-grid">
        {data.checklists.map((c) => (
          <article className="panel checklist-card" key={c.id}>
            <div className="section-heading">
              <h3>{c.name}</h3>
              <div className="row">
                <IconButton
                  icon={Copy}
                  label={`Duplicate ${c.name}`}
                  onClick={() => {
                    update((d) => ({
                      ...d,
                      checklists: [
                        ...d.checklists,
                        { ...c, id: uid(), name: `${c.name} (copy)` },
                      ],
                    }));
                    notify("Checklist duplicated");
                  }}
                />
                <IconButton
                  icon={Trash2}
                  label={`Delete ${c.name}`}
                  onClick={() => remove(c)}
                />
              </div>
            </div>
            <p className="muted small">
              {c.fields.length} fields ·{" "}
              {c.fields.filter((f) => f.role !== "none").length} affect stats{" "}
              {c.mode === "guided" && "· Guided"}
            </p>
            <div className="checklist-field-chips">
              {c.fields.slice(0, 4).map((f) => (
                <Badge key={f.id} color="purple">
                  {f.label}
                </Badge>
              ))}
              {c.fields.length > 4 && (
                <span className="small muted">+{c.fields.length - 4} more</span>
              )}
            </div>
            <Button
              variant="secondary"
              className="full-width"
              icon={Pencil}
              onClick={() => setEditing(c)}
            >
              Edit Checklist
            </Button>
          </article>
        ))}
      </div>
      {!data.checklists.length && (
        <Empty
          title="Define your edge"
          description="Create a checklist for the conditions that matter to your strategy."
          icon={Layers}
          action={
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Create your first checklist
            </Button>
          }
        />
      )}
      {creating && (
        <Modal
          title={quick ? "Build a starting checklist" : "New checklist"}
          subtitle={
            quick
              ? "Start with a structured template. Refine every field to your own rules."
              : "Give your trading process a home."
          }
          onClose={() => setCreating(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="modal-body">
              <FieldLabel label="Checklist name">
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. London liquidity setup"
                  maxLength={80}
                />
              </FieldLabel>
              {quick && (
                <FieldLabel label="Strategy notes">
                  <textarea
                    rows={4}
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    placeholder="Describe your entry, confirmation and invalidation…"
                  />
                </FieldLabel>
              )}
            </div>
            <footer className="modal-footer">
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" icon={Plus}>
                Create checklist
              </Button>
            </footer>
          </form>
        </Modal>
      )}
    </div>
  );
}
function ChecklistEditor({
  initial,
  onClose,
}: {
  initial: Checklist;
  onClose: () => void;
}) {
  const { update, notify } = useJournal(),
    [draft, setDraft] = useState<Checklist>(structuredClone(initial)),
    [field, setField] = useState<Field | null>(null),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false),
    [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const change = (patch: Partial<Checklist>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  function save() {
    if (!draft.name.trim()) {
      notify("Give your checklist a name");
      return;
    }
    update((d) => ({
      ...d,
      checklists: d.checklists.map((c) => (c.id === draft.id ? draft : c)),
    }));
    setDirty(false);
    notify("Checklist saved");
  }
  function close() {
    if (!dirty || confirm("Discard unsaved checklist changes?")) onClose();
  }
  function add(group = draft.groups[0] ?? "What") {
    setField({
      id: uid(),
      label: "",
      type: "boolean",
      options: [],
      group,
      role: "confluence",
      required: false,
      color: group === "Where" ? "green" : "purple",
    });
  }
  function reorder(id: string, delta: number) {
    const fields = [...draft.fields],
      i = fields.findIndex((f) => f.id === id),
      j = i + delta;
    if (j < 0 || j >= fields.length) return;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    change({ fields });
  }
  return (
    <div className="workspace-content checklist-editor">
      <div className="editor-toolbar">
        <Button variant="ghost" icon={ArrowLeft} onClick={close}>
          Checklists
        </Button>
        <input
          className="editor-name"
          aria-label="Checklist name"
          value={draft.name}
          onChange={(e) => change({ name: e.target.value })}
        />
        <span className="micro muted">
          <span className={`status-dot ${dirty ? "dot-gold" : ""}`} />
          {dirty ? "Unsaved" : "Saved"}
        </span>
        <Button
          variant="secondary"
          icon={Target}
          onClick={() => setPreview(true)}
        >
          Preview
        </Button>
        <Button
          variant="secondary"
          icon={Share2}
          onClick={() => {
            download(JSON.stringify(draft, null, 2), "aftertrade-checklist.json");
            notify(
              "Checklist exported. Share the JSON to import it elsewhere.",
            );
          }}
        >
          Share
        </Button>
        <Button icon={Save} onClick={save}>
          Save
        </Button>
      </div>
      <section className="panel strategy-panel">
        <h2>
          <Sparkles size={18} />
          Strategy Explained
        </h2>
        <p className="muted small">
          Describe your strategy in your own words. Keep your thinking alongside
          your rules.
        </p>
        <textarea
          rows={3}
          value={draft.strategy}
          onChange={(e) => change({ strategy: e.target.value })}
          placeholder="What do you wait for? What confirms your setup? Where is the invalidation?"
        />
      </section>
      <div className="editor-top-grid">
        <section className="panel">
          <h3>Checklist format</h3>
          <div className="format-options">
            {[
              {
                value: "standard",
                title: "Standard",
                sub: "Every question is available together.",
              },
              {
                value: "guided",
                title: "Guided / Interactive",
                sub: "Work through one question at a time.",
              },
            ].map((mode) => (
              <button
                key={mode.value}
                className={draft.mode === mode.value ? "selected" : ""}
                onClick={() =>
                  change({ mode: mode.value as Checklist["mode"] })
                }
              >
                <strong>{mode.title}</strong>
                <p>{mode.sub}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>Settings</h3>
          <label className="switch-row">
            <div>
              <strong>Track MFE</strong>
              <p>Maximum unrealised profit in R.</p>
            </div>
            <input
              role="switch"
              type="checkbox"
              checked={draft.trackMfe}
              onChange={(e) => change({ trackMfe: e.target.checked })}
            />
          </label>
          <label className="switch-row">
            <div>
              <strong>Track MAE</strong>
              <p>Maximum adverse move in R.</p>
            </div>
            <input
              role="switch"
              type="checkbox"
              checked={draft.trackMae}
              onChange={(e) => change({ trackMae: e.target.checked })}
            />
          </label>
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h3>Groups</h3>
          <Button
            variant="secondary"
            icon={Plus}
            onClick={() => {
              const name = prompt("Group name");
              if (name?.trim() && !draft.groups.includes(name.trim()))
                change({ groups: [...draft.groups, name.trim()] });
            }}
          >
            Add Group
          </Button>
        </div>
        {draft.groups.map((g) => (
          <div className="group-overview" key={g}>
            <strong>{g}</strong>
            <Badge>
              {draft.fields.filter((f) => f.group === g).length} fields
            </Badge>
            <div className="toolbar-spacer" />
            <IconButton
              icon={Pencil}
              label={`Rename ${g}`}
              onClick={() => {
                const name = prompt("Group name", g)?.trim();
                if (name && name !== g && !draft.groups.includes(name))
                  change({
                    groups: draft.groups.map((x) => (x === g ? name : x)),
                    fields: draft.fields.map((f) =>
                      f.group === g ? { ...f, group: name } : f,
                    ),
                  });
              }}
            />
            <IconButton
              icon={Trash2}
              label={`Remove ${g} group`}
              onClick={() => {
                if (
                  confirm(
                    `Remove the ${g} group? Its fields will become Ungrouped.`,
                  )
                )
                  change({
                    groups: draft.groups.filter((x) => x !== g),
                    fields: draft.fields.map((f) =>
                      f.group === g ? { ...f, group: "Ungrouped" } : f,
                    ),
                  });
              }}
            />
          </div>
        ))}
      </section>
      <section className="panel">
        <div className="section-heading">
          <h3>
            Checklist Fields{" "}
            <span className="muted">({draft.fields.length})</span>
          </h3>
          <Button icon={Plus} onClick={() => add()}>
            Add Field
          </Button>
        </div>
        <p className="muted small">
          Keep 2–4 fields as your core setup. Use confluences to explore the
          details.
        </p>
        {[
          ...new Set([...draft.groups, ...draft.fields.map((f) => f.group)]),
        ].map((g) => (
          <section className="editor-field-group" key={g}>
            <div className="section-heading">
              <h3>
                <GripVertical size={13} />
                {g}
                <Badge>
                  {draft.fields.filter((f) => f.group === g).length}
                </Badge>
              </h3>
              <Button variant="ghost" icon={Plus} onClick={() => add(g)}>
                Add
              </Button>
            </div>
            {draft.fields
              .filter((f) => f.group === g)
              .map((f) => (
                <div className={`editor-field field-${f.color}`} key={f.id}>
                  <GripVertical size={14} className="muted" />
                  <div>
                    <div className="row">
                      <strong>{f.label}</strong>
                      <span className="micro">
                        {f.type === "boolean" ? "Yes / No" : f.type}
                      </span>
                      {f.role !== "none" && (
                        <Badge color={f.role === "core" ? "purple" : "gold"}>
                          {f.role}
                        </Badge>
                      )}
                      {f.required && (
                        <span className="micro accent">Required</span>
                      )}
                    </div>
                    <p>
                      {f.options.length
                        ? `Options: ${f.options.join(", ")}`
                        : f.type === "boolean"
                          ? "Yes, No, Unsure"
                          : "Free entry"}
                    </p>
                  </div>
                  <div className="toolbar-spacer" />
                  <IconButton
                    icon={ChevronUp}
                    label={`Move ${f.label} up`}
                    onClick={() => reorder(f.id, -1)}
                  />
                  <IconButton
                    icon={ChevronDown}
                    label={`Move ${f.label} down`}
                    onClick={() => reorder(f.id, 1)}
                  />
                  <IconButton
                    icon={Pencil}
                    label={`Edit ${f.label}`}
                    onClick={() => setField({ ...f })}
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Delete ${f.label}`}
                    onClick={() => {
                      if (
                        confirm(
                          `Remove ${f.label}? Existing trade answers are retained in their records.`,
                        )
                      )
                        change({
                          fields: draft.fields.filter((x) => x.id !== f.id),
                        });
                    }}
                  />
                </div>
              ))}
          </section>
        ))}
      </section>
      {field && (
        <FieldEditor
          initial={field}
          groups={draft.groups}
          onClose={() => setField(null)}
          onSave={(f) => {
            change({
              fields: draft.fields.some((x) => x.id === f.id)
                ? draft.fields.map((x) => (x.id === f.id ? f : x))
                : [...draft.fields, f],
            });
            setField(null);
          }}
        />
      )}
      {preview && (
        <Modal
          title="Checklist preview"
          subtitle={draft.name}
          onClose={() => setPreview(false)}
        >
          <div className="modal-body">
            {draft.fields.map((f) => (
              <ChecklistField
                key={f.id}
                field={f}
                value={answers[f.id]}
                onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))}
              />
            ))}
          </div>
          <footer className="modal-footer">
            <Button onClick={() => setPreview(false)}>Done</Button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
function FieldEditor({
  initial,
  groups,
  onClose,
  onSave,
}: {
  initial: Field;
  groups: string[];
  onClose: () => void;
  onSave: (field: Field) => void;
}) {
  const [f, set] = useState(initial),
    [options, setOptions] = useState(initial.options.join(", "));
  return (
    <Modal
      title={initial.label ? "Edit field" : "Add checklist field"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...f,
            label: f.label.trim(),
            options: options
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          });
        }}
      >
        <div className="modal-body">
          <FieldLabel label="Label">
            <input
              autoFocus
              required
              value={f.label}
              onChange={(e) => set((a) => ({ ...a, label: e.target.value }))}
              placeholder="e.g. Liquidity swept?"
            />
          </FieldLabel>
          <div className="form-grid">
            <FieldLabel label="Type">
              <select
                value={f.type}
                onChange={(e) =>
                  set((a) => ({ ...a, type: e.target.value as Field["type"] }))
                }
              >
                {["boolean", "select", "multiselect", "number", "text"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {v === "boolean" ? "Yes / No / Unsure" : v}
                    </option>
                  ),
                )}
              </select>
            </FieldLabel>
            <FieldLabel label="Group">
              <select
                value={f.group}
                onChange={(e) => set((a) => ({ ...a, group: e.target.value }))}
              >
                {[...new Set([...groups, f.group, "Ungrouped"])].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </FieldLabel>
          </div>
          {["select", "multiselect"].includes(f.type) && (
            <FieldLabel label="Options (comma separated)">
              <input
                required
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Bullish, Bearish, Neutral"
              />
            </FieldLabel>
          )}
          <div className="form-grid">
            <FieldLabel label="Setup analytics role">
              <select
                value={f.role}
                onChange={(e) =>
                  set((a) => ({ ...a, role: e.target.value as Field["role"] }))
                }
              >
                <option value="core">Core — defines the setup</option>
                <option value="confluence">
                  Confluence — additional filter
                </option>
                <option value="none">Not used for setup statistics</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Colour">
              <select
                value={f.color}
                onChange={(e) => set((a) => ({ ...a, color: e.target.value }))}
              >
                {["purple", "green", "blue", "gold", "red"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </FieldLabel>
          </div>
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={f.required}
              onChange={(e) =>
                set((a) => ({ ...a, required: e.target.checked }))
              }
            />
            Required before continuing
          </label>
        </div>
        <footer className="modal-footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={Check}>
            Save field
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
