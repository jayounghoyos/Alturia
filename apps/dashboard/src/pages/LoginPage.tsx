import { Mountain } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/auth-context";
import { HttpError } from "../lib/http";

export function LoginPage() {
  const { login, signedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/escalamientos";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (signedIn) return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      void navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof HttpError && err.status === 401
          ? "Correo o contraseña incorrectos."
          : "No pudimos conectar con el servidor. Si lleva un rato sin uso puede tardar un minuto en despertar; intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ground px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-[360px] rounded-sheet border border-line bg-surface p-6"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Mountain size={18} className="text-accent" aria-hidden />
          AlturiaBot
        </p>
        <h1 className="mt-6 text-[22px] leading-7 font-semibold">
          Entra a tu panel
        </h1>
        <p className="mt-1 text-muted">
          Responde a quien pidió un asesor y ajusta tu asistente.
        </p>

        <label htmlFor="email" className="mt-6 block font-medium">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 h-10 w-full rounded-[10px] border border-line px-3 outline-none focus:border-accent"
        />

        <label htmlFor="password" className="mt-4 block font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 h-10 w-full rounded-[10px] border border-line px-3 outline-none focus:border-accent"
        />

        {error && (
          <p role="alert" className="mt-4 text-negative">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-10 w-full rounded-control bg-primary font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
