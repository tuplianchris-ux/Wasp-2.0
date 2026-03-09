import { useLocation, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import UpgradeBanner from "./UpgradeBanner";

const HIDE_BANNER_ROUTES = ["/settings"];

/**
 * Root layout for all authenticated pages: sidebar + main content area.
 * UpgradeBanner is shown above page content on every route except /settings.
 */
export default function Layout() {
  const location = useLocation();
  const showBanner = !HIDE_BANNER_ROUTES.includes(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          {showBanner && <UpgradeBanner />}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
