## RECENT CHANGES

2025-07-23 — settings page: profile edit (username, displayName, base64 PFP upload), theme toggle (next-themes), password change, account info + schema: displayName+avatarUrl cols + migration 0006 + GET/PATCH /api/user
2025-07-23 — add favicon + sidebar logo (grid.png), brand header in sidebar
2025-07-23 — activity page: recharts bar/area charts, content stats (chars/avg/longest), streak detection, most active day + deps (recharts)
2025-07-23 — notebook frontend: Typora-style editor w/ auto-save+markdown preview, file-tree sidebar w/ search+inline create, /dashboard/your-notebooks page, react-markdown+remark-gfm deps
2025-07-23 — notebook CRUD API (GET list+POST create /api/notebooks, GET+PATCH+DELETE /api/notebooks/[id]), schema: content→text + icon field, migration 0005, removed old /api/notebook/create
2025-07-23 — revamp dashboard home w/ bento stats + recent notebooks grid, /api/dashboard endpoint
2025-07-23 — dev: auto-verify + skip email / prod: normal OTP email flow (sign-up route + page)
