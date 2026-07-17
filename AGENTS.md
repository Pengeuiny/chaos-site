<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Keep the "About This Site" admin page current

`app/admin/(protected)/about/page.tsx` documents this site's hosting, database, framework, and cost structure for both a non-technical board member and a future developer. Dependency versions on that page are pulled live from `package.json`, so those stay accurate automatically — everything else is prose. Whenever you make a structural change (switch/add a hosting or database provider, upgrade a framework in a way that changes what's described, add a new paid service, add a new external integration), update that page in the same change.
