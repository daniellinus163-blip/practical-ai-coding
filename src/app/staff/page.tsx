import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { catalogRepository } from "@/catalog/local-repository";
import { loadCommandCenterDashboard } from "@/crm/command-center-dashboard";
import { loadIntegrationSnapshot } from "@/crm/integration-snapshot";
import { requireStaff } from "@/crm/guard";
import { EmptyState } from "@/components/catalog/empty-state";
import { CommandCenterCharts, CommandCenterLists } from "@/components/staff/command-center/panels";
import { CommandCenterKpiGrid } from "@/components/staff/command-center/kpi-grid";
import { CommandCenterStatusBanner } from "@/components/staff/command-center/status-banner";
import { IntegrationHealthCards } from "@/components/staff/integration-health-cards";
import { StaffPageSkeleton } from "@/components/staff/staff-loading-skeleton";
import { StaffPageHeader } from "@/components/staff/staff-ui";
import { loadIntegrationConfig } from "@/events/config";

export const metadata = { title: "Command Center" };

export default function StaffOverviewPage() {
  return (
    <Suspense fallback={<StaffPageSkeleton />}>
      <StaffOverview />
    </Suspense>
  );
}

async function StaffOverview() {
  await connection();
  const staff = await requireStaff("/staff");
  if (!staff.admin) {
    return <EmptyState title="No live metrics yet" body="Counts appear after the service role key is set." />;
  }

  const [dashboard, integrationCards, vehicles] = await Promise.all([
    loadCommandCenterDashboard(staff.admin),
    loadIntegrationSnapshot(staff.admin, loadIntegrationConfig(), { serviceRolePresent: staff.serviceRole }),
    catalogRepository.listVehicles(),
  ]);

  const vehicleLabels = new Map(vehicles.map((v) => [v.slug, `${v.brand.name} ${v.model}`]));

  const { stats, kpis } = dashboard;
  return (
    <div className="space-y-12">
        <StaffPageHeader
          title="Command center"
          description="KPIs, charts, and lists are computed from Supabase on each load. Nothing is estimated or mocked."
        />

        <CommandCenterStatusBanner stats={stats} kpis={kpis} />

        <section className="space-y-5">
          <h2 className="font-display text-xl">Key metrics</h2>
          <CommandCenterKpiGrid kpis={kpis} />
        </section>

        <CommandCenterCharts dashboard={dashboard} vehicleLabels={vehicleLabels} />

        <CommandCenterLists dashboard={dashboard} />

        <section className="space-y-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Integration health</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Worker queue: {stats.queuedEvents} queued · {stats.processingEvents} processing
              </p>
            </div>
            <Link href="/staff/events" className="text-sm underline">
              Integration center
            </Link>
          </div>
          <IntegrationHealthCards cards={integrationCards} />
        </section>
    </div>
  );
}
