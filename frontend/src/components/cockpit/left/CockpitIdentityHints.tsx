type CockpitIdentityHintsProps = {
  isInternalRelation: boolean;
  isSolicitationRelation: boolean;
  isClientRelation: boolean;
};

const CockpitIdentityHints = ({
  isInternalRelation,
  isSolicitationRelation,
  isClientRelation
}: CockpitIdentityHintsProps) => {
  if (isInternalRelation) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
        Interne CIR : aucune entreprise a renseigner, passez au contact.
      </div>
    );
  }

  if (isSolicitationRelation) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
        Sollicitation : renseignez le nom de la societe et le numero de telephone.
      </div>
    );
  }

  if (isClientRelation) {
    return (
      <p className="text-[11px] text-slate-400">
        Selectionnez un client via la recherche pour continuer.
      </p>
    );
  }

  return null;
};

export default CockpitIdentityHints;
