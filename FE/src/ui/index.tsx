import { bootstrap } from "@/bootstrap";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppProvider } from "./context";
import "./index.css";

bootstrap().then(
  ({ db, eventBus, service, socket, repos, sqliteDb, test, healthCheck }) => {
    const root = createRoot(document.body);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: false,
          staleTime: 1000 * 60 * 5,
        },
      },
    });
    root.render(
      <AppProvider
        db={db}
        eventBus={eventBus}
        service={service}
        socket={socket}
        repos={repos}
        sqliteDb={sqliteDb}
        test={test}
        healthCheck={healthCheck}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AppProvider>
    );
  }
);
