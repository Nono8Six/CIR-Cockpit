import { Input } from '@/components/ui/input';

type UserCreateIdentitySectionProps = {
  email: string;
  firstName: string;
  lastName: string;
  onEmailChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
};

const UserCreateIdentitySection = ({
  email,
  firstName,
  lastName,
  onEmailChange,
  onFirstNameChange,
  onLastNameChange
}: UserCreateIdentitySectionProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <label htmlFor="create-user-email" className="text-xs font-medium text-slate-500">
          Email
        </label>
        <Input
          id="create-user-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="email@entreprise.fr"
        />
      </div>
      <div>
        <label htmlFor="create-user-last-name" className="text-xs font-medium text-slate-500">
          Nom
        </label>
        <Input
          id="create-user-last-name"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          placeholder="FERRON"
        />
      </div>
      <div>
        <label htmlFor="create-user-first-name" className="text-xs font-medium text-slate-500">
          Prenom
        </label>
        <Input
          id="create-user-first-name"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          placeholder="Arnaud"
        />
      </div>
    </div>
  );
};

export default UserCreateIdentitySection;
