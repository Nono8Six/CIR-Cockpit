type HighlightedTextProps = {
  value: string;
  query: string;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HighlightedText = ({ value, query }: HighlightedTextProps) => {
  const trimmed = query.trim();
  if (!trimmed) return value;
  const regex = new RegExp(`(${escapeRegExp(trimmed)})`, 'ig');
  const parts = value.split(regex);
  return parts.map((part, index) => {
    if (part.toLowerCase() !== trimmed.toLowerCase()) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }
    return (
      <span key={`${part}-${index}`} className="bg-amber-100 text-slate-900 px-0.5 rounded-sm">
        {part}
      </span>
    );
  });
};

export default HighlightedText;
