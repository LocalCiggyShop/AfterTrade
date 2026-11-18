import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Layers,
  LineChart as ChartIcon,
  ShieldCheck,
  Sparkles,
  Target,
  BookOpen,
  Menu,
  X,
} from "../lib/icons";
import { useState } from "react";
import { Button, Badge } from "../components/ui";
import { CandleChart, LineChart } from "../components/charts";

export default function Landing({ onOpen }: { onOpen: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="landing">
      <nav className="landing-nav">
        <a className="brand" href="#/home">
          <span className="brand-mark">
            A<span />
          </span>
          <span>
            <strong>
              AfterTrade<span className="accent">.</span>
            </strong>
          </span>
        </a>
        <div className={`landing-nav-links ${menu ? "open" : ""}`}>
          <a
            href="#how"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("how")
                ?.scrollIntoView({ behavior: "smooth" });
              setMenu(false);
            }}
          >
            How it works
          </a>
          <a
            href="#features"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" });
              setMenu(false);
            }}
          >
            Features
          </a>
          <a
            href="#questions"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("questions")
                ?.scrollIntoView({ behavior: "smooth" });
              setMenu(false);
            }}
          >
            Questions
          </a>
          <Button variant="secondary" onClick={onOpen}>
            Open your journal <ArrowRight size={14} />
          </Button>
        </div>
        <button
          className="landing-menu"
          aria-label="Toggle menu"
          onClick={() => setMenu((v) => !v)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <Badge color="neutral">
              <span className="status-dot" />
              Your trading, in perspective
            </Badge>
            <h1>
              Every trade
              <br />
              has a story.
              <br />
              <span>Find your edge.</span>
            </h1>
            <p>
              A thoughtful journal for the decisions behind your trades. Define
              your setup, capture the context, and let your own history show you
              what works.
            </p>
            <div className="hero-actions">
              <Button onClick={onOpen} className="hero-primary">
                Open your journal <ArrowRight size={17} />
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  document
                    .getElementById("how")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Take a closer look <ArrowUpRight size={16} />
              </Button>
            </div>
            <p className="hero-micro">
              Your process. Your data. A clearer picture.
            </p>
            <div className="hero-trust">
              <span>
                <Check size={14} />
                No subscription
              </span>
              <span>
                <Check size={14} />
                Saved on your device
              </span>
              <span>
                <Check size={14} />
                Every market
              </span>
            </div>
          </div>
          <div className="hero-product">
            <div className="product-window">
              <div className="window-bar">
                <span />
                <span />
                <span />
                <small>aftertrade / your-workspace</small>
                <ShieldCheck size={13} />
              </div>
              <div className="hero-checklist">
                <div>
                  <span className="eyebrow">Your setup</span>
                  <Badge color="purple">
                    <Sparkles size={10} />A little more clarity
                  </Badge>
                </div>
                {[
                  "Higher timeframe aligned",
                  "Liquidity swept",
                  "Entry confirmed",
                ].map((c) => (
                  <div className="hero-check" key={c}>
                    <span>{c}</span>
                    <span>
                      <Check size={12} />
                    </span>
                  </div>
                ))}
                <div className="hero-session">
                  <span>Session</span>
                  <Badge color="neutral">New York</Badge>
                </div>
              </div>
              <div className="hero-stats">
                <span className="eyebrow">The bigger picture</span>
                <strong>
                  72.4<span>%</span>
                </strong>
                <small>historical win rate</small>
                <div>
                  <span>
                    <b>58</b>
                    <small>trades</small>
                  </span>
                  <span>
                    <b className="positive">+1.6R</b>
                    <small>average R</small>
                  </span>
                  <Badge color="green">Building an edge</Badge>
                </div>
              </div>
              <div className="hero-equity">
                <span className="eyebrow">One trade at a time</span>
                <LineChart
                  values={[0, 1, 0.5, 2, 1.8, 3, 4, 3.5, 5.2, 6.4, 6, 8.2, 9.5]}
                  height={90}
                  compact
                />
              </div>
              <div className="hero-example">
                Illustrative journal · sample data
              </div>
            </div>
            <div className="floating-note">
              <ShieldCheck size={22} />
              <span>
                <strong>Your process comes first.</strong>
                <small>The numbers bring perspective.</small>
              </span>
            </div>
          </div>
        </section>
        <div className="hero-scroll">
          <span>Make every trade a little more useful</span>
          <ChevronDown size={15} />
        </div>
        <section className="landing-section process-section" id="how">
          <span className="eyebrow accent">From a trade to a pattern</span>
          <h2>
            A clearer process.
            <br />
            <span>A more useful journal.</span>
          </h2>
          <p className="section-intro">
            P&L tells you what happened. The context tells you what to learn.
          </p>
          <div className="process-grid">
            {[
              {
                step: "01",
                icon: Layers,
                title: "Define your setup",
                text: "Turn your strategy into a checklist. Capture the conditions that make a trade worth taking.",
              },
              {
                step: "02",
                icon: BookOpen,
                title: "Record the decision",
                text: "Add the chart, the risk and the reason. Keep your process close to the outcome.",
              },
              {
                step: "03",
                icon: ChartIcon,
                title: "Understand the pattern",
                text: "Compare setups, sessions and habits. Find the decisions that are worth repeating.",
              },
            ].map((c) => (
              <article key={c.step}>
                <span className="process-step">{c.step}</span>
                <c.icon size={25} />
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-section feature-section" id="features">
          <div>
            <span className="eyebrow accent">Built for the review</span>
            <h2>
              Less scattered.
              <br />
              <span>More considered.</span>
            </h2>
            <p className="section-intro">
              A focused workspace for your trades, your thinking, and the
              lessons in between.
            </p>
            <div className="landing-feature-list">
              {[
                {
                  icon: Target,
                  title: "Checklists that fit your strategy",
                  text: "Custom fields, groups and core setup conditions.",
                },
                {
                  icon: ChartIcon,
                  title: "A useful view of your performance",
                  text: "Calendars, equity, timing, symbols and R multiples.",
                },
                {
                  icon: Sparkles,
                  title: "Reviews grounded in your journal",
                  text: "Observations and questions built from your records.",
                },
                {
                  icon: ShieldCheck,
                  title: "A journal you own",
                  text: "Browser storage, full backups and CSV exports.",
                },
              ].map((f) => (
                <div key={f.title}>
                  <span>
                    <f.icon size={18} />
                  </span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-trade-preview">
            <div className="trade-preview-top">
              <Badge color="green">
                <ArrowUpRight size={12} />
                Long
              </Badge>
              <span>NQ · Structure shift</span>
              <Badge color="green">Win</Badge>
            </div>
            <CandleChart seed={53} height={240} />
            <div className="trade-preview-bottom">
              <span className="eyebrow">A decision worth reviewing</span>
              <strong className="positive">+2.10R</strong>
              <p>
                Waited for the sweep. Followed the checklist. Let the setup
                resolve.
              </p>
              <div className="row">
                <Badge>New York</Badge>
                <Badge color="green">Followed rules</Badge>
              </div>
            </div>
          </div>
        </section>
        <section className="landing-section faq-section" id="questions">
          <span className="eyebrow accent">A few good questions</span>
          <h2>Before you begin.</h2>
          {[
            {
              q: "What markets can I journal?",
              a: "Any market where you take structured trades: futures, forex, stocks, crypto and more. Symbols and checklist conditions are yours to define.",
            },
            {
              q: "Where is my journal saved?",
              a: "Your records stay in this browser using local storage on your device. Export a full backup from Settings to move devices or keep a separate copy.",
            },
            {
              q: "Can I bring my existing trades?",
              a: "Yes. Import a CSV with symbol and direction columns, plus optional dates, outcomes, R, P&L and notes. AfterTrade JSON backups restore the full journal.",
            },
            {
              q: "Does the review assistant use an external AI service?",
              a: "The current review assistant computes observations locally from your journal statistics. No model subscription or external AI calls are required.",
            },
          ].map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <PlusIcon />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <section className="landing-cta">
          <span className="eyebrow">
            A little more intention, every session
          </span>
          <h2>
            Your next trade
            <br />
            deserves a clearer view.
          </h2>
          <Button onClick={onOpen}>
            Open AfterTrade <ArrowRight size={17} />
          </Button>
          <p>Start with a sample journal. Make it yours when you’re ready.</p>
        </section>
      </main>
      <footer className="landing-footer">
        <a className="brand" href="#/home">
          <span className="brand-mark">
            A<span />
          </span>
          <strong>
            AfterTrade<span className="accent">.</span>
          </strong>
        </a>
        <span>A little more clarity. One trade at a time.</span>
        <button onClick={onOpen}>
          Open journal <ArrowUpRight size={14} />
        </button>
        <small>© {new Date().getFullYear()} AfterTrade</small>
      </footer>
    </div>
  );
}
function PlusIcon() {
  return <span className="faq-plus">+</span>;
}
