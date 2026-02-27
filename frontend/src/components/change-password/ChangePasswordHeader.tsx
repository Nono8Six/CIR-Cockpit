type ChangePasswordHeaderProps = {
  userEmail: string;
};

const ChangePasswordHeader = ({ userEmail }: ChangePasswordHeaderProps) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 bg-primary rounded flex items-center justify-center text-white font-black tracking-tighter shadow-sm transform -skew-x-6">
      CIR
    </div>
    <div className="flex flex-col">
      <h1 className="font-bold text-foreground text-lg leading-tight">
        Changement de mot de passe obligatoire
      </h1>
      <span className="text-xs text-muted-foreground">{userEmail}</span>
    </div>
  </div>
);

export default ChangePasswordHeader;
