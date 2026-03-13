type ProspectFormHeaderProps = {
  isEdit: boolean;
};

const ProspectFormHeader = ({ isEdit }: ProspectFormHeaderProps) => (
  <div className="px-6 py-4 border-b border-border/70 bg-card/80 backdrop-blur">
    <h3 className="text-base font-semibold text-foreground">
      {isEdit ? 'Modifier le prospect' : 'Nouveau prospect'}
    </h3>
  </div>
);

export default ProspectFormHeader;
