import { Hash } from 'lucide-react';

type InteractionFooterOrderRefInputProps = {
  orderRef: string;
  onOrderRefChange: (value: string) => void;
};

const InteractionFooterOrderRefInput = ({
  orderRef,
  onOrderRefChange
}: InteractionFooterOrderRefInputProps) => (
  <div className="col-span-3">
    <label htmlFor="interaction-order-ref" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
      N° Devis / Cmd
    </label>
    <div className="relative">
      <input
        id="interaction-order-ref"
        type="text"
        value={orderRef}
        onChange={(event) => onOrderRefChange(event.target.value)}
        placeholder="..."
        className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md py-1.5 pl-7 px-2 focus:border-cir-red focus:outline-none"
        name="interaction-order-ref"
        autoComplete="off"
        spellCheck={false}
      />
      <Hash size={12} className="absolute left-2 top-2 text-slate-400" />
    </div>
  </div>
);

export default InteractionFooterOrderRefInput;
