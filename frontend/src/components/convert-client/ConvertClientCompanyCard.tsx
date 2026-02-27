type ConvertClientCompanyCardProps = {
  name: string;
};

const ConvertClientCompanyCard = ({ name }: ConvertClientCompanyCardProps) => {
  return (
    <div className="rounded-xl border border-border/70 bg-surface-1/80 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Societe</p>
      <p className="text-sm font-semibold text-foreground">{name}</p>
    </div>
  );
};

export default ConvertClientCompanyCard;
