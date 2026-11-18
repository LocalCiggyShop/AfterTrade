import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ArrowUpRight,
  Database,
  CalendarDays,
  BarChart3,
  Calculator,
  NotebookPen,
  Sparkles,
  Layers,
  Wallet,
  Users,
  Settings2,
  CircleHelp,
  PanelLeft,
  ChevronsUpDown,
  Zap,
  ChevronRight,
  Trash2,
  Menu,
  X,
  Globe2,
  ArrowRight,
  Plus,
  ShieldCheck,
  Download,
} from "./lib/icons";
import type { Trade, Checklist } from "./types";
import { JournalProvider, useJournal } from "./context";
import { completed, fmtR } from "./lib/domain";
import { download } from "./lib/storage";
import { needsWelcome, startPersonalJournal } from "./lib/onboarding";
import Dashboard from "./pages/Dashboard";
import { Button, IconButton, Badge, Empty } from "./components/ui";
import { TradeDetail, TradeEditor } from "./components/trades";
import { TradingCalendar } from "./components/calendar";
import { PageHeading } from "./components/ui";
import { CandleChart } from "./components/charts";
import { WelcomeModal } from "./components/welcome";
const Journal = lazy(() => import("./pages/Journal"));
const ImportTrades = lazy(() =>
  import("./pages/Journal").then((m) => ({ default: m.ImportTrades })),
);
const Analytics = lazy(() => import("./pages/Analytics"));
const Checklists = lazy(() => import("./pages/Checklists"));
const Landing = lazy(() => import("./pages/Landing"));
const Reviews = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Reviews })),
);
const Notebook = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Notebook })),
);
const RCalculator = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.RCalculator })),
);
const Accounts = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Accounts })),
);
const Preferences = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Preferences })),
);
const Trash = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Trash })),
);
const Rooms = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Rooms })),
);
const Support = lazy(() =>
  import("./pages/Secondary").then((m) => ({ default: m.Support })),
);

const navGroups = [
  {
    label: "Trade",
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/trades/open", label: "Open Trades", icon: ArrowUpRight },
    ],
  },
  {
    label: "Review",
    items: [
      { path: "/data", label: "Trade History", icon: Database },
      { path: "/calendar", label: "Calendar", icon: CalendarDays },
      { path: "/analytics", label: "Analytics", icon: BarChart3 },
      { path: "/analytics/mfe-mae", label: "R Calculator", icon: Calculator },
      { path: "/mental-notes", label: "Notebook", icon: NotebookPen },
      { path: "/reviews", label: "Review assistant", icon: Sparkles },
    ],
  },
  {
    label: "Define",
    items: [
      { path: "/templates", label: "Checklists", icon: Layers },
      { path: "/accounts", label: "Accounts", icon: Wallet },
    ],
  },
  {
    label: "Collaborate",
    items: [{ path: "/groups", label: "Review rooms", icon: Users }],
  },
];
const getRoute = () =>
  location.hash.startsWith("#/") ? location.hash.slice(1) : "/dashboard";
