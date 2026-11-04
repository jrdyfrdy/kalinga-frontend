import { Link } from "react-router-dom";
import { ArrowRight, MapPin, ShieldCheck, Siren } from "lucide-react";
import { ROUTES } from "../../config/routes";
import { useAuth } from "../../context/AuthContext";
import { getDefaultRouteForRole } from "../../utils/roleRouting";
import { Button } from "@/components/ui";

const HIGHLIGHTS = [
  { icon: Siren, label: "One-tap SOS" },
  { icon: MapPin, label: "Live responder tracking" },
  { icon: ShieldCheck, label: "Verified responders" },
];

export const HeroSection = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const dashboardRoute = getDefaultRouteForRole(user?.role, user);

  return (
    <section id="hero" className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
      >
        <source src="/videos/hero-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-950/95 via-brand-950/75 to-brand-950/30" aria-hidden="true" />

      <div className="container py-20">
        <div className="max-w-2xl space-y-6 text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" /> Teknolohiya para sa kaligtasan
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Mabilis at maaasahang emergency response para sa <span className="text-accent">bawat Pilipino</span>.
          </h1>
          <p className="max-w-xl text-lg text-white/80">
            Humingi ng tulong sa isang pindot, subaybayan ang paparating na responder, at makipag-ugnayan sa
            pinakamalapit na ospital, lahat sa iisang app.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {loading ? (
              <Button size="lg" variant="secondary" disabled>
                Checking session…
              </Button>
            ) : isAuthenticated ? (
              <Button asChild size="lg" variant="accent">
                <Link to={dashboardRoute}>
                  Go to dashboard <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" variant="accent">
                  <Link to={ROUTES.CREATE_ACCOUNT}>
                    Create an account <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20">
                  <Link to={ROUTES.LOGIN}>Sign in</Link>
                </Button>
              </>
            )}
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-white/80">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-accent" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
