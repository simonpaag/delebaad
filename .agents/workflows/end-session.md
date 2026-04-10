---
description: end session
---
# End Session Workflow

This workflow automatically wraps up the workspace, ensures code quality, commits changes, and syncs everything with GitHub.

// turbo-all

1. Run the linter to ensure there are no syntax errors or severe warnings. Use the command `npm run lint`.
2. Run a test build to ensure that the application builds correctly for production. Use the command `npm run build`.
3. If both the lint and build succeed without fatal errors, stage all current files in Git using the command `git add .`
4. Formulate a short, descriptive commit message summarizing the changes made during the session based on what you observe that has changed, and commit them using the command `git commit -m "[your generated message]"`.
5. Push the committed changes to the standard remote repository using the command `git push origin main`.
6. Terminate the session cleanly by presenting a short markdown summary of what was wrapped up and pushed.
