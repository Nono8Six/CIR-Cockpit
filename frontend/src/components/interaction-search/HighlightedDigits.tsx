type HighlightedDigitsProps = {
  formatted: string;
  query: string;
};

const HighlightedDigits = ({ formatted, query }: HighlightedDigitsProps) => {
  const queryDigits = query.replace(/\D/g, '');
  if (!queryDigits) return formatted;
  const digits = formatted.replace(/\D/g, '');
  const matchIndex = digits.indexOf(queryDigits);
  if (matchIndex === -1) return formatted;

  let digitIndex = 0;
  return formatted.split('').map((char, index) => {
    if (!/\d/.test(char)) {
      return <span key={`c-${index}`}>{char}</span>;
    }
    const isMatch = digitIndex >= matchIndex && digitIndex < matchIndex + queryDigits.length;
    digitIndex += 1;
    if (!isMatch) {
      return <span key={`d-${index}`}>{char}</span>;
    }
    return (
      <span key={`d-${index}`} className="bg-warning/20 text-foreground px-0.5 rounded-sm">
        {char}
      </span>
    );
  });
};

export default HighlightedDigits;
