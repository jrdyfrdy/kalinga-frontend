import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";

// Context & Components
import { AuthProvider } from "./context/AuthContext";
import { RealtimeProvider } from "./context/RealtimeContext";
import { IncidentProvider } from "./context/IncidentContext";
import { TriageProvider } from "./context/TriageProvider";
import { ResponderDevMenuProvider } from "./context/ResponderDevMenuContext";
import { Toaster } from "./components/ui/toaster";
import { ConfirmProvider } from "./components/ui/confirm";
import { TooltipProvider } from "./components/ui/controls";

import NotFound from "./pages-home/NotFound";

const StyleGuide = lazy(() => import("./pages-dev/StyleGuide"));

// Route Modules
import { PublicRoutes } from "./routes/PublicRoutes";
import { AccountRoutes } from "./routes/AccountRoutes";
import { PatientRoutes } from "./routes/PatientRoutes";
import { AdminRoutes } from "./routes/AdminRoutes";
import { ResponderRoutes } from "./routes/ResponderRoutes";
import { LogisticsRoutes } from "./routes/LogisticsRoutes";

// Loading component for Suspense fallback
const PageLoader = () => (
  <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
    <span className="size-8 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none" aria-hidden="true" />
    Loading…
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
      <ConfirmProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <RealtimeProvider>
            <IncidentProvider>
              <TriageProvider>
                <ResponderDevMenuProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      {PublicRoutes()}

                      {/* Account Creation Flow */}
                      {AccountRoutes()}

                      {/* Patient Routes */}
                      {PatientRoutes()}

                      {/* Admin Routes */}
                      {AdminRoutes()}

                      {/* Responder Routes */}
                      {ResponderRoutes()}

                      {/* Logistics Routes */}
                      {LogisticsRoutes()}

                      {import.meta.env.DEV && <Route path="/dev/ui" element={<StyleGuide />} />}

                      {/* 404 Not Found */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ResponderDevMenuProvider>
              </TriageProvider>
            </IncidentProvider>
          </RealtimeProvider>
        </AuthProvider>
      </BrowserRouter>
      </ConfirmProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
