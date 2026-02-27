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
  <div className="bg-surface-1 rounded-lg p-3 space-y-1.5">
    {rules.map((rule) => (
      <div
        key={rule.id}
        className={`flex items-center gap-2 text-xs ${
          rule.passed ? 'text-success' : 'text-muted-foreground'
        }`}
      >
        {rule.passed ? (
          <Check size={14} className="text-success/90" />
        ) : (
          <X size={14} className="text-muted-foreground/80" />
        )}
        <span>{rule.label}</span>
      </div>
    ))}
  </div>
);

export default ChangePasswordRules;
