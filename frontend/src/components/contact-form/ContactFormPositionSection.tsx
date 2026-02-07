import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';

type ContactFormPositionSectionProps = {
  positionField: UseFormRegisterReturn;
};

const ContactFormPositionSection = ({ positionField }: ContactFormPositionSectionProps) => (
  <div>
    <label className="text-xs font-medium text-slate-500" htmlFor="contact-position">Poste</label>
    <Input {...positionField} id="contact-position" placeholder="Responsable maintenance" />
  </div>
);

export default ContactFormPositionSection;
