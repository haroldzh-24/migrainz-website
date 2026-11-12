import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import LoreLink from '@/components/LoreLink';
import type { LoreEntry } from '@/lib/content/lore';
import type { Writing } from '@/lib/content/types';

// Lore links (batch 24): createLoreLinker().writing() wraps record names in `loreLink` nodes (never inside a link,
// heading or code); this converter renders them as preview links around the original, still formatted, text node.
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  loreLink: ({ node, nodesToJSX }: { node: { entry: LoreEntry; children: never[] }; nodesToJSX: (args: { nodes: never[] }) => React.ReactNode[] }) =>
    <LoreLink entry={node.entry}>{nodesToJSX({ nodes: node.children })}</LoreLink>,
});

export default function ContentWriting({ data }: { data?: Writing | null }) {
  return data ? <div className="content-writing"><RichText data={data} converters={converters} /></div> : null;
}
