# Keeping agent guidance current

AGENTS.md files are maintained by the agent doing the work. This is an automatic step in its workflow, not a background job or a guarantee of unattended synchronization.

Before completing any feature or fix:
1. Compare changed files with the relevant AGENTS instructions. Update only instructions made stale by the change.
2. Change root AGENTS for architecture, project constraints, shared commands, or deployment boundaries; change scoped AGENTS for module contracts.
3. Update SETUP.md for setup, permissions, recovery, hosting, or deployment procedures. Update BLOG-SPEC.md only for actual product decisions or acceptance criteria; label proposals and unverified behavior.
4. Derive commands/versions/paths from package.json and configuration. Reference those sources instead of copying frequently changing values into multiple documents.
5. Resolve contradictions in current guidance. Preserve historical spec notes when useful, but mark superseded decisions clearly. Do not invent authorization or convert tentative ideas into requirements.
6. Review the documentation diff alongside the code. State which guidance changed, or that no guidance update was needed.

Keep durable instructions, not transcripts: no secrets, personal account data, test logs, completion claims, or repeated timestamps in AGENTS files. Avoid speculative restrictions and exhaustive command catalogs.

For future CI: a changed-path check may flag architecture/security/deployment changes for documentation review. It should request a human/agent review, not rewrite instructions from diffs blindly. Do not add a scheduled automation solely to keep these files updated.
