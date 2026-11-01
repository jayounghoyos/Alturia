import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { RequireAuth } from "./RequireAuth";

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <p>Pantalla de login</p> },
      {
        path: "/conocimiento",
        element: (
          <RequireAuth>
            <p>Conocimiento</p>
          </RequireAuth>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <AuthProvider apiBaseUrl="https://api.test">
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

describe("RequireAuth", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("sends a signed-out admin to the login screen", () => {
    renderAt("/conocimiento");
    expect(screen.getByText("Pantalla de login")).toBeTruthy();
  });

  it("lets a signed-in admin through", () => {
    localStorage.setItem("alturia-admin-token", "token");
    renderAt("/conocimiento");
    expect(screen.getByText("Conocimiento")).toBeTruthy();
  });
});
