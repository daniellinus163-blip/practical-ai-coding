import { integrationHealth, loadIntegrationConfig } from "@/events/config";

export function SchedulerStatusPanel() {
  const config = loadIntegrationConfig();
  const health = integrationHealth(config);
  const cronConfigured = health.workerAuthConfigured;

  return (
    <section className="rounded-md border border-amber-200/70 bg-amber-50/60 p-4 text-sm text-amber-950">
      <h3 className="font-medium">Automatic task reminders (server)</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        <li>
          Reminders run inside <code className="font-mono">/api/internal/events/process</code> when the event worker
          executes — not in the browser.
        </li>
        <li>
          Vercel cron in <code className="font-mono">vercel.json</code> is scheduled for{" "}
          <strong>06:00 UTC once per day</strong> (Hobby plan limit). Tasks may be notified up to ~24h after they become
          due unless you run the worker manually more often.
        </li>
        <li>
          <strong>CRON_SECRET</strong> must be set on the Vercel project (Production). Vercel sends{" "}
          <code className="font-mono">Authorization: Bearer …</code> to the cron route — do not put the secret in{" "}
          <code className="font-mono">vercel.json</code>.
        </li>
        <li>
          Status on this deployment:{" "}
          {cronConfigured ? (
            <span className="font-medium text-emerald-800">
              CRON_SECRET / worker secret is configured — cron can authenticate. Verify under Vercel → Cron / Logs that
              runs succeed.
            </span>
          ) : (
            <span className="font-medium text-red-800">
              CRON_SECRET is missing — automatic reminders are not active until you add it and redeploy.
            </span>
          )}
        </li>
        <li>
          Manual run (any time): Integrations → <strong>Process queued events now</strong> (also processes task
          reminders).
        </li>
      </ul>
    </section>
  );
}
