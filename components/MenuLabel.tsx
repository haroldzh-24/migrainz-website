// Main-menu label: file name small, readable name large. The space keeps the two parts apart in the accessible name.
export default function MenuLabel({ number, file, name }: { number: string; file: string; name: string }) {
  return <><span className="menu-file">{number} / {file}</span>{" "}<strong className="menu-name">{name}</strong></>;
}
