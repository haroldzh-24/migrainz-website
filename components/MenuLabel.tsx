// Main-menu label: file name small above the readable name. The readable name comes first in the markup so screen
// readers say it first ("Project database 01 / projects.db"); CSS order puts the file name on top. The space keeps
// the two parts apart in the accessible name.
export default function MenuLabel({ number, file, name }: { number: string; file: string; name: string }) {
  return <><strong className="menu-name">{name}</strong>{" "}<span className="menu-file">{number} / {file}</span></>;
}
