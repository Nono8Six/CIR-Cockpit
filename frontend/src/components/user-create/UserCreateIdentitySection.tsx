import { Input } from '@/components/ui/input';

type UserCreateIdentitySectionProps = {
  email: string;
  displayName: string;
  onEmailChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
};

const UserCreateIdentitySection = ({
  email,
  displayName,
  onEmailChange,
  onDisplayNameChange
}: UserCreateIdentitySectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-medium text-slate-500">Email</label>
        <Input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="email@entreprise.fr" />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Nom complet</label>
        <Input value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} placeholder="Nom Prenom" />
      </div>
    </div>
  );
};

export default UserCreateIdentitySection;
