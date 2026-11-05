import Link from "next/link";
import DecodeText from "@/components/DecodeText";
import TypeOut from "@/components/TypeOut";
export default function NotFound() {
  return (
    <section className="directory-page" data-not-found>
      <p className="eyebrow">SYSTEM MESSAGE / 404</p>
      <h1><DecodeText text="RECORD NOT FOUND" /></h1>
      <p>This directory or file does not exist in the public index.</p>
      <Link className="terminal-button" href="/">
        RETURN TO SYSTEM INDEX
      </Link>
      <TypeOut />
    </section>
  );
}
