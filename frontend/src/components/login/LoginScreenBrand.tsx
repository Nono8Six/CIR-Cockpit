import { ShieldCheck } from 'lucide-react';

const LoginScreenBrand = () => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-cir-red rounded-md flex items-center justify-center text-white shadow-sm">
      <ShieldCheck aria-hidden className="h-5 w-5" />
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CIR</p>
      <h1 className="font-bold text-slate-900 text-xl leading-none tracking-tight">COCKPIT</h1>
      <span className="text-xs text-slate-600 font-medium uppercase tracking-[0.15em]">
        Connexion
      </span>
    </div>
  </div>
);

export default LoginScreenBrand;
