import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '../ui/inputs/basic/Input';

type ContactFormPositionSectionProps = {
  positionField: UseFormRegisterReturn;
  serviceLabelField: UseFormRegisterReturn;
};

const ContactFormPositionSection = ({ positionField, serviceLabelField }: ContactFormPositionSectionProps) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-position">Poste</label>
      <Input {...positionField} id="contact-position" placeholder="Responsable maintenance" />
    </div>
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="contact-service-label">Service</label>
      <Input {...serviceLabelField} id="contact-service-label" placeholder="Maintenance, achats…" />
    </div>
  </div>
);

export default ContactFormPositionSection;
