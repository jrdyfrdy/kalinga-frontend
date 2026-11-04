import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, Siren } from "lucide-react";
import logo from "@/assets/kalinga-logo.png";
import { ThemeToggle } from "@/components/ui";
import { cn } from "@/lib/utils";

const POINTS = [
  { icon: Siren, text: "Request help in one tap from wherever you are." },
  { icon: MapPin, text: "See your responder's live location and ETA." },
  { icon: ShieldCheck, text: "Responders are verified before they can be dispatched." },
];

/**
 * Split layout for sign-in, sign-up and recovery screens: brand panel on
 * large screens, a single focused column on mobile.
 */
export default function AuthLayout({ title, description, children, footer, width = "sm" }) {
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-700/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-gold-500/15 blur-3xl"
          aria-hidden="true"
        />
        <Link to="/" className="relative flex items-center gap-3" aria-label="Kalinga home">
          <img src={logo} alt="" className="size-10 object-contain" />
          <span className="text-2xl font-bold tracking-tight">Kalinga</span>
        </Link>
        <div className="relative mt-auto max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-accent">Alisto sa bawat sakuna · Tatag sa bawat pagbangon</p>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">Emergency care that finds you, fast.</h2>
          </div>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-white/80">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4 text-accent" aria-hidden="true" />
                </span>
                <span className="pt-1 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main id="content" className="flex flex-col">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 lg:invisible" aria-label="Kalinga home">
            <img src={logo} alt="" className="size-8 object-contain" />
            <span className="text-lg font-bold tracking-tight">Kalinga</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className={cn("w-full space-y-6", width === "sm" ? "max-w-sm" : width === "md" ? "max-w-md" : "max-w-xl")}>
            {(title || description) && (
              <div className="space-y-2">
                {title && <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>}
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>
            )}
            {children}
            {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
