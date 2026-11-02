import { loadIntegrationConfig } from "@/events/config";
import { runEventWorker } from "@/events/run";
import { handleWorkerRequest } from "@/events/worker-http";


function handle(request: Request) {
  const config = loadIntegrationConfig();
  return handleWorkerRequest(request, {
    secrets: config.workerSecrets,
    run: () => runEventWorker("cron"),
  });
}

export function GET(request: Request) {
  return handle(request);
}

export function POST(request: Request) {
  return handle(request);
}
