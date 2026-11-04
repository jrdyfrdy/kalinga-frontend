import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
          <Compass className="size-7" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
        </div>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link to="/">Go to home</Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
      </div>
    </main>
  );
}
