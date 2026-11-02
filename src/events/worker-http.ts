import { workerAuthorized } from "@/events/auth";

export type WorkerRunResult = {
  claimed: number;
  processed: number;
  error: string | null;
};

export async function handleWorkerRequest(
  request: Request,
  options: {
    secrets: readonly string[];
    run: () => Promise<WorkerRunResult>;
  },
): Promise<Response> {
  if (!workerAuthorized(request, options.secrets)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await options.run();
    return Response.json({
      claimed: result.claimed,
      processed: result.processed,
      error: result.error,
    });
  } catch {
    return Response.json({ error: "worker_failed" }, { status: 500 });
  }
}
