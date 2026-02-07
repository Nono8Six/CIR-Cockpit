import { useEffect, useRef } from 'react';

type UseInteractionShortcutsParams = {
  onSubmitRequest: () => void;
  onFocusSearch: () => void;
  onFocusSubject: () => void;
};

export const useInteractionShortcuts = ({
  onSubmitRequest,
  onFocusSearch,
  onFocusSubject
}: UseInteractionShortcutsParams) => {
  const handlersRef = useRef({ onSubmitRequest, onFocusSearch, onFocusSubject });
  handlersRef.current = { onSubmitRequest, onFocusSearch, onFocusSubject };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        handlersRef.current.onSubmitRequest();
      }
      if (event.key === 'F1') {
        event.preventDefault();
        handlersRef.current.onFocusSearch();
      }
      if (event.key === 'F2') {
        event.preventDefault();
        handlersRef.current.onFocusSubject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
