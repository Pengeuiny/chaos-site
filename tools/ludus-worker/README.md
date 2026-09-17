# CHAOS Ludus worker

Runs on a home machine (the dgxbox) because Ludus sits behind Cloudflare's bot
check, which blocks browsers coming from datacenters such as Vercel.

What it does, every `POLL_MINUTES`:

1. `GET /api/ludus/worker/tasks` on the CHAOS site — receives new sheet rows and
   approved jobs.
2. For each new row, asks the local Ollama model (`OLLAMA_MODEL`) to propose what
   to create in Ludus, and posts the proposal back (`/proposals`). A board member
   reviews it on the site's **Ludus** tab.
3. For each approved job, signs into the Ludus admin with Playwright, creates the
   item (always **Off**), screenshots every step, and posts the outcome (`/results`).
4. Sends a heartbeat so the Ludus tab can show whether the worker is online.

Job kinds implemented: `collection` (fee + optional form). `event` is not yet.

## Install on the worker machine

```bash
rsync -a --exclude node_modules --exclude .profile tools/ludus-worker/ chris@dgxbox:~/ludus-worker/
ssh chris@dgxbox
cd ~/ludus-worker && npm install && npx playwright install chromium
cp .env.example .env && nano .env        # fill in the token and Ludus credentials
mkdir -p ~/.config/systemd/user && cp ludus-worker.service ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now ludus-worker
journalctl --user -u ludus-worker -f
```

`loginctl enable-linger <user>` must have been run once (with sudo) so the
service keeps running when nobody is logged in.

## Testing pieces on their own

```bash
node interpret.mjs '{"Item":"Participation Fee - Great Gatsby - Tech","Amount":"$75","Due":"10/1/2026","Collect":"student name, t-shirt size S/M/L/XL, allergies"}'
node worker.mjs --once
```

## If the Ludus tab says "needs attention"

Usually Cloudflare challenged the browser or the Ludus password changed. Check
`journalctl --user -u ludus-worker`, fix `.env` if needed, then
`systemctl --user restart ludus-worker`. The browser profile lives in
`.profile/`; deleting it forces a fresh sign-in.
