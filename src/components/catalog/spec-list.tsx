import { confidenceCopy } from "@/catalog/labels";
import type { VehicleConfiguration, VehicleSpecification } from "@/catalog/types";

export function SpecList({
  specifications,
  configurations,
}: {
  specifications: VehicleSpecification[];
  configurations: VehicleConfiguration[];
}) {
  const shared = specifications.filter((spec) => spec.configurationId === null);

  return (
    <div className="space-y-8">
      <SpecGroup title="Shared facts" specs={shared} />
      {configurations.map((configuration) => {
        const specs = specifications.filter(
          (spec) => spec.configurationId === configuration.id,
        );
        if (specs.length === 0) return null;
        return (
          <SpecGroup
            key={configuration.id}
            title={configuration.name}
            note={configuration.notes}
            specs={specs}
          />
        );
      })}
    </div>
  );
}

function SpecGroup({
  title,
  note,
  specs,
}: {
  title: string;
  note?: string | null;
  specs: VehicleSpecification[];
}) {
  if (specs.length === 0) return null;
  return (
    <section>
      <h3 className="text-lg">{title}</h3>
      {note ? <p className="mt-1 text-sm text-[var(--muted)]">{note}</p> : null}
      <dl className="mt-4 divide-y divide-[var(--line)] border border-[var(--line)] bg-[var(--card)]">
        {specs.map((spec) => (
          <div key={spec.id} className="grid gap-2 p-4 md:grid-cols-[220px_1fr]">
            <dt className="text-sm text-[var(--muted)]">{spec.label}</dt>
            <dd>
              <p>
                {spec.confidence === "unavailable" || !spec.value
                  ? "Not listed"
                  : spec.unit
                    ? `${spec.value} ${spec.unit}`
                    : spec.value}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--brass)]">
                {confidenceCopy[spec.confidence]}
              </p>
              {spec.notes ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{spec.notes}</p>
              ) : null}
              {spec.source ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Source:{" "}
                  <a className="underline" href={spec.source.url} target="_blank" rel="noreferrer">
                    {spec.source.name}
                  </a>
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
