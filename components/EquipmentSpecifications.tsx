export type Specification = { label: string; value: string };
export default function EquipmentSpecifications({ rows }: { rows: Specification[] }) {
  if (!rows.length) return null;
  return <dl className="equipment-specifications">{rows.map((row, index) => <div key={index}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
}
