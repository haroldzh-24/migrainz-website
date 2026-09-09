import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Writing } from '@/lib/content/types';

export default function ContentWriting({ data }: { data?: Writing | null }) {
  return data ? <div className="content-writing"><RichText data={data} /></div> : null;
}
