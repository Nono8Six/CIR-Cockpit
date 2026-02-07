import { Check, X } from 'lucide-react';

type ChangePasswordRule = {
  id: string;
  label: string;
  passed: boolean;
};

type ChangePasswordRulesProps = {
  rules: ChangePasswordRule[];
};

const ChangePasswordRules = ({ rules }: ChangePasswordRulesProps) => (
  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
    {rules.map((rule) => (
      <div
        key={rule.id}
        className={`flex items-center gap-2 text-xs ${
          rule.passed ? 'text-emerald-600' : 'text-slate-500'
        }`}
      >
        {rule.passed ? (
          <Check size={14} className="text-emerald-500" />
        ) : (
          <X size={14} className="text-slate-400" />
        )}
        <span>{rule.label}</span>
      </div>
    ))}
  </div>
);

export default ChangePasswordRules;
