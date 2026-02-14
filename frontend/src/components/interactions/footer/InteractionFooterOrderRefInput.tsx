import { Hash } from 'lucide-react';

import { Input } from '@/components/ui/input';

type InteractionFooterOrderRefInputProps = {
  orderRef: string;
  onOrderRefChange: (value: string) => void;
};

const InteractionFooterOrderRefInput = ({
  orderRef,
  onOrderRefChange
}: InteractionFooterOrderRefInputProps) => (
  <div className="sm:col-span-1 lg:col-span-3">
    <label
      htmlFor="interaction-order-ref"
      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
    >
      N° devis / cmd
    </label>
    <div className="relative">
      <Hash
        size={12}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <Input
        id="interaction-order-ref"
        type="text"
        value={orderRef}
        onChange={(event) => onOrderRefChange(event.target.value)}
        placeholder="Reference dossier"
        className="h-9 bg-white pl-8 font-mono text-xs"
        name="interaction-order-ref"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  </div>
);

export default InteractionFooterOrderRefInput;
