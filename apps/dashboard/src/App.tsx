import { useState } from "react";
import { getToken } from "./api";
import { LoginPage } from "./LoginPage";
import { EscalationsPage } from "./EscalationsPage";

function App() {
  const [loggedIn, setLoggedIn] = useState(() => getToken() !== null);

  return loggedIn ? (
    <EscalationsPage onLogout={() => setLoggedIn(false)} />
  ) : (
    <LoginPage onLoggedIn={() => setLoggedIn(true)} />
  );
}

export default App;
