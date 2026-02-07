import { useEffect, type RefObject } from 'react';

export const useProfileMenuDismiss = (
  profileMenuRef: RefObject<HTMLDivElement | null>,
  isProfileMenuOpen: boolean,
  setIsProfileMenuOpen: (open: boolean) => void
) => {
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      const target = event.target;
      if (target instanceof Node && profileMenuRef.current.contains(target)) return;
      setIsProfileMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen, profileMenuRef, setIsProfileMenuOpen]);
};
