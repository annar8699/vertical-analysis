# Global Claude Code Instructions

## Security Baseline
These rules apply to all projects. Document exceptions in PR under **Security Exception**.

- **No secrets in code or git. Ever.** No API keys, tokens, passwords, or credentials in source code, config files, or git history. Use environment variables and `.env` files exclusively. Always verify `.env` is in `.gitignore` before committing. This includes frontend code — never put keys in Vite's `VITE_` or Next.js `NEXT_PUBLIC_` env vars unless they are truly public.
- **RLS by default**: Enable Row-Level Security. Define only minimal, necessary policies (no blanket "ALL" access).
- **Least privilege**: Roles and keys must have only required permissions. Never expose service roles to the client.
- **Input validation**: Always server-side (schema-based). Never trust client-side validation alone. Parameterized queries only. Output escaping for XSS.
- **CORS**: Never use wildcard `*` in production. Explicitly whitelist allowed origins.
- **App-level protections**: Rate limiting on write endpoints. Safe file uploads (size, type, storage outside public root).
- Proactively suggest `/security-review` when working on authentication, payments, user data handling, API endpoints, or any security-sensitive features.

## Code Standards
- Never use `type: any` in TypeScript. Use strict typing, generics, or `unknown`.
- Use latest stable versions of dependencies. No beta/alpha/RC unless explicitly required.
- Use `context7` MCP to retrieve current documentation before implementing.
- When editing existing apps or websites, maintain consistency with the established visual style, copywriting tone, and code patterns. Match what's already there before introducing anything new.

## Version Control & Deploy
- Git author email: `YOUR_EMAIL_ADDRESS` (required — Vercel rejects commits without it).
- **Never commit or push automatically.** Only on explicit request, or ask first.
- Use feature branches and open Pull Requests before merging into `main`.
- Commit messages: concise, imperative mood.
- Deploy strategy: Git → GitHub → Vercel (auto-deploy). Use `vercel` CLI for logs, deployment info, and debugging (`vercel logs`, `vercel inspect`, `vercel env`).
