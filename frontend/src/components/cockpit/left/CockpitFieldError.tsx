type CockpitFieldErrorProps = {
  message?: string;
};

const CockpitFieldError = ({ message }: CockpitFieldErrorProps) => {
  if (!message) return null;

  return (
    <p className="text-xs text-destructive mt-1" role="status" aria-live="polite">
      {message}
    </p>
  );
};

export default CockpitFieldError;
