import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mercadinho do Ricardo" },
      { name: "description", content: "PDV e controle financeiro acessível para o Mercadinho do Ricardo." },
      { property: "og:title", content: "Mercadinho do Ricardo" },
      { property: "og:description", content: "PDV e controle financeiro acessível." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Figtree:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-dvh flex flex-col">
        <AppNav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}

function AppNav() {
  const linkBase =
    "px-4 py-2.5 rounded-lg text-base font-semibold transition-colors";
  const active = { className: linkBase + " bg-primary text-primary-foreground" };
  const inactive = { className: linkBase + " text-foreground/80 hover:bg-secondary" };
  return (
    <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-5 py-3 flex flex-wrap items-center gap-4 justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-display">
          <span className="w-10 h-10 rounded-lg bg-primary text-primary-foreground grid place-items-center text-xl font-bold">M</span>
          <span className="text-xl font-bold text-foreground leading-tight">
            Mercadinho<br className="hidden sm:block" /><span className="text-muted-foreground text-sm font-medium sm:font-semibold sm:text-base"> do Ricardo</span>
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1" aria-label="Navegação principal">
          <Link to="/" activeOptions={{ exact: true }} activeProps={active} inactiveProps={inactive}>
            Início
          </Link>
          <Link to="/pdv" activeProps={active} inactiveProps={inactive}>
            Vender
          </Link>
          <Link to="/produtos" activeProps={active} inactiveProps={inactive}>
            Produtos
          </Link>
          <Link to="/clientes" activeProps={active} inactiveProps={inactive}>
            Clientes
          </Link>
          <Link to="/fiado" activeProps={active} inactiveProps={inactive}>
            Fiado
          </Link>
        </nav>
      </div>
    </header>
  );
}
