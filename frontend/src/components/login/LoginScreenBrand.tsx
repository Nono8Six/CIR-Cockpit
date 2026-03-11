import { ShieldCheck } from 'lucide-react';

const LoginScreenBrand = () => (
  <div className="flex items-center gap-3.5">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-[0_10px_24px_-14px_rgba(200,30,30,0.9)]">
      <ShieldCheck aria-hidden className="h-5 w-5" strokeWidth={2} />
    </div>
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">CIR</p>
      <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-slate-900">COCKPIT</h1>
      <span className="text-sm font-semibold text-slate-600">Connexion sécurisée</span>
    </div>
  </div>
);

export default LoginScreenBrand;
