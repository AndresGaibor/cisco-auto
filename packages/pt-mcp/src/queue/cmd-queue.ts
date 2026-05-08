import { randomUUID } from "node:crypto";

export type CmdQueueScope = "device" | "global";

export interface CmdQueueJob<T> {
  id: string;
  scope: CmdQueueScope;
  key: string;
  label: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  status: "pending" | "running" | "done" | "failed";
  run: () => Promise<T>;
  result?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface CmdQueueSnapshot {
  pending: Array<Record<string, unknown>>;
  running: Array<Record<string, unknown>>;
  done: Array<Record<string, unknown>>;
  failed: Array<Record<string, unknown>>;
}

export class CmdQueue {
  private readonly chains = new Map<string, Promise<unknown>>();
  private readonly jobs = new Map<string, CmdQueueJob<unknown>>();

  enqueue<T>(input: {
    scope: CmdQueueScope;
    key: string;
    label: string;
    run: () => Promise<T>;
  }): Promise<T> {
    const id = `cmdq-${randomUUID().slice(0, 8)}`;

    const job: CmdQueueJob<T> = {
      id,
      scope: input.scope,
      key: input.key,
      label: input.label,
      createdAt: new Date().toISOString(),
      status: "pending",
      run: input.run,
    };

    this.jobs.set(id, job as CmdQueueJob<unknown>);

    const chainKey = input.scope === "global" ? "global" : `device:${input.key}`;
    const previous = this.chains.get(chainKey) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(async () => {
        job.status = "running";
        job.startedAt = new Date().toISOString();

        try {
          const result = await job.run();
          job.status = "done";
          job.result = result;
          return result;
        } catch (error) {
          const err = error as Error & { code?: string };
          job.status = "failed";
          job.error = {
            code: err.code ?? "CMD_QUEUE_JOB_FAILED",
            message: err.message ?? String(error),
          };
          throw error;
        } finally {
          job.finishedAt = new Date().toISOString();
        }
      });

    this.chains.set(chainKey, next);
    return next as Promise<T>;
  }

  snapshot(): CmdQueueSnapshot {
    const rows = [...this.jobs.values()].map((job) => ({
      id: job.id,
      scope: job.scope,
      key: job.key,
      label: job.label,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      status: job.status,
      error: job.error,
    }));

    return {
      pending: rows.filter((x) => x.status === "pending"),
      running: rows.filter((x) => x.status === "running"),
      done: rows.filter((x) => x.status === "done").slice(-50),
      failed: rows.filter((x) => x.status === "failed").slice(-50),
    };
  }

  clearFinished(): number {
    let count = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (job.status === "done" || job.status === "failed") {
        this.jobs.delete(id);
        count++;
      }
    }

    return count;
  }
}

export const globalCmdQueue = new CmdQueue();
