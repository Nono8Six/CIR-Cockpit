type ChangePasswordErrorProps = {
  message: string | null;
};

const ChangePasswordError = ({ message }: ChangePasswordErrorProps) => {
  if (!message) return null;

  return (
    <div
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

export default ChangePasswordError;
