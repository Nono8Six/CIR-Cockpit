import { Car, Mail, Phone, Store } from 'lucide-react';

const iconClassName = 'w-3 h-3';

export const getInteractionChannelIcon = (channel: string) => {
  switch (channel) {
    case 'Téléphone':
      return <Phone className={iconClassName} />;
    case 'Email':
      return <Mail className={iconClassName} />;
    case 'Comptoir':
      return <Store className={iconClassName} />;
    case 'Visite':
      return <Car className={iconClassName} />;
    default:
      return <Phone className={iconClassName} />;
  }
};
