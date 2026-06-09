import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import StoragePage from "@/pages/storage";
import DockerPage from "@/pages/docker";
import FilesPage from "@/pages/files";
import UsersPage from "@/pages/users";
import LogsPage from "@/pages/logs";
import SystemPage from "@/pages/system";
import SettingsPage from "@/pages/settings";
import SharesPage from "@/pages/shares";
import AlertsPage from "@/pages/alerts";
import { useSessionStore } from "@/stores/session";
import { ShellLayout } from "@/components/layout/ShellLayout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: (
      <ProtectedRoute>
        <ShellLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/storage", element: <StoragePage /> },
      { path: "/shares", element: <SharesPage /> },
      { path: "/files", element: <FilesPage /> },
      { path: "/docker", element: <DockerPage /> },
      { path: "/users", element: <UsersPage /> },
      { path: "/logs", element: <LogsPage /> },
      { path: "/alerts", element: <AlertsPage /> },
      { path: "/system", element: <SystemPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
