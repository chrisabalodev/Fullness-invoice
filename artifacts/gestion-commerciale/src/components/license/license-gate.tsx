import { useCallback, useState, type ReactNode } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { fetchLicenseStatus } from "@/lib/license-api";
import { LandingScreen } from "./landing-screen";
import { BlockedScreen } from "./blocked-screen";
import { AdminSection } from "./admin-section";

type Mode = "gestion" | "admin" | null;
const MODE_STORAGE_KEY = "gc_access_mode";

export function LicenseGate({ children }: { children: ReactNode }) {
  const [isPrint] = useRoute("/documents/:id/print");

  // Persist the "Gestion commerciale" choice for the browser session so the
  // landing screen does not reappear on every reload / new navigation. The
  // "admin" mode is intentionally not persisted (re-auth on reload).
  const [mode, setModeState] = useState<Mode>(() =>
    sessionStorage.getItem(MODE_STORAGE_KEY) === "gestion" ? "gestion" : null,
  );
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    if (m === "gestion") sessionStorage.setItem(MODE_STORAGE_KEY, "gestion");
    else sessionStorage.removeItem(MODE_STORAGE_KEY);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["license", "status"],
    queryFn: fetchLicenseStatus,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (data.expired) {
    return (
      <BlockedScreen
        onUnlocked={() => {
          setMode(null);
          void refetch();
        }}
      />
    );
  }

  // Print view must bypass the landing screen (auto window.print()).
  if (isPrint) return <>{children}</>;

  if (mode === null) return <LandingScreen status={data} onSelect={setMode} />;
  if (mode === "admin") return <AdminSection onExit={() => setMode(null)} />;

  return <>{children}</>;
}
