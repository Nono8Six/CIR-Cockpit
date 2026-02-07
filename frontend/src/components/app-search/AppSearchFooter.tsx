import type { ReactNode } from 'react';

type AppSearchFooterProps = {
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

const AppSearchFooter = ({ footerLeft, footerRight }: AppSearchFooterProps) => (
  <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
    <span>{footerLeft ?? <><strong>↑↓</strong> pour naviguer</>}</span>
    <span>{footerRight ?? <><strong>↵</strong> pour sélectionner</>}</span>
  </div>
);

export default AppSearchFooter;
