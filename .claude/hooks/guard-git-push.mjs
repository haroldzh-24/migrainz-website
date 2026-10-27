// PreToolUse guard for Bash and PowerShell. Reads the hook JSON from stdin.
//   `git push origin main` (exactly, no flags)  -> ask Harold every time
//   any other git push (force, other branch, delete, bare `git push`, refspecs, chained forms) -> deny
//   everything else -> no opinion (exit 0, no output)
// Rule precedence in Claude Code is deny > ask > allow, so settings.json must not contain a deny rule that matches
// `git push origin main`; this script supplies the hard denies for every other push instead.
// Remove this guard and the matching ask rules only once Preview isolation is done (docs/preview-isolation.md).
export function judge(command) {
  // Look at every statement of a compound command; any statement mentioning git and push is judged on its own.
  const statements = String(command ?? '').split(/&&|\|\||[;|\n]/).map(part => part.trim()).filter(Boolean);
  const verdicts = [];
  for (const statement of statements) {
    const words = statement.replace(/["'`]/g, ' ').split(/\s+/).filter(Boolean);
    if (!words.includes('push') || !/\bgit(\.exe)?\b/i.test(statement)) continue;
    const exact = words.length === 4 && /^git(\.exe)?$/i.test(words[0]) && words[1] === 'push' && words[2] === 'origin' && words[3] === 'main';
    verdicts.push(exact ? 'ask' : 'deny');
  }
  return verdicts.includes('deny') ? 'deny' : verdicts.includes('ask') ? 'ask' : undefined;
}

const reasons = {
  deny: 'Blocked by .claude/hooks/guard-git-push.mjs: only `git push origin main` (no flags, no force) can ever be requested, and Harold approves it each time. Force pushes, other branches, deletes and refspecs stay denied until Preview isolation is done.',
  ask: 'git push origin main deploys production (AGENTS.md). Approve only if Harold asked for this push in the current conversation.',
};

// Run as the hook (not when imported by the test file).
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/guard-git-push.mjs')) {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  let command = '';
  try { command = String(JSON.parse(input)?.tool_input?.command ?? ''); } catch { command = ''; }
  const decision = judge(command);
  if (decision) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reasons[decision] } }));
  process.exit(0);
}
