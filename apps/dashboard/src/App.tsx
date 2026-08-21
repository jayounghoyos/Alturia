import { useState } from "react";
import { getToken } from "./api";
import { LoginPage } from "./LoginPage";
import { DashboardShell } from "./DashboardShell";

function App() {
  const [loggedIn, setLoggedIn] = useState(() => getToken() !== null);

  return loggedIn ? (
    <DashboardShell onLogout={() => setLoggedIn(false)} />
  ) : (
    <LoginPage onLoggedIn={() => setLoggedIn(true)} />
  );
}

export default App;
