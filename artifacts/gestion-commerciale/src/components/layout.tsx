import { Link, useLocation } from "wouter";
import { useGetCompany } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Package, 
  Settings,
  Menu
} from "lucide-react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: company } = useGetCompany();

  const nav = [
    { name: "Tableau de bord", path: "/", icon: LayoutDashboard },
    { name: "Documents", path: "/documents", icon: FileText },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Articles", path: "/articles", icon: Package },
    { name: "Paramètres", path: "/parametres", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-bold text-xl uppercase tracking-wider text-primary">
            {company?.name || "GESTION CO."}
          </h1>
          {company?.comptoirName && (
            <p className="text-xs text-sidebar-foreground/70 mt-1">{company.comptoirName}</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80'}`}>
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center px-4 md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-bold ml-4">{company?.name || "Gestion Commerciale"}</span>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
