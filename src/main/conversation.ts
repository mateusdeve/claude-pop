import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { ConversationMessage } from '../shared/types';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/** Build the path to a session's JSONL conversation file */
export function buildConversationPath(cwd: string, sessionId: string): string {
  // Claude Code encodes the cwd by replacing '/' with '-'
  const encoded = cwd.replace(/\//g, '-');
  return join(PROJECTS_DIR, encoded, `${sessionId}.jsonl`);
}

/** Read the last N user/assistant messages from a JSONL file */
export async function readLastMessages(filePath: string, limit = 20): Promise<ConversationMessage[]> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  const lines = content.split('\n').filter(l => l.trim());
  const messages: ConversationMessage[] = [];

  // We need to group consecutive assistant entries into a single turn
  // because Claude Code splits streaming into multiple JSONL lines
  let currentAssistant: ConversationMessage | null = null;

  for (const line of lines) {
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type === 'user' && entry.message) {
      // Flush any pending assistant message
      if (currentAssistant) {
        messages.push(currentAssistant);
        currentAssistant = null;
      }

      const text = extractText(entry.message.content);
      if (!text) continue;

      messages.push({
        role: 'user',
        text,
        timestamp: entry.timestamp || '',
        isComplete: true,
      });
    } else if (entry.type === 'assistant' && entry.message) {
      const text = extractText(entry.message.content);
      const tools = extractTools(entry.message.content);
      const isComplete = entry.message.stop_reason === 'end_turn';

      if (!currentAssistant) {
        currentAssistant = {
          role: 'assistant',
          text: text,
          timestamp: entry.timestamp || '',
          isComplete,
          tools: tools.length > 0 ? tools : undefined,
        };
      } else {
        // Append to current assistant turn
        if (text) {
          currentAssistant.text = currentAssistant.text
            ? currentAssistant.text + text
            : text;
        }
        if (tools.length > 0) {
          currentAssistant.tools = [
            ...(currentAssistant.tools || []),
            ...tools,
          ];
        }
        currentAssistant.isComplete = isComplete;
      }
    }
  }

  // Flush last assistant
  if (currentAssistant) {
    messages.push(currentAssistant);
  }

  // Deduplicate tools within each message
  for (const msg of messages) {
    if (msg.tools) {
      msg.tools = [...new Set(msg.tools)];
    }
  }

  return messages.slice(-limit);
}

/** Extract text from message content (string or content blocks array) */
function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .filter((block: any) => block.type === 'text' && block.text)
    .map((block: any) => block.text)
    .join('');
}

/** Extract tool names from content blocks */
function extractTools(content: unknown): string[] {
  if (!Array.isArray(content)) return [];

  return content
    .filter((block: any) => block.type === 'tool_use' && block.name)
    .map((block: any) => block.name);
}

/** Poll a JSONL file for size changes and call onChange with updated messages */
export function watchConversation(
  filePath: string,
  onChange: (messages: ConversationMessage[]) => void,
): { stop: () => void } {
  let lastSize = 0;
  let running = true;

  // Get initial size
  stat(filePath).then(s => { lastSize = s.size; }).catch(() => {});

  const timer = setInterval(async () => {
    if (!running) return;
    try {
      const s = await stat(filePath);
      if (s.size !== lastSize) {
        lastSize = s.size;
        const msgs = await readLastMessages(filePath);
        onChange(msgs);
      }
    } catch {
      // file may not exist yet
    }
  }, 2000);

  return {
    stop() {
      running = false;
      clearInterval(timer);
    },
  };
}
