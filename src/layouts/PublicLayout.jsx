import { NavbarA } from "@/components/Navbar_1";
import { Footer } from "@/components/Footer";

/** Frame for public pages: fixed navbar, content offset below it, footer. */
export default function PublicLayout({ children, footer = true }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[1400] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>
      <NavbarA />
      <main id="content" className="flex-1 pt-16">
        {children}
      </main>
      {footer && <Footer />}
    </div>
  );
}
