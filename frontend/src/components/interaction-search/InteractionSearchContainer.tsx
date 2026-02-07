import type { ReactNode } from 'react';

type InteractionSearchContainerProps = { onOpen: () => void; onClose: () => void; children: ReactNode };

const InteractionSearchContainer = ({ onOpen, onClose, children }: InteractionSearchContainerProps) => (
  <div
    data-search-unique
    className="relative bg-white border border-slate-200 rounded-lg shadow-sm shrink-0 transition focus-within:border-cir-red/40 focus-within:ring-2 focus-within:ring-cir-red/20"
    onFocusCapture={onOpen}
    onBlurCapture={(event) => {
      const nextFocusedElement = event.relatedTarget;
      if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) return;
      onClose();
    }}
  >
    {children}
  </div>
);

export default InteractionSearchContainer;
