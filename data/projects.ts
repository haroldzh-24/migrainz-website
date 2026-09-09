export type ComicPage = { src: string; alt: string };
export type Chapter = {
  slug: string;
  title: string;
  description: string;
  pages: ComicPage[];
};
export type Character = {
  slug: string;
  name: string;
  role: string;
  description: string;
  chapterSlugs: string[];
};
export type Project = {
  slug: string;
  id: string;
  title: string;
  category: string;
  status: string;
  art: string;
  summary: string;
  description: string;
  updated: string;
  phases: { label: string; percent: number }[];
  milestones: { title: string; status: string }[];
  notes: { date: string; text: string }[];
  characters: Character[];
  chapters: Chapter[];
};

// Public demonstration content only. Never add restricted files or credentials here.
export const projects: Project[] = [
  {
    slug: "blushland",
    id: "BL-001",
    title: "BLUSHLAND",
    category: "GRAPHIC NOVEL",
    status: "ACTIVE / PRODUCTION",
    art: "art-a",
    updated: "2026-09-03",
    summary: "WORLD / CHARACTERS / PRODUCTION ARCHIVE",
    description:
      "An illustrated world in progress. Explore character records, production notes and a sample chapter. Narrative and artwork in this directory are placeholders, not final BLUSHLAND canon.",
    phases: [
      { label: "SCRIPT", percent: 100 },
      { label: "DESIGN", percent: 82 },
      { label: "CHAPTER 01", percent: 100 },
      { label: "CHAPTER 02", percent: 73 },
      { label: "CHAPTER 03", percent: 24 },
    ],
    milestones: [
      { title: "Script draft", status: "COMPLETE" },
      { title: "Chapter 02 inks", status: "IN PROGRESS" },
      { title: "Chapter 03 production", status: "IN PROGRESS" },
    ],
    notes: [
      { date: "2026-09-03", text: "DEVELOPMENT ART +4" },
      { date: "2026-08-31", text: "CHAPTER 02 INKS UPDATED" },
      { date: "2026-08-27", text: "CHARACTER SHEETS REVISED" },
    ],
    characters: [
      {
        slug: "the-observer",
        name: "THE OBSERVER",
        role: "EXAMPLE CHARACTER / FIELD RECORDER",
        description:
          "A traveler records the shapes and signals of an unfamiliar landscape. This sample record demonstrates how a character connects to the wider project and its comic chapters.",
        chapterSlugs: ["chapter-01"],
      },
    ],
    chapters: [
      {
        slug: "chapter-01",
        title: "CHAPTER 01 / FIRST SIGNAL",
        description:
          "Three public sample pages. Placeholder narrative and artwork for testing the reading path.",
        pages: [
          {
            src: "/comics/blushland/01.svg",
            alt: "Sample page 1: The Observer stands beneath a rectangular gateway. Caption: At the edge of the field, a signal.",
          },
          {
            src: "/comics/blushland/02.svg",
            alt: "Sample page 2: The Observer approaches a circular beacon. Caption: Someone had left the terminal running.",
          },
          {
            src: "/comics/blushland/03.svg",
            alt: "Sample page 3: A path continues beyond the beacon. Caption: The record begins here. End of sample chapter.",
          },
        ],
      },
    ],
  },
  {
    slug: "stalker",
    id: "ST-024",
    title: "STALKER",
    category: "CONCEPT ART",
    status: "ARCHIVED",
    art: "art-b",
    summary: "CAMPAIGN ART / CHARACTER DEVELOPMENT",
    updated: "2026-09-03",
    description:
      "A reserved directory for campaign artwork and character development. Public files have not been added yet.",
    phases: [],
    milestones: [],
    notes: [],
    characters: [],
    chapters: [],
  },
  {
    slug: "misc-works",
    id: "MX-011",
    title: "MISC. WORKS",
    category: "STUDIO OUTPUT",
    status: "ONGOING",
    art: "art-c",
    summary: "PRINT / DESIGN / CLIENT / EXPERIMENTS",
    updated: "2026-09-03",
    description:
      "A reserved directory for prints, design work and studio experiments. Public files have not been added yet.",
    phases: [],
    milestones: [],
    notes: [],
    characters: [],
    chapters: [],
  },
];

export const getProject = (slug: string) =>
  projects.find((project) => project.slug === slug);
export const projectHref = (project: Project) => `/projects/${project.slug}`;
export const chapterHref = (project: Project, chapter: Chapter) =>
  `/comics/${project.slug}/${chapter.slug}`;
