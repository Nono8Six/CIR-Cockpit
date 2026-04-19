import { Car, Mail, Phone, Store } from 'lucide-react';

export const getDashboardChannelIcon = (channel: string) => {
  switch (channel) {
    case 'Téléphone':
      return <Phone size={14} className="text-muted-foreground" />;
    case 'Email':
      return <Mail size={14} className="text-muted-foreground" />;
    case 'Comptoir':
      return <Store size={14} className="text-muted-foreground" />;
    case 'Visite':
      return <Car size={14} className="text-muted-foreground" />;
    default:
      return <Phone size={14} className="text-muted-foreground" />;
  }
};
