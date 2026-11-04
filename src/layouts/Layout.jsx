import AppShell from "./AppShell";

/** Responder page frame. `hideTopbar` hides the top bar on mobile during active routing. */
const Layout = ({ children, hideTopbar = false, variant }) => (
  <AppShell role="responder" hideTopbarOnMobile={hideTopbar} variant={variant}>
    {children}
  </AppShell>
);

export default Layout;
