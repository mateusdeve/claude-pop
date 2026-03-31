import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import type { SlashCommand } from '../shared/types';

const CLAUDE_DIR = join(homedir(), '.claude');
const PLUGINS_DIR = join(CLAUDE_DIR, 'plugins', 'marketplaces', 'claude-plugins-official', 'plugins');

/** Extract description from markdown frontmatter */
function parseDescription(content: string): string {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return '';
  const fm = match[1];
  const descMatch = fm.match(/description:\s*(.+)/);
  return descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '';
}

/** Scan a commands directory and return SlashCommand[] */
function scanDir(dir: string, scope: SlashCommand['scope']): SlashCommand[] {
  if (!existsSync(dir)) return [];
  const commands: SlashCommand[] = [];
  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf-8');
      commands.push({
        name: basename(file, '.md'),
        description: parseDescription(content),
        scope,
      });
    }
  } catch {}
  return commands;
}

/** Scan skills directories (SKILL.md inside each skill folder) */
function scanSkills(pluginsDir: string): SlashCommand[] {
  if (!existsSync(pluginsDir)) return [];
  const commands: SlashCommand[] = [];
  try {
    const plugins = readdirSync(pluginsDir);
    for (const plugin of plugins) {
      const skillsDir = join(pluginsDir, plugin, 'skills');
      if (!existsSync(skillsDir)) continue;
      const skills = readdirSync(skillsDir);
      for (const skill of skills) {
        const skillFile = join(skillsDir, skill, 'SKILL.md');
        if (!existsSync(skillFile)) continue;
        const content = readFileSync(skillFile, 'utf-8');
        commands.push({
          name: skill,
          description: parseDescription(content),
          scope: 'plugin',
        });
      }
    }
  } catch {}
  return commands;
}

/** Scan legacy plugin commands */
function scanPluginCommands(pluginsDir: string): SlashCommand[] {
  if (!existsSync(pluginsDir)) return [];
  const commands: SlashCommand[] = [];
  try {
    const plugins = readdirSync(pluginsDir);
    for (const plugin of plugins) {
      const cmdsDir = join(pluginsDir, plugin, 'commands');
      commands.push(...scanDir(cmdsDir, 'plugin'));
    }
  } catch {}
  return commands;
}

/** Scan all slash commands from all sources */
export function scanCommands(projectCwd?: string): SlashCommand[] {
  const all: SlashCommand[] = [];

  // User global commands
  all.push(...scanDir(join(CLAUDE_DIR, 'commands'), 'user'));

  // Plugin commands (legacy + skills)
  all.push(...scanPluginCommands(PLUGINS_DIR));
  all.push(...scanSkills(PLUGINS_DIR));

  // Project commands
  if (projectCwd) {
    all.push(...scanDir(join(projectCwd, '.claude', 'commands'), 'project'));
  }

  // Deduplicate by name (project > user > plugin)
  const seen = new Map<string, SlashCommand>();
  const priority: Record<string, number> = { project: 3, user: 2, plugin: 1 };
  for (const cmd of all) {
    const existing = seen.get(cmd.name);
    if (!existing || (priority[cmd.scope] || 0) > (priority[existing.scope] || 0)) {
      seen.set(cmd.name, cmd);
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}
