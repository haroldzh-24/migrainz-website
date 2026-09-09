import { Directory } from "@/components/Directory";
import ProjectIndex from "@/components/ProjectIndex";
export const metadata = { title: "Project database" };
export default function ProjectsPage() {
  return (
    <Directory path="SYS:/PROJECTS/" title="PROJECT DATABASE">
      <p className="lede">Select a record to explore its directory.</p>
      <ProjectIndex />
    </Directory>
  );
}
