import { Euro } from 'lucide-react';

import { Input } from '../../ui/inputs/basic/Input';

type InteractionFooterAmountInputProps = {
  amount: string;
  onAmountChange: (value: string) => void;
};

const InteractionFooterAmountInput = ({
  amount,
  onAmountChange
}: InteractionFooterAmountInputProps) => (
  <div className="sm:col-span-1 lg:col-span-2">
    <label
      htmlFor="interaction-amount"
      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    >
      Montant
    </label>
    <div className="relative">
      <Euro
        size={12}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80"
        aria-hidden="true"
      />
      <Input
        id="interaction-amount"
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
        placeholder="0"
        className="h-9 bg-card pl-8 font-mono text-xs tabular-nums"
        name="interaction-amount"
        autoComplete="off"
      />
    </div>
  </div>
);

export default InteractionFooterAmountInput;
