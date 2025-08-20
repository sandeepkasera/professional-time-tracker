# professional-time-tracker
## Next.js App Router Course - Starter

This is the starter template for the Next.js App Router Course. It contains the starting code for the dashboard application.

For more information, see the [course curriculum](https://nextjs.org/learn) on the Next.js Website.



Workflow for Updating Schema

1	Modify db/schema.ts (add new table/column/constraint)	✍️ Example:
users → add phone varchar("phone")
2	Generate migration SQL (Drizzle detects diff)	"npx drizzle-kit generate"
3	Check SQL in drizzle/ folder (safe to review before applying)	📂 Example: drizzle/0002_add_phone_to_users.sql
4	Apply migration to NeonDB	"npx drizzle-kit push"
5	Code now uses updated schema	✅