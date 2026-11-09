import { connection } from "next/server";
import { loadIntegrationConfig } from "@/events/config";
import { runEventWorker } from "@/events/run";
import { handleWorkerRequest } from "@/events/worker-http";

async function handle(request: Request) {
  await connection();
  const config = loadIntegrationConfig();
  return handleWorkerRequest(request, {
    secrets: config.workerSecrets,
    run: () => runEventWorker("cron"),
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
