// Lokala Lucide-noder; ingen extern begäran görs när en ikon visas.
import { createElement } from 'react';
import { findIconStudyIcon } from './icon-study-catalog.js';

export function IconStudyGlyph({
  iconId,
  className,
}: {
  iconId: string | null | undefined;
  className?: string;
}) {
  const icon = findIconStudyIcon(iconId);
  if (!icon) return null;
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon-id={icon.id}
    >
      {icon.nodes.map(([tag, attributes]) =>
        createElement(tag, { ...attributes, key: `${tag}:${JSON.stringify(attributes)}` }),
      )}
    </svg>
  );
}
