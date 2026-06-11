import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import LoginPage from "@/pages/login";
import { useSessionStore } from "@/stores/session";
import { Desktop } from "@/components/desktop/Desktop";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useSessionStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/*", element: <ProtectedRoute><Desktop /></ProtectedRoute> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}