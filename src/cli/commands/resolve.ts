import chalk from 'chalk';
import readline from 'readline';
import { detectConflicts } from '../../store/conflicts.js';
import { saveFact, deleteFact } from '../../store/facts.js';
import { emitUniversalContextMd } from '../../emitters/context-md.js';

export async function runResolveCommand() {
  const conflicts = detectConflicts();
  console.log(chalk.bold.cyan('\n🧠 memcon — Conflict & Divergence Resolver\n'));

  if (conflicts.length === 0) {
    console.log(chalk.green('✨ Zero conflicts detected across your agents. All beliefs are aligned.\n'));
    return;
  }

  console.log(chalk.yellow(`Detected ${conflicts.length} conflict(s) across agent memory histories:\n`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (query: string) => new Promise<string>((resolve) => rl.question(query, resolve));

  for (const c of conflicts) {
    const fact = c.facts[0];
    console.log(chalk.bold(`Key: ${fact.key}`));
    console.log(chalk.white(`Current Content (${fact.source}, v${fact.version}):`));
    console.log(chalk.dim(fact.content));

    const choice = await askQuestion(chalk.cyan('\nAction [(k)eep current / (d)elete / (e)dit content / (s)kip]: '));
    const trimmed = choice.trim().toLowerCase();

    if (trimmed === 'd') {
      deleteFact(fact.key);
      console.log(chalk.red(`Deleted fact [${fact.key}]`));
    } else if (trimmed === 'e') {
      const newContent = await askQuestion(chalk.cyan('Enter resolved content: '));
      if (newContent.trim()) {
        saveFact({
          key: fact.key,
          content: newContent.trim(),
          category: fact.category,
          source: 'user-resolved',
        });
        console.log(chalk.green(`Updated fact [${fact.key}] with resolved content.`));
      }
    } else {
      console.log(chalk.dim('Kept current fact version.'));
    }
    console.log('---');
  }

  rl.close();
  emitUniversalContextMd();
  console.log(chalk.bold.green('\n✨ Conflict resolution complete.\n'));
}
