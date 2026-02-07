type ChangePasswordErrorProps = {
  message: string | null;
};

const ChangePasswordError = ({ message }: ChangePasswordErrorProps) => {
  if (!message) return null;

  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

export default ChangePasswordError;
