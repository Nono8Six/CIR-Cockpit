import type { RelationMode } from '@/constants/relations';

type CockpitIdentityHintsProps = {
  relationMode: RelationMode;
};

const CockpitIdentityHints = ({
  relationMode
}: CockpitIdentityHintsProps) => {
  if (relationMode === 'internal') {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        Interne CIR : aucune entreprise à renseigner, passez au contact.
      </div>
    );
  }

  if (relationMode === 'solicitation') {
    return (
      <div className="rounded-md border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        Sollicitation : renseignez le nom de la société et le numéro de téléphone.
      </div>
    );
  }

  if (relationMode === 'client') {
    return (
      <p className="text-xs text-muted-foreground/80">
        Sélectionnez un client via la recherche pour continuer.
      </p>
    );
  }

  if (relationMode === 'individual') {
    return (
      <p className="text-xs text-muted-foreground/80">
        Particulier : renseignez le contact, aucun nom de société n&apos;est requis.
      </p>
    );
  }

  return null;
};

export default CockpitIdentityHints;
