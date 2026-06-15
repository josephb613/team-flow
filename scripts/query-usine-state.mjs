import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const PROJECT_ID = 'cmqc77he50007xlzwb9sv7p5w';

async function main() {
  const project = await db.project.findUnique({
    where: { id: PROJECT_ID },
    include: { tasks: true, milestones: true, sprints: true },
  });
  if (!project) {
    console.log('Project not found');
    return;
  }
  console.log('Project:', project.name);
  console.log('Tasks:', project.tasks.length);
  console.log('Milestones:', project.milestones.length);
  console.log('Sprints:', project.sprints.length);
  console.log('Tasks without milestoneId:', project.tasks.filter((t) => !t.milestoneId).length);
  console.log('Tasks without sprintId:', project.tasks.filter((t) => !t.sprintId).length);
  console.log('\n--- Milestones ---');
  for (const m of project.milestones.sort((a, b) => a.title.localeCompare(b.title))) {
    const count = project.tasks.filter((t) => t.milestoneId === m.id).length;
    console.log(`${m.title} | tasks: ${count} | color: ${m.color}`);
  }
  console.log('\n--- Sprints ---');
  for (const s of project.sprints) {
    const count = project.tasks.filter((t) => t.sprintId === s.id).length;
    console.log(`${s.name} | tasks: ${count} | status: ${s.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
