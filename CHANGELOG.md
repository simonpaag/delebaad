# Changelog

## [1.0.1] - 2026-04-28
### Added
- **Kanban Board Enhancements:** Users can now click on a ticket to open an Edit Modal (modifying title and description). Also added a "Copy" button to easily extract ticket contents for AI prompts. Removed "In production" and "Testing" columns for simplicity.
- **Boat Management Upgrades:** Added the ability to edit existing boats (Name, Location, Description) via an Edit Modal.
- **Boat Images:** Added a new public Supabase Storage bucket (`boat_images`) and a corresponding `image_url` column to the `boats` table. Users can now upload images that appear beautifully on boat cards.
- **User Overview Email:** Added the user's `email` column to the `public.profiles` table and updated the `handle_new_user` trigger to sync it from `auth.users`. Emails are now visible in the Admin Dashboard User Tab.
- **Progressive Web App (PWA) Support:** Transformed the application into a fully installable PWA using `vite-plugin-pwa`.
  - Added 192x192 and 512x512 app icons.
  - Implemented an "Installer App" prompt in both Admin and User dashboards.
  - Built custom instructions for iOS/Safari users to add the app to their home screen via the Share menu.

### Changed
- Refactored `AdminDashboard.jsx` and `UserDashboard.jsx` to accommodate new features.
- Updated `vite.config.js` to include the PWA plugin.
- Modified `supabase_schema.sql` to include new columns and Storage buckets.
