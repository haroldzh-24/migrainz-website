import { Directory, DirectoryLink } from "@/components/Directory";
export const metadata = { title: "Patreon access" };
export default function PatreonPage() {
  return (
    <Directory path="SYS:/PATREON/" title="PATREON ACCESS">
      <p className="status-chip">ACCOUNT CONNECTION / FUTURE FEATURE</p>
      <p className="lede">
        Support the studio and, in a future release, connect your Patreon
        membership to explore additional artwork, development files and comic
        pages.
      </p>
      <p>
        This is an interface preview. Joining and connecting an account are not
        available here yet. All files currently on this site are public samples.
      </p>
      <button className="terminal-button" disabled>
        CONNECT PATREON — COMING LATER
      </button>
      <DirectoryLink
        href="/projects/blushland"
        name="EXPLORE PUBLIC FILES"
        meta="BLUSHLAND/"
      />
    </Directory>
  );
}
