import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { EscalationsPage } from "./pages/EscalationsPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { LoginPage } from "./pages/LoginPage";
import { AppShell } from "./shell/AppShell";
import { BotProvider } from "./shell/BotProvider";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const router = createBrowserRouter([
  {
    element: (
      <AuthProvider apiBaseUrl={API_BASE_URL}>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: "/login", element: <LoginPage /> },
      {
        element: (
          <RequireAuth>
            <BotProvider>
              <AppShell />
            </BotProvider>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/escalamientos" replace /> },
          { path: "/escalamientos/:id?", element: <EscalationsPage /> },
          { path: "/conocimiento", element: <KnowledgePage /> },
          {
            path: "/apariencia",
            // The preview bundles the whole widget (QR reader included): load
            // it only when Apariencia is opened.
            lazy: async () => ({
              Component: (await import("./pages/AppearancePage"))
                .AppearancePage,
            }),
          },
          { path: "*", element: <Navigate to="/escalamientos" replace /> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
