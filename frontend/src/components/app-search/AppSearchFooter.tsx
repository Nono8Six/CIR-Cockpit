import type { ReactNode } from 'react';

type AppSearchFooterProps = {
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

const AppSearchFooter = ({ footerLeft, footerRight }: AppSearchFooterProps) => (
  <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-500">
    <span className="truncate">
      {footerLeft ?? <><strong>↑↓</strong> naviguer • <strong>Esc</strong> fermer</>}
    </span>
    <span className="shrink-0">{footerRight ?? <><strong>↵</strong> sélectionner</>}</span>
  </div>
);

export default AppSearchFooter;
