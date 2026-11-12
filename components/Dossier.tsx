import Link from "next/link";
import type { ReactNode } from "react";
import DecodeText from "@/components/DecodeText";

// Board 3 (batch 25): one dossier template for equipment items and characters, inside the record window. An inset light
// panel: the media on the left (about 60%: the looping schematic or the portrait), the record on the right (file name and
// code small, the readable name large, a table of fields, the actions), and a full-width row of linked cards below
// (ISSUED TO / EQUIPMENT CARRIED). Narrow windows (phones) stack the columns. Only fields the CMS already has are shown.

export type DossierField = { label: string; value: ReactNode };

export function Dossier({ label, media, file, code, name, fieldsCaption, fields, actions, children, below }: {
  label: string;
  media: ReactNode;
  file: string;
  code?: string;
  name: string;
  fieldsCaption: string;
  fields: DossierField[];
  actions?: ReactNode;
  children?: ReactNode;
  below?: ReactNode;
}) {
  return <article className="dossier" aria-label={label}>
    <div className="dossier-media">{media}</div>
    <div className="dossier-record">
      <p className="dossier-file">{file}{code ? ` · ${code}` : ""}</p>
      <h1 className="dossier-name"><DecodeText text={name} /></h1>
      {fields.length > 0 && <table className="dossier-fields">
        <caption>{fieldsCaption}</caption>
        <tbody>{fields.map((field, index) => <tr key={index}><th scope="row">{field.label}</th><td>{field.value}</td></tr>)}</tbody>
      </table>}
      {actions && <div className="dossier-actions">{actions}</div>}
      {children}
    </div>
    {below}
  </article>;
}

export type DossierCardEntry = { key: string; href: string; name: string; line?: string; note?: string; image?: string; schematic?: boolean };

/** The full-width row of linked record cards under a dossier (board 3: 44 px picture, bold name, a mono line). */
export function DossierCards({ title, label, cards }: { title: string; label: string; cards: DossierCardEntry[] }) {
  if (!cards.length) return null;
  return <section className="dossier-below" aria-label={label}>
    <h2>{title}</h2>
    <ul className="dossier-cards">{cards.map(card => <li key={card.key}>
      <Link className="dossier-card" href={card.href}>
        {card.image
          ? <img src={card.image} alt="" width={44} height={44} loading="lazy" data-schematic={card.schematic || undefined} />
          : <span className="dossier-card-blank" aria-hidden="true" />}
        <span className="dossier-card-copy">
          <strong>{card.name}</strong>
          {card.line && <span className="dossier-card-line">{card.line}</span>}
          {card.note && <span className="dossier-card-note">{card.note}</span>}
        </span>
      </Link>
    </li>)}</ul>
  </section>;
}
