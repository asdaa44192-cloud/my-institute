import { prisma } from "./src/lib/prisma";

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT s.name as subject, AVG(g.score * 100.0 / g."maxScore") as average
    FROM "GradeRecord" g
    JOIN "Subject" s ON s.id = g."subjectId"
    GROUP BY s.name
    ORDER BY s.name ASC
  `;
  console.log("SUCCESS");
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((err) => {
    console.error("FAILED");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
