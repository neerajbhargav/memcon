import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { getAllFacts, saveFact } from '../../store/facts.js';
import { getPendingHandoffs, createHandoff } from '../../store/handoffs.js';
import { emitUniversalContextMd } from '../../emitters/context-md.js';

export async function runExportCommand(targetPath?: string) {
  const outFile = targetPath || path.join(process.cwd(), `memcon-backup-${Date.now()}.json`);
  const facts = getAllFacts();
  const handoffs = getPendingHandoffs();

  const payload = {
    version: '0.1.0',
    exportedAt: new Date().toISOString(),
    facts,
    handoffs,
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(chalk.green(`\n✅ Exported ${facts.length} facts and ${handoffs.length} handoffs to ${outFile}\n`));
}

export async function runImportCommand(sourcePath: string) {
  if (!fs.existsSync(sourcePath)) {
    console.log(chalk.red(`\n❌ Import file not found: ${sourcePath}\n`));
    return;
  }

  try {
    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const data = JSON.parse(raw);

    let factCount = 0;
    if (Array.isArray(data.facts)) {
      for (const f of data.facts) {
        saveFact({
          key: f.key,
          content: f.content,
          category: f.category,
          source: f.source || 'imported',
          tags: f.tags,
          confidence: f.confidence,
        });
        factCount++;
      }
    }

    let handoffCount = 0;
    if (Array.isArray(data.handoffs)) {
      for (const h of data.handoffs) {
        createHandoff({
          fromAgent: h.fromAgent || 'imported',
          toAgent: h.toAgent,
          summary: h.summary,
          context: h.context,
        });
        handoffCount++;
      }
    }

    emitUniversalContextMd();
    console.log(chalk.green(`\n✅ Imported ${factCount} facts and ${handoffCount} handoffs from ${sourcePath}\n`));
  } catch (e: any) {
    console.log(chalk.red(`\n❌ Failed to parse import file: ${e.message}\n`));
  }
}
