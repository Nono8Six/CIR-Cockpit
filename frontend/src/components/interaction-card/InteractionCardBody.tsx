import type { Interaction } from '@/types';

type InteractionCardBodyProps = {
  data: Interaction;
};

const InteractionCardBody = ({ data }: InteractionCardBodyProps) => (
  <div className="mb-2.5">
    <p className="font-semibold text-sm text-slate-900 leading-snug">{data.subject}</p>
    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
      {data.contact_name}
      {(data.contact_phone || data.contact_email) && <span className="text-slate-300">|</span>}
      {data.contact_phone ?? data.contact_email ?? ''}
    </p>
  </div>
);

export default InteractionCardBody;
