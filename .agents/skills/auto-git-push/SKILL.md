---
name: auto-git-push
description: >-
  Automatically commits and pushes changes to the remote GitHub repository whenever any modification, bugfix, or feature is completed.
---

# Auto Git Push & Remote Sync Skill

## Activation Triggers
Trigger this skill whenever:
- A code change, bugfix, or new feature implementation has completed its verification.
- Files have been added, modified, or removed in the workspace.
- The user requests to sync, commit, or push changes.

## Step-by-Step Procedure
1. **Verify Correctness**: Run syntax compilation or relevant tests to make sure there are no errors.
2. **Check Git Status**: Inspect `git status` to verify changed files.
3. **Stage Changes**: Stage modified/created project files (`git add <files>`).
4. **Commit**: Create a commit with Conventional Commits format (`git commit -m "<type>(<scope>): <message>"`).
5. **Push to Remote**: Run `git push origin main` to push immediately to GitHub.
6. **Confirm Status**: Verify `git status` indicates `up to date with origin/main`.
