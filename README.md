# Parcelis Website

Exported Webstudio website with a Cloudflare Worker for password protection and contact-form submissions.

## Project layout

- public/: exported HTML, JavaScript, CSS, and other website assets.
- public/assets/backgrounds/, logo/, and parcy/: asset folders mirrored from Webstudio.
- public/assets/images/: images that are unfiled in Webstudio.
- asset-folders.json: exported filenames mapped to their organized paths.
- scripts/organize-assets.mjs: moves assets and updates generated references.
- worker.mjs: password authentication, managed form routing, and asset serving.
- contact-form.mjs: Webstudio managed form handler forwarding to the existing Activepieces webhook.
- wrangler.jsonc: deployment settings for preview.parcelis.dev.
- test/: form handler and authentication checks using a mocked webhook.

## Local setup

Install dependencies with npm ci, then run npm run check and npm test.

Copy .dev.vars.example to .dev.vars and set local-only values. Run npm run dev to start the local Worker.

## Deployment

Run npm run deploy to publish the Worker and public assets together. The configured Worker is falling-sunset-500f, attached to preview.parcelis.dev.

The existing Cloudflare Worker already stores PASSWORD and CONTACT_WEBHOOK_URL as secrets. They are not included in this repository. USERNAME is optional and defaults to admin. For a new Worker, configure the required secrets with Wrangler before using the site.

Deploying only public/ to a static host, including GitHub Pages, will not provide the contact-form endpoint or password protection.

## Updating the website export

Replace only public/ with a fresh Webstudio static export. Run npm run organize:assets to restore the folder layout and update references. Deployment also runs this step automatically. Keep the Worker code and deployment configuration, then run the checks and deploy again.

When folders or assets change in Webstudio, refresh the mapping from the synchronized project bundle:

    npm run organize:assets -- --metadata /path/to/export/.webstudio/data.json

The organizer accepts Webstudio snapshot JSON too. It preserves nested folders, keeps empty Webstudio folders with .gitkeep, and leaves generated chunks, entries, and styles in their existing build folders. Repeated runs make no additional changes. If a form action or webhook changes in Webstudio, update the matching server configuration and Cloudflare secret too.

## GitHub

This folder retains its existing Git history and origin at https://github.com/parcelis/parcelis-website.git. Review changes before committing and pushing. Dependencies, local configuration, and secret files are ignored.
