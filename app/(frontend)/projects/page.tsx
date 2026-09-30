import { Directory, DirectoryLink } from "@/components/Directory";
import ProjectIndex from "@/components/ProjectIndex";
import RouteApplication from '@/components/RouteApplication';
import { getProjects } from '@/lib/content/queries';
export const metadata = { title: "Project database" };
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ directory?: string }> }) {
  const { directory } = await searchParams;
  const section = ['characters', 'factions', 'equipment'].includes(directory || '') ? directory : undefined;
  const title = section === 'characters' ? 'PERSONNEL' : section === 'factions' ? 'FACTION INTEL' : section === 'equipment' ? 'ARMORY' : 'PROJECT DATABASE';
  return <RouteApplication key={title} id="project-database" title={title}>
    <Directory path="SYS:/PROJECTS/" title={title}>
      <p className="lede">Select a project record.</p>
      {section ? <div className="directory-list">{(await getProjects()).map(project => <DirectoryLink key={project.slug} classification={project.classification} safeLabel={project.safeLabel} href={`/projects/${project.slug}/${section}`} name={project.title} meta={title} />)}</div> : <ProjectIndex />}
    </Directory>
  </RouteApplication>;
}
