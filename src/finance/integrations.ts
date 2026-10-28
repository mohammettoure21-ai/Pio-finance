import type { Portfolio, Task } from "./model";
// Future adapters must run through an authenticated backend. Never put service secrets here.
export type PioProposal = {
  summary: string;
  tasks: Omit<Task, "id" | "done">[];
};
export interface PioAdapter {
  propose(
    message: string,
    data: Portfolio,
    signal?: AbortSignal,
  ): Promise<PioProposal>;
}
export interface ReminderAdapter {
  schedule(task: Task): Promise<void>;
}
export interface WhatsAppAdapter {
  connected(): Promise<boolean>;
}
// No adapter configured: no model calls, external messages or notifications are sent.
export const integrationStatus = {
  ai: false,
  reminders: false,
  whatsapp: false,
} as const;
