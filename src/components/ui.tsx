import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  X,
  Plus,
  ArrowUpRight,
  Search,
  Star,
  ChevronRight,
  type LucideIcon,
} from "../lib/icons";
import { createPortal } from "react-dom";

export function Button({
  children,
  onClick,
  variant = "primary",
  icon: Icon,
  className = "",
  disabled = false,
  type = "button",
  title,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onClick,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon size={16} />
    </button>
  );
}
export function Badge({
  children,
  color = "purple",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}
export function PageHeading({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>
          {Icon && <Icon size={23} className="accent" />}
          {title}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </header>
  );
}
export function SectionTitle({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>
        {Icon && <Icon size={16} />}
        {title}
      </h2>
      {children}
    </div>
  );
}
export function Metric({
  label,
  value,
  sub,
  tone = "",
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ""}`}>
      <span className="eyebrow">{label}</span>
      <div className={`metric-value ${tone}`}>
        {value}
        {children}
      </div>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
export function Empty({
  title,
  description,
  action,
  icon: Icon = Plus,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-box">
      <Search size={15} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function Tabs({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="tabs" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "selected" : ""}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Rating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`Rate ${n} stars`}
          onClick={() => onChange?.(value === n ? 0 : n)}
        >
          <Star
            size={14}
            fill={n <= value ? "currentColor" : "none"}
            className={n <= value ? "gold" : ""}
          />
        </button>
      ))}
    </div>
  );
}
export function FieldLabel({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <label className="form-field">
      <span id={id}>{label}</span>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
          ? cloneElement(
              child as ReactElement<{ "aria-labelledby"?: string }>,
              { "aria-labelledby": id },
            )
          : child,
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function LinkCard({
  title,
  children,
  onClick,
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="link-card" onClick={onClick}>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
      <ArrowUpRight size={20} />
    </button>
  );
}
export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <div className="breadcrumb">
      Workspace <ChevronRight size={12} />
      {children}
    </div>
  );
}
