/**
 * One-off CLI utility for the app owner to grant ADMIN access to an existing account.
 *
 * There is no admin sign-up flow by design (admin powers shouldn't be self-serve from
 * the public registration form). Instead, whoever controls the database/deploy
 * environment runs this script once to promote their own account.
 *
 * Usage (from backend/):
 *   npm run promote-admin -- you@example.com
 *
 * On Render: open the backend service's Shell tab and run the same command there,
 * since that's the environment with access to the production DATABASE_URL.
 */
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    console.error("Usage: npm run promote-admin -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No user found with email "${email}". Register the account first, then re-run this script.`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`"${email}" is already an ADMIN. Nothing to do.`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`Done. "${email}" is now an ADMIN. Log out and back in for the new role to take effect.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to promote user:", error);
  process.exit(1);
});
