import Link from "next/link";
import { Directory } from "@/components/Directory";
import { site } from "@/data/site";

export const metadata = { title: "INFORMATION" };

export default function Page() {
  return (
    <Directory path="SYS:/ABOUT/" title="INFORMATION">
      <section id="about" className="about section-block">
        <div className="section-head compact">
          <div>
            <span>05</span>
            <h2>INFORMATION</h2>
          </div>
        </div>
        <div className="about-copy">
          <p>
            Studio Migrainz is a place to wander through artwork, illustrated
            worlds and things still taking shape. Browse a directory, read a
            chapter, or follow the studio&apos;s production notes.
          </p>
          <div className="contact-lines">
            <Link href="/patreon">SUPPORT // PATREON ACCESS PREVIEW</Link>
            <Link href="/">RETURN // SYSTEM INDEX</Link>
          </div>
        </div>
      </section>
      <section id="shop" className="section-block">
        <div className="section-head">
          <div>
            <span>03</span>
            <h2>REQUISITIONS / SHOP</h2>
          </div>
          <p>EXTERNAL STOREFRONT</p>
        </div>
        <p className="lede">
          Prints, books and studio objects live in the separate Studio Migrainz
          store.
        </p>
        <a className="terminal-button" href={site.shopUrl}>
          ENTER STORE →
        </a>
        {site.shopIsPlaceholder && (
          <p className="eyebrow">
            PLACEHOLDER DESTINATION / STORE ADDRESS PENDING
          </p>
        )}
      </section>
    </Directory>
  );
}
