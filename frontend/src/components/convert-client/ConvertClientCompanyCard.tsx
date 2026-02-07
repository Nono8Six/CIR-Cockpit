type ConvertClientCompanyCardProps = {
  name: string;
};

const ConvertClientCompanyCard = ({ name }: ConvertClientCompanyCardProps) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">Societe</p>
      <p className="text-sm font-semibold text-slate-800">{name}</p>
    </div>
  );
};

export default ConvertClientCompanyCard;
