import { Switch, Route, Router as WouterRouter, useRoute } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import DocumentsList from "@/pages/documents";
import NewDocument from "@/pages/documents/new";
import EditDocument from "@/pages/documents/edit";
import DocumentDetail from "@/pages/documents/detail";
import DocumentPrint from "@/pages/documents/print";
import ClientsList from "@/pages/clients";
import ClientDetail from "@/pages/clients/detail";
import ArticlesList from "@/pages/articles";
import ArticleDetail from "@/pages/articles/detail";
import Parametres from "@/pages/parametres";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function DocumentByIdRoute({
  render,
}: {
  render: (id: number) => React.ReactNode;
}) {
  const [, params] = useRoute<{ id: string }>("/documents/:id/*?");
  const [, paramsBare] = useRoute<{ id: string }>("/documents/:id");
  const id = parseInt((params?.id ?? paramsBare?.id ?? "0"), 10);
  if (!id) return <NotFound />;
  return <>{render(id)}</>;
}

function EditDocumentRoute() {
  const [, params] = useRoute<{ id: string }>("/documents/:id/edit");
  const id = parseInt(params?.id ?? "0", 10);
  return <EditDocument id={id} />;
}

function PrintDocumentRoute() {
  const [, params] = useRoute<{ id: string }>("/documents/:id/print");
  const id = parseInt(params?.id ?? "0", 10);
  const duplicata = new URLSearchParams(window.location.search).has("duplicata");
  return <DocumentPrint id={id} duplicata={duplicata} />;
}

function DetailDocumentRoute() {
  const [, params] = useRoute<{ id: string }>("/documents/:id");
  const id = parseInt(params?.id ?? "0", 10);
  return <DocumentDetail id={id} />;
}

function ClientDetailRoute() {
  const [, params] = useRoute<{ id: string }>("/clients/:id");
  const id = parseInt(params?.id ?? "0", 10);
  return <ClientDetail id={id} />;
}

function ArticleDetailRoute() {
  const [, params] = useRoute<{ id: string }>("/articles/:id");
  const id = parseInt(params?.id ?? "0", 10);
  return <ArticleDetail id={id} />;
}

function AppRouter() {
  return (
    <Switch>
      {/* Print view: NO layout chrome */}
      <Route path="/documents/:id/print" component={PrintDocumentRoute} />

      {/* Everything else: with layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/documents" component={DocumentsList} />
            <Route path="/documents/new" component={NewDocument} />
            <Route path="/documents/:id/edit" component={EditDocumentRoute} />
            <Route path="/documents/:id" component={DetailDocumentRoute} />
            <Route path="/clients" component={ClientsList} />
            <Route path="/clients/:id" component={ClientDetailRoute} />
            <Route path="/articles" component={ArticlesList} />
            <Route path="/articles/:id" component={ArticleDetailRoute} />
            <Route path="/parametres" component={Parametres} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <SonnerToaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
