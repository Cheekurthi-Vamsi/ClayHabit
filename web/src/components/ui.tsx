import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { ArrowRight, Moon, Sun } from 'lucide-react';

import logoMark from '@/assets/images/logo-mark.png';

import { useTheme } from '../lib/theme';

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

// ---- Buttons ----------------------------------------------------------------------------------

export type ButtonVariant = 'dock' | 'soft' | 'outline' | 'ghost' | 'danger' | 'panel' | 'glass';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

/** The phone's cartoon button: lime by default, ink outline, hard shadow, sinks when pressed. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'dock', size = 'md', icon, trailingIcon, loading, fullWidth, className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cx('btn', variant !== 'dock' && `btn--${variant}`, size !== 'md' && `btn--${size}`, fullWidth && 'btn--full', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn__spinner" aria-hidden /> : icon}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
});

/** A link styled as a button (for navigation, so it stays a real link). */
export function ButtonLink({
  href,
  variant = 'dock',
  size = 'md',
  icon,
  trailingIcon,
  className,
  children,
  onClick,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  children: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cx('btn', variant !== 'dock' && `btn--${variant}`, size !== 'md' && `btn--${size}`, className)}
    >
      {icon}
      <span>{children}</span>
      {trailingIcon}
    </a>
  );
}

export function IconButton({
  label,
  variant = 'default',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: 'default' | 'ghost' | 'lime'; size?: 'md' | 'sm' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('icon-btn', variant !== 'default' && `icon-btn--${variant}`, size === 'sm' && 'icon-btn--sm', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Google's "G", drawn locally (brand asset, as Google's sign-in guidelines allow). */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** "Continue with Google": the lime hero pill with the G on a white disc. */
export function GoogleButton({
  label = 'Continue with Google',
  busyLabel = 'Opening Google…',
  busy,
  onClick,
  fullWidth = true,
}: {
  label?: string;
  busyLabel?: string;
  busy?: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx('btn btn--lg', fullWidth && 'btn--full')}
      style={{ justifyContent: 'space-between', paddingLeft: 10, paddingRight: 22 }}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy || undefined}
    >
      <span className="g-disc">{busy ? <span className="btn__spinner" style={{ color: 'var(--color-primary)' }} /> : <GoogleMark />}</span>
      {/* Both labels share one grid cell, so switching never changes the button's width. */}
      <span style={{ display: 'grid', flex: 1, textAlign: 'left', paddingLeft: 12 }}>
        <span style={{ gridArea: '1 / 1', visibility: busy ? 'hidden' : 'visible' }}>{label}</span>
        <span style={{ gridArea: '1 / 1', visibility: busy ? 'visible' : 'hidden' }} aria-hidden={!busy}>
          {busyLabel}
        </span>
      </span>
      <ArrowRight size={20} strokeWidth={2.4} aria-hidden />
    </button>
  );
}

// ---- Brand ------------------------------------------------------------------------------------

/** "Clay" in brand navy, "Habbit" in ink, as in the logo; `mono` sets the whole name in one colour. */
export function Wordmark({ size = 24, as: Tag = 'span', mono = false }: { size?: number; as?: 'span' | 'h1' | 'div'; mono?: boolean }) {
  return (
    <Tag className={`wordmark${mono ? ' wordmark--mono' : ''}`} style={{ fontSize: size, lineHeight: 1.1 }} aria-label="ClayHabbit">
      <b>Clay</b>Habbit
    </Tag>
  );
}

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logoMark}
      width={size}
      height={size}
      alt=""
      className={className}
      style={{ width: size, height: size, borderRadius: size * 0.28, flex: 'none' }}
      decoding="async"
    />
  );
}

export function Brand({ size = 22, mono = false }: { size?: number; mono?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <Logo size={size * 1.55} />
      <Wordmark size={size} mono={mono} />
    </span>
  );
}

/** Sun/moon switch, like the phone's ThemeToggle. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} size="sm" variant={dark ? 'default' : 'lime'}>
      {dark ? <Moon size={18} /> : <Sun size={18} />}
    </IconButton>
  );
}

// ---- Surfaces ---------------------------------------------------------------------------------

export function Card({
  tone,
  pressable,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: 'panel' | 'lime' | 'aurora' | 'muted'; pressable?: boolean }) {
  return (
    <div className={cx('card', tone && `card--${tone}`, pressable && 'card--pressable', className)} {...rest}>
      {children}
    </div>
  );
}

export function Chip({
  selected,
  tone,
  children,
  onClick,
  icon,
}: {
  selected?: boolean;
  tone?: 'primary' | 'panel';
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  const className = cx('chip', selected && 'chip--selected', tone && `chip--${tone}`);
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={selected}>
        {icon}
        {children}
      </button>
    );
  }
  return (
    <span className={className}>
      {icon}
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

export function ProgressBar({ value, color, label }: { value: number; color?: string; label?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className="bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <span style={{ '--value': clamped, background: color } as CSSProperties} />
    </div>
  );
}

/** A ring drawn with SVG; the stroke animates, the box never changes. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 8,
  color = 'var(--color-highlight)',
  track = 'var(--color-surface-muted)',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 900ms var(--ease-out)' }}
        />
      </svg>
      {children ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div> : null}
    </div>
  );
}

export function Skeleton({ height, width = '100%', radius }: { height: number; width?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden />;
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="spinner" role="status" aria-label={label} />;
}

// ---- Dialog -----------------------------------------------------------------------------------

/** A native <dialog>: focus trapping, Escape and the backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  wide,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  wide?: boolean;
  labelledBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={cx('dialog', wide && 'dialog--wide')}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}

// ---- Scroll reveal ------------------------------------------------------------------------------

/**
 * Fades an element in once it scrolls into view. The element keeps its full
 * size from the first paint; only opacity and a small transform change.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const Component = Tag as 'div';
  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      className={cx('reveal', visible && 'is-visible', className)}
      style={{ '--delay': `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </Component>
  );
}
