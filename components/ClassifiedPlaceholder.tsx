"use client";

import type { Classification } from '@/lib/content/types';
import { PatronLocked } from '@/components/PatreonAccess';

export default function ClassifiedPlaceholder({ classification = 'redacted', variant = 'card', label }: {
  classification?: Classification;
  variant?: 'inline' | 'card' | 'media';
  label?: string;
}) {
  const status = classification === 'patron' ? 'PATRON / LOCKED' : 'REDACTED';
  const className = `classified-placeholder classified-placeholder--${variant}${classification === 'patron' ? ' classified-placeholder--patron' : ''}`;
  const content = <>
    <span className="classified-placeholder-label" aria-hidden="true">{status}{label ? ` / ${label}` : ''}</span>
    {classification === 'patron' && variant === 'media' ? <span className="classified-image" aria-hidden="true"><b className="classified-x">X</b><strong>CLASSIFIED</strong><small>ACCESS DENIED</small></span> : <span className="classified-placeholder-bars" aria-hidden="true"><i /><i /><i /></span>}
  </>;
  if (classification === 'patron') return <PatronLocked className={className}>{content}</PatronLocked>;
  return <span className={className} role="img" aria-label={`${status} CONTENT${label ? `: ${label}` : ''}`}>{content}</span>;
}
