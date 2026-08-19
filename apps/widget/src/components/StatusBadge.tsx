export function StatusBadge({ status }: { status: "VALID" | "EXPIRED" }) {
  const isValid = status === "VALID";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
        isValid ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isValid ? "bg-ok" : "bg-danger"}`} />
      {isValid ? "VIGENTE" : "VENCIDO"}
    </span>
  );
}
