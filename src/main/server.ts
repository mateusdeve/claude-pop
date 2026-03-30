import express from 'express';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import type { OverlayEvent, EventType, PermissionDecision } from '../shared/types';

const PORT = 31415;

export class OverlayServer extends EventEmitter {
  private app = express();
  private pendingPermissions = new Map<string, {
    resolve: (decision: PermissionDecision) => void;
    event: OverlayEvent;
  }>();
  private pendingQuestions = new Map<string, {
    resolve: (answer: Record<string, unknown>) => void;
    event: OverlayEvent;
    toolInput: Record<string, unknown>;
  }>();

  constructor() {
    super();
    this.app.use(express.json({ limit: '1mb' }));
    this.setupRoutes();
  }

  private parseEventType(raw: Record<string, unknown>): EventType {
    const hook = raw.hook as string | undefined;
    const matcher = raw.matcher as string | undefined;
    const toolName = raw.toolName as string | undefined;
    if (toolName === 'AskUserQuestion') return 'elicitation_dialog';
    if (hook === 'Notification') {
      if (matcher === 'permission_prompt') return 'permission_prompt';
      if (matcher === 'idle_prompt') return 'idle_prompt';
      if (matcher === 'elicitation_dialog') return 'elicitation_dialog';
      return 'notification';
    }
    if (hook === 'PreToolUse') return 'permission_prompt';
    if (hook === 'PostToolUse') return 'tool_use';
    return 'unknown';
  }

  private toolLabel(name: string): string {
    const labels: Record<string, string> = {
      Bash: 'Comando',
      Read: 'Ler arquivo',
      Write: 'Escrever arquivo',
      Edit: 'Editar arquivo',
      Glob: 'Buscar arquivos',
      Grep: 'Buscar conteúdo',
      WebFetch: 'Acessar URL',
      WebSearch: 'Pesquisar web',
      Agent: 'Sub-agente',
      AskUserQuestion: 'Pergunta',
      NotebookEdit: 'Editar notebook',
    };
    return labels[name] || name;
  }

  private buildEvent(raw: Record<string, unknown>): OverlayEvent {
    const toolInput = raw.toolInput as Record<string, unknown> | undefined;
    const toolName = raw.toolName as string | undefined;
    const sessionId = raw.sessionId as string | undefined;

    let message = '';
    const label = toolName ? this.toolLabel(toolName) : '';

    if (toolInput) {
      const cmd = toolInput.command as string | undefined;
      const filePath = toolInput.file_path as string | undefined;
      const question = toolInput.question as string | undefined;
      const pattern = toolInput.pattern as string | undefined;
      const content = toolInput.content as string | undefined;
      const description = toolInput.description as string | undefined;

      if (question) message = question;
      else if (cmd) message = cmd.split('\n')[0].slice(0, 100);
      else if (filePath) message = filePath;
      else if (pattern) message = pattern;
      else if (description) message = description;
      else if (content) message = content.split('\n')[0].slice(0, 80);
    }

    if (!message && label) message = label;

    return {
      id: randomUUID(),
      type: this.parseEventType(raw),
      sessionId,
      tool: label || toolName,
      message,
      raw,
      timestamp: Date.now(),
    };
  }

  private setupRoutes() {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    this.app.post('/event', (req, res) => {
      const event = this.buildEvent(req.body);
      this.emit('event', event);
      res.json({ received: true });
    });

    this.app.post('/permission', (req, res) => {
      const event = this.buildEvent(req.body);
      event.type = 'permission_prompt';
      const id = event.id;

      const timeout = setTimeout(() => {
        this.pendingPermissions.delete(id);
        res.json({ decision: 'allow' });
      }, 120_000);

      this.pendingPermissions.set(id, {
        event,
        resolve: (decision) => {
          clearTimeout(timeout);
          this.pendingPermissions.delete(id);
          const response: Record<string, unknown> = {};
          if (decision.decision === 'allow') {
            response.hookSpecificOutput = { permissionDecision: 'allow' };
          } else {
            response.hookSpecificOutput = { permissionDecision: 'deny' };
          }
          if (decision.updatedInput) {
            (response.hookSpecificOutput as Record<string, unknown>).updatedInput = decision.updatedInput;
          }
          res.json(response);
        },
      });

      this.emit('permission', { id, event });
    });

    // Question gate (long-poll for AskUserQuestion)
    this.app.post('/question', (req, res) => {
      const raw = req.body;
      const toolInput = (raw.toolInput || {}) as Record<string, unknown>;
      const event = this.buildEvent(raw);
      event.type = 'elicitation_dialog';
      const id = event.id;

      const timeout = setTimeout(() => {
        this.pendingQuestions.delete(id);
        // Let Claude handle it normally
        res.json({});
      }, 120_000);

      this.pendingQuestions.set(id, {
        event,
        toolInput,
        resolve: (answer) => {
          clearTimeout(timeout);
          this.pendingQuestions.delete(id);
          res.json({
            hookSpecificOutput: {
              permissionDecision: 'allow',
              updatedInput: answer,
            },
          });
        },
      });

      this.emit('question', { id, event, toolInput });
    });
  }

  respondPermission(id: string, decision: PermissionDecision) {
    const pending = this.pendingPermissions.get(id);
    if (pending) pending.resolve(decision);
  }

  respondQuestion(id: string, answer: Record<string, unknown>) {
    const pending = this.pendingQuestions.get(id);
    if (pending) pending.resolve(answer);
  }

  skipQuestion(id: string) {
    const pending = this.pendingQuestions.get(id);
    if (pending) pending.resolve({});
  }

  private killPortHolder() {
    try {
      const pids = execSync(`lsof -ti :${PORT}`, { encoding: 'utf-8' }).trim();
      if (pids) {
        for (const pid of pids.split('\n')) {
          if (pid && parseInt(pid) !== process.pid) {
            try { process.kill(parseInt(pid), 9); } catch {}
          }
        }
      }
    } catch {}
  }

  start() {
    return new Promise<void>((resolve, reject) => {
      const server = this.app.listen(PORT, '127.0.0.1', () => {
        console.log(`Overlay server listening on http://127.0.0.1:${PORT}`);
        resolve();
      });
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${PORT} in use, killing old process...`);
          this.killPortHolder();
          setTimeout(() => {
            server.close();
            server.listen(PORT, '127.0.0.1');
          }, 1000);
        } else {
          reject(err);
        }
      });
    });
  }
}
