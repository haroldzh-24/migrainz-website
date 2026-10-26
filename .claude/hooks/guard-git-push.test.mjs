// node .claude/hooks/guard-git-push.test.mjs  (pure string checks; nothing is pushed or run)
import assert from 'node:assert/strict';
import { judge } from './guard-git-push.mjs';

const P = 'git ' + 'push';
const cases = [
  [`${P} origin main`, 'ask'],
  [`  ${P} origin main  `, 'ask'],
  [`git status && ${P} origin main`, 'ask'],
  [`${P} origin main --force`, 'deny'],
  [`${P} --force origin main`, 'deny'],
  [`${P} -f origin main`, 'deny'],
  [`${P} --force-with-lease origin main`, 'deny'],
  [`${P} origin feature/x`, 'deny'],
  [`${P} origin chore/workflow-setup`, 'deny'],
  [`${P}`, 'deny'],
  [`${P} origin :main`, 'deny'],
  [`${P} origin --delete main`, 'deny'],
  [`${P} origin HEAD:main`, 'deny'],
  [`${P} origin +main`, 'deny'],
  [`${P} --all`, 'deny'],
  [`${P} -u origin main`, 'deny'],
  [`git -C . push origin main`, 'deny'],
  [`git commit -m x && ${P} origin other`, 'deny'],
  [`${P} origin main; ${P} --force`, 'deny'],
  [`${P} origin main | cat`, 'ask'],
  [`bash -c '${P} origin other'`, 'deny'],
  [`GIT_TRACE=1 ${P} origin main`, 'deny'],
  [`git log --grep=push`, undefined], // "push" is not a separate word here, so it is not a push
  [`git status`, undefined],
  [`npm run build`, undefined],
  [`node scripts/serve-fixture.mjs`, undefined],
  [`echo pushing`, undefined],
];
let failed = 0;
for (const [command, expected] of cases) {
  const actual = judge(command);
  if (actual !== expected) { failed++; console.log(`FAIL expected ${expected} got ${actual}: ${command}`); }
}
assert.equal(failed, 0);
console.log(`PASS ${cases.length} guard cases`);
