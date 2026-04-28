# Deploy & End Session Workflow

When the user asks to "Run the Deploy and End Session Workflow", you as the AI Assistant MUST follow these exact steps in order:

## 1. Document Architecture & Changes
- Review the major changes made during the current session.
- Update `CHANGELOG.md` (create it if it doesn't exist) with a new entry detailing:
  - The date and version.
  - High-level features implemented (e.g., new DB tables, UI components).
  - Important files touched or created.
- If there are major architectural shifts (e.g., adding a new backend pattern, auth flow, or PWA), update or create `ARCHITECTURE.md` with these details so future agents have context.

## 2. Prepare & Build
- Run any necessary build steps (e.g., `npm run build` or `npm run typecheck`) to ensure there are no compilation errors before deployment.

## 3. Version Bump (Optional)
- Ask the user if they want to bump the version number (patch, minor, or major). If they say yes, update `package.json` and any hardcoded versions in the UI.

## 4. Deploy (Push to Git)
- Stage all changes: `git add .`
- Commit with a summary of the session's work: `git commit -m "chore: deploy and end session updates"`
- Push to the remote repository: `git push origin main` (This typically triggers the live deployment).

## 5. Final Report
- Reply to the user with a final summary message containing:
  - **Status:** Confirmation that the code was pushed and is deploying.
  - **Version:** The current version of the platform.
  - **Link:** The live link to the platform (e.g., `https://delebaad.web.app` or similar, depending on the project).
  - **Summary:** A brief 2-sentence summary of what was accomplished and documented.
- Conclude the session with a friendly sign-off!
