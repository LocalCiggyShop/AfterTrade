import {
  ArrowRight,
  BarChart3,
  Eye,
  Layers,
  ShieldCheck,
  Upload,
} from "../lib/icons";
import { Modal } from "./ui";

export function WelcomeModal({
  onDemo,
  onStart,
  returning = false,
}: {
  onDemo: () => void;
  onStart: () => void;
  returning?: boolean;
}) {
  return (
    <Modal
      title={returning ? "Ready to make it yours?" : "Welcome to AfterTrade"}
      subtitle="A trading journal that turns your decisions into a clearer picture."
      className="welcome-modal"
      onClose={onDemo}
    >
      <div className="modal-body welcome-body">
        <div className="welcome-intro">
          <span className="welcome-mark" aria-hidden="true">
            A<span />
          </span>
          <div>
            <span className="eyebrow accent">
              A little more clarity. One trade at a time.
            </span>
            <h3>Your process. Your progress.</h3>
            <p>
              Keep your trades, screenshots and reflections together. Find what
              works, understand what doesn’t, and build a process you can
              repeat.
            </p>
          </div>
        </div>
        <ol className="welcome-steps" aria-label="How to use AfterTrade">
          <li>
            <span className="welcome-step-icon">
              <Layers size={17} />
            </span>
            <div>
              <strong>01 · Define your setup</strong>
              <p>
                Use or edit a checklist to capture the conditions you trade.
              </p>
            </div>
          </li>
          <li>
            <span className="welcome-step-icon">
              <Upload size={17} />
            </span>
            <div>
              <strong>02 · Add your trades</strong>
              <p>
                Import CSV or JSON, or log a trade with notes and screenshots.
              </p>
            </div>
          </li>
          <li>
            <span className="welcome-step-icon">
              <BarChart3 size={17} />
            </span>
            <div>
              <strong>03 · Review your progress</strong>
              <p>
                Explore your calendar, analytics and review assistant to spot
                patterns.
              </p>
            </div>
          </li>
        </ol>
        <div className="welcome-choice-heading">
          <h3>Choose where to begin</h3>
          <span>You can start with the demo and switch later.</span>
        </div>
        <div className="welcome-choices">
          <button
            className="welcome-choice welcome-choice-primary"
            onClick={onStart}
          >
            <span className="welcome-choice-icon">
              <Upload size={19} />
            </span>
            <strong>
              Start my journal <ArrowRight size={17} />
            </strong>
            <p>
              A clean workspace for your own trades. Import your history or log
              your first entry.
            </p>
            <small>Demo records are cleared. Your checklist stays ready.</small>
          </button>
          <button className="welcome-choice" onClick={onDemo}>
            <span className="welcome-choice-icon">
              <Eye size={19} />
            </span>
            <strong>
              {returning ? "Keep exploring demo" : "Explore the demo"}{" "}
              <ArrowRight size={17} />
            </strong>
            <p>
              Look around a complete journal with sample trades, charts and
              notes.
            </p>
            <small>
              Adding your first real trade or import clears demo records.
            </small>
          </button>
        </div>
      </div>
      <footer className="welcome-footer">
        <ShieldCheck size={14} />
        <span>
          Your journal saves in this browser. Export a backup to keep a separate
          copy.
        </span>
      </footer>
    </Modal>
  );
}
