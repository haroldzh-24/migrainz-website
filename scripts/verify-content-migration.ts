import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getPayload } from 'payload';
import config from '../payload.config';
import { projects } from '../data/projects';

const digest = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main() {
  const cms = await getPayload({ config });
  try {
    for (const project of projects) {
      const result = await cms.find({ collection: 'projects', overrideAccess: true, depth: 0, where: { legacyKey: { equals: `project:${project.slug}` } } });
      assert.equal(result.totalDocs, 1);
      const record = result.docs[0];
      assert.equal(record.title, project.title); assert.equal(record.projectCode, project.id);
      assert.equal(record.description, project.description); assert.equal(record.summary, project.summary);
      for (const chapter of project.chapters) {
        const imported = await cms.find({ collection: 'chapters', overrideAccess: true, depth: 1, where: { legacyKey: { equals: `chapter:${project.slug}/${chapter.slug}` } } });
        assert.equal(imported.totalDocs, 1);
        assert.equal(imported.docs[0].pages.length, chapter.pages.length);
        for (const [index, page] of chapter.pages.entries()) {
          const media = imported.docs[0].pages[index].media;
          assert.ok(typeof media === 'object');
          assert.equal(media.alt, page.alt);
          assert.equal(digest(path.join(process.env.CMS_MEDIA_DIR!, media.filename!)), digest(path.join('public', page.src)));
        }
      }
      const characters = await cms.find({ collection: 'characters', overrideAccess: true, depth: 0, where: { project: { equals: record.id } } });
      assert.equal(characters.totalDocs, project.characters.length);
      const updates = await cms.find({ collection: 'project-updates', overrideAccess: true, depth: 0, where: { project: { equals: record.id } } });
      assert.equal(updates.totalDocs, project.notes.length);
      const tracker = await cms.find({ collection: 'tracker-items', overrideAccess: true, depth: 0, where: { project: { equals: record.id } } });
      assert.equal(tracker.totalDocs, project.phases.length + project.milestones.length);
    }
    console.log('PASS: legacy projects, descriptions, chapter ordering, alt text, file checksums and related-record counts.');
  } finally { await cms.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
