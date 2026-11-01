/** An error inside the block that failed, with a way to retry. */
export function BlockError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <p role="alert" className="text-muted">
      {message}{" "}
      <button
        type="button"
        onClick={onRetry}
        className="font-medium text-ink underline"
      >
        Reintentar
      </button>
    </p>
  );
}
