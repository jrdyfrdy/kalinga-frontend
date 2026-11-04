import { Mail, Phone, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../config/routes";
import logo from "../assets/kalinga-logo.png";

const CONTACTS = [
  { icon: Smartphone, label: "(+63) 919 601 3527", href: "tel:+639196013527" },
  { icon: Phone, label: "(82) 876-543", href: "tel:+82876543" },
  { icon: Mail, label: "kalinga.tup@gmail.com", href: "mailto:kalinga.tup@gmail.com" },
];

const LINKS = [
  { label: "Privacy policy", to: ROUTES.PRIVACY_POLICY },
  { label: "Terms and conditions", to: ROUTES.TERMS_AND_CONDITIONS },
  { label: "FAQs", to: ROUTES.FAQS },
];

/** Public site footer. */
export const Footer = () => (
  <footer className="border-t border-border bg-surface">
    <div className="container grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="" className="size-9 object-contain" />
          <span className="text-xl font-bold tracking-tight">Kalinga</span>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Alisto sa bawat sakuna, tatag sa bawat pagbangon. Emergency response, care coordination and logistics for
          every Filipino community.
        </p>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Contact us</h2>
        <ul className="space-y-2">
          {CONTACTS.map(({ icon: Icon, label, href }) => (
            <li key={href}>
              <a href={href} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Quick links</h2>
        <ul className="space-y-2">
          {LINKS.map(({ label, to }) => (
            <li key={to}>
              <Link to={to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="border-t border-border">
      <p className="container py-4 text-xs text-muted-foreground">© {new Date().getFullYear()} Kalinga. All rights reserved.</p>
    </div>
  </footer>
);
