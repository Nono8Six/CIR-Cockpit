import { Fragment } from 'react';

interface AssistantMessageContentProps {
  content: string;
}

const BULLET_PATTERN = /^\s*[-*]\s+(.+)$/;
const NUMBERED_PATTERN = /^\s*(\d+)[.)]\s+(.+)$/;
const HEADING_PATTERN = /^\s*#{1,3}\s+(.+)$/;

export const AssistantMessageContent = ({ content }: AssistantMessageContentProps) => (
  <div className="space-y-1.5 text-[13px] leading-relaxed text-foreground">
    {content.split('\n').map((line, index) => {
      const bullet = line.match(BULLET_PATTERN);
      const numbered = line.match(NUMBERED_PATTERN);
      const heading = line.match(HEADING_PATTERN);

      if (!line.trim()) {
        return <div key={`space-${index}`} className="h-1" aria-hidden="true" />;
      }
      if (heading) {
        return <p key={`heading-${index}`} className="pt-1 font-semibold">{heading[1]}</p>;
      }
      if (bullet) {
        return (
          <div key={`bullet-${index}`} className="grid grid-cols-[12px_1fr] gap-1.5">
            <span className="text-muted-foreground" aria-hidden="true">•</span>
            <span>{bullet[1]}</span>
          </div>
        );
      }
      if (numbered) {
        return (
          <div key={`number-${index}`} className="grid grid-cols-[20px_1fr] gap-1.5">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{numbered[1]}.</span>
            <span>{numbered[2]}</span>
          </div>
        );
      }
      return <Fragment key={`line-${index}`}><p>{line}</p></Fragment>;
    })}
  </div>
);