export default function App() {
  return (
    <JournalProvider>
      <Workspace />
    </JournalProvider>
  );
}
function Workspace() {
  const { data, update, account, setAccount, saveError, saving, notify } =
      useJournal(),
    [route, setRoute] = useState(getRoute),
    [collapsed, setCollapsed] = useState(false),
    [mobileOpen, setMobileOpen] = useState(false),
    [logging, setLogging] = useState(false),
    [tradeId, setTradeId] = useState<string | null>(null),
    [shortcuts, setShortcuts] = useState(false),
    [welcome, setWelcome] = useState(() => needsWelcome(data)),
    [importing, setImporting] = useState(false);
  useEffect(() => {
    const handler = () => {
      setRoute(getRoute());
      setMobileOpen(false);
      window.scrollTo({ top: 0 });
    };
    addEventListener("hashchange", handler);
    return () => removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.matches(
          "input,textarea,select,[contenteditable]",
        ) ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
        e.key.toLowerCase() === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setLogging(true);
      }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, []);
  const trades = useMemo(
    () =>
      data.trades.filter((t) => account === "all" || t.accountId === account),
    [data.trades, account],
  );
  const navigate = (path: string) => {
    location.hash = path;
    setMobileOpen(false);
    setShortcuts(false);
  };
  const onTrade = (id: string) => setTradeId(id),
    onLog = () => setLogging(true);
  const exploreDemo = () => {
    update((d) => ({ ...d, onboardingCompleted: true }));
    setWelcome(false);
  };
  const startJournal = () => {
    update(startPersonalJournal);
    setAccount("all");
    setWelcome(false);
    navigate("/dashboard");
    notify(
      "Your journal is ready. Import your history or log your first trade.",
    );
  };
  const label =
    navGroups.flatMap((g) => g.items).find((i) => i.path === route)?.label ??
    (route === "/settings"
      ? "Settings"
      : route === "/profile"
        ? "Profile"
        : route === "/trash"
          ? "Trash"
          : "Help");
  const loading = (
    <div className="page-loading">
      <div className="skeleton-line" />
      <div className="skeleton-cards">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} />
        ))}
      </div>
      <div className="skeleton-panel" />
    </div>
  );
  if (route === "/home")
    return (
      <Suspense fallback={loading}>
        <Landing onOpen={() => navigate("/dashboard")} />
      </Suspense>
    );
  if (route.startsWith("/shared/"))
    return (
      <SharedTrade
        encoded={route.slice("/shared/".length)}
        onOpen={() => navigate("/dashboard")}
      />
    );
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobileOpen && (
        <div className="mobile-backdrop" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <a href="#/dashboard" className="brand sidebar-brand">
          <span className="brand-mark">
            A<span />
          </span>
          <span className="brand-word">
            <strong>
              AfterTrade<span className="accent">.</span>
            </strong>
            <small>Your trading, in perspective</small>
          </span>
        </a>
        <nav className="main-navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => (
                <a
                  key={item.path}
                  href={`#${item.path}`}
                  className={`nav-item ${route === item.path ? "active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  aria-current={route === item.path ? "page" : undefined}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.path === "/trades/open" &&
                    trades.filter((t) => !t.deletedAt && t.status === "open")
                      .length > 0 && (
                      <small>
                        {
                          trades.filter(
                            (t) => !t.deletedAt && t.status === "open",
                          ).length
                        }
                      </small>
                    )}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a
            href="#/settings"
            className={`nav-item ${route === "/settings" ? "active" : ""}`}
          >
            <Settings2 size={17} />
            <span>Settings</span>
          </a>
          <a
            href="#/support"
            className={`nav-item ${route === "/support" ? "active" : ""}`}
          >
            <CircleHelp size={17} />
            <span>Help & guide</span>
          </a>
          <div className="sidebar-account">
            <button
              className="profile-button"
              onClick={() => navigate("/profile")}
            >
              <span className="avatar">
                {data.settings.name.slice(0, 1).toUpperCase() || "R"}
              </span>
              <span>
                <strong>{data.settings.name || "Your journal"}</strong>
                <small>Personal workspace</small>
              </span>
              <ChevronsUpDown size={13} />
            </button>
            <div className="sidebar-utility">
              <button
                aria-label="Open trash"
                title="Trash"
                onClick={() => navigate("/trash")}
              >
                <Trash2 size={14} />
              </button>
              <button
                aria-label="About AfterTrade"
                title="About AfterTrade"
                onClick={() => navigate("/home")}
              >
                <Globe2 size={14} />
              </button>
              <span>
                <i className="status-dot" />
                On-device journal
              </span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <IconButton
            icon={PanelLeft}
            label="Toggle sidebar"
            onClick={() => {
              if (innerWidth < 850) setMobileOpen((s) => !s);
              else setCollapsed((s) => !s);
            }}
          />
          <div className="header-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>{label}</strong>
          </div>
          <div className="toolbar-spacer" />
          <span className="saved-indicator">
            <span className={`status-dot ${saveError ? "dot-gold" : ""}`} />
            {saveError
              ? "Not saved"
              : saving
                ? "Saving…"
                : "Saved on this device"}
          </span>
          <label className="account-selector">
            <Wallet size={15} />
            <select
              aria-label="Global account filter"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="all">All accounts</option>
              {data.accounts
                .filter((a) => a.status === "active")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="quick-actions">
            <IconButton
              icon={Zap}
              label="Quick actions"
              onClick={() => setShortcuts((s) => !s)}
            />
            {shortcuts && (
              <div className="quick-menu">
                <button onClick={onLog}>
                  <Plus size={15} />
                  Log trade<kbd>N</kbd>
                </button>
                <button onClick={() => navigate("/mental-notes")}>
                  <NotebookPen size={15} />
                  Open notebook
                </button>
                <button
                  onClick={() =>
                    download(JSON.stringify(data), "aftertrade-backup.json")
                  }
                >
                  <Download size={15} />
                  Backup journal
                </button>
              </div>
            )}
          </div>
        </header>
        {saveError && (
          <div className="save-warning" role="alert">
            {saveError}
            <button
              onClick={() =>
                download(JSON.stringify(data), "aftertrade-backup.json")
              }
            >
              Export backup
            </button>
          </div>
        )}
        {data.demo && (
          <div className="demo-banner">
            <span>
              <Sparkles size={12} />
              Demo mode · You’re exploring a sample journal.
            </span>
            <button onClick={() => setWelcome(true)}>
              Start my journal <ArrowRight size={12} />
            </button>
          </div>
        )}
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Suspense fallback={loading}>
            {route === "/dashboard" ? (
              <Dashboard
                trades={trades}
                onLog={onLog}
                onImport={() => setImporting(true)}
                onTrade={onTrade}
                navigate={navigate}
              />
            ) : route === "/data" || route === "/trades/open" ? (
              <Journal
                key={route}
                trades={trades}
                onTrade={onTrade}
                onLog={onLog}
                openOnly={route === "/trades/open"}
              />
            ) : route === "/calendar" ? (
              <div className="workspace-content calendar-page">
                <PageHeading
                  title="Calendar"
                  subtitle="Your trading days at a glance."
                  icon={CalendarDays}
                />
                <TradingCalendar trades={trades} onTrade={onTrade} />
              </div>
            ) : route === "/analytics" || route === "/your-edge" ? (
              <Analytics trades={trades} onTrade={onTrade} />
            ) : route === "/analytics/mfe-mae" ? (
              <RCalculator trades={trades} />
            ) : route === "/templates" ? (
              <Checklists />
            ) : route === "/reviews" ? (
              <Reviews trades={trades} />
            ) : route === "/mental-notes" ? (
              <Notebook />
            ) : route === "/accounts" ? (
              <Accounts />
            ) : route === "/settings" || route === "/profile" ? (
              <Preferences key={route} profile={route === "/profile"} />
            ) : route === "/trash" ? (
              <Trash />
            ) : route === "/groups" ? (
              <Rooms trades={trades} onTrade={onTrade} />
            ) : route === "/support" ? (
              <Support />
            ) : (
              <Empty
                title="This page took a different turn"
                description="Head back to your journal to continue."
                action={
                  <Button onClick={() => navigate("/dashboard")}>
                    Open dashboard
                  </Button>
                }
              />
            )}
          </Suspense>
        </main>
        <footer className="workspace-footer">
          <span>AfterTrade</span>
          <span>A little more clarity. One trade at a time.</span>
          <span>
            ⌨ <kbd>N</kbd> to log a trade
          </span>
        </footer>
      </div>
      {logging && <TradeEditor onClose={() => setLogging(false)} />}
      {importing && (
        <Suspense fallback={loading}>
          <ImportTrades onClose={() => setImporting(false)} />
        </Suspense>
      )}
      {welcome && (
        <WelcomeModal
          onDemo={exploreDemo}
          onStart={startJournal}
          returning={data.onboardingCompleted === true}
        />
      )}
      {tradeId && (
        <TradeDetail
          key={tradeId}
          tradeId={tradeId}
          onClose={() => setTradeId(null)}
          ids={trades.filter((t) => !t.deletedAt).map((t) => t.id)}
          onNavigate={setTradeId}
        />
      )}
    </div>
  );
}
function SharedTrade({
  encoded,
  onOpen,
}: {
  encoded: string;
  onOpen: () => void;
}) {
  let payload: { trade: Trade; checklist?: Checklist } | null = null;
  try {
    const raw = atob(decodeURIComponent(encoded));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !p.trade ||
      typeof p.trade.symbol !== "string" ||
      !p.trade.answers ||
      !["long", "short"].includes(p.trade.direction)
    )
      throw new Error();
    payload = p;
  } catch {
    return (
      <div className="shared-page">
        <Empty
          title="This shared trade could not be opened"
          description="The link may be incomplete. Ask the sender for a fresh copy."
          action={<Button onClick={onOpen}>Open AfterTrade</Button>}
        />
      </div>
    );
  }
  const { trade, checklist } = payload!;
  return (
    <div className="shared-page">
      <header>
        <span className="brand">
          <span className="brand-mark">
            A<span />
          </span>
          <strong>AfterTrade.</strong>
        </span>
        <Badge color="neutral">
          <ShieldCheck size={12} />
          Shared trade snapshot
        </Badge>
      </header>
      <section className="panel">
        <PageHeading
          title={trade.symbol}
          subtitle={`${trade.direction.toUpperCase()} · ${fmtR(trade.r)}`}
        />
        <CandleChart seed={trade.symbol.length * 25} height={260} />
        <p className="note-prose">{trade.notes}</p>
        <div className="answer-table">
          {checklist?.fields.map((f) => (
            <div className="answer-table-row" key={f.id}>
              <span>{f.label}</span>
              <strong>
                {Array.isArray(trade.answers[f.id])
                  ? (trade.answers[f.id] as string[]).join(", ")
                  : trade.answers[f.id] || "—"}
              </strong>
            </div>
          ))}
        </div>
      </section>
      <Button onClick={onOpen}>
        Open your own journal <ArrowRight size={15} />
      </Button>
    </div>
  );
}
