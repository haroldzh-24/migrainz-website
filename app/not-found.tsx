import Link from "next/link";
export default function NotFound() {
  return (
    <section className="directory-page">
      <p className="eyebrow">SYSTEM MESSAGE / 404</p>
      <h1>RECORD NOT FOUND</h1>
      <p>This directory or file does not exist in the public index.</p>
      <Link className="terminal-button" href="/">
        RETURN TO SYSTEM INDEX
      </Link>
    </section>
  );
}
