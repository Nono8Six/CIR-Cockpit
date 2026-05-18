import type { ReactNode } from 'react';

type InteractionSearchContainerProps = { onOpen: () => void; onClose: () => void; children: ReactNode };

const InteractionSearchContainer = ({ onOpen, onClose, children }: InteractionSearchContainerProps) => (
  <div
    data-search-unique
    className="relative min-w-0"
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
