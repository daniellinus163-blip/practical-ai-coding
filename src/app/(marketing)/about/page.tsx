export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--brass)]">About</p>
      <h1 className="font-display text-4xl">An independent catalog</h1>
      <p>
        FormShift AI helps people explore vehicles, inspect labelled specifications, and later
        configure supported features. It is not an official manufacturer website and not a
        dealership.
      </p>
      <p>
        Catalog records still live as structured seed data so cards and filters stay honest if
        the database is offline. Accounts, saved builds, and inquiries use Supabase after you
        follow the setup file in the repo.
      </p>
      <p>
        We do not invent prices, performance figures, availability, or release dates. If a number
        is not verified, it is marked unavailable.
      </p>
      <p>
        The 3D studio loads only models you place in the project. Fan or marketplace files are not
        official manufacturer assets. The Tesla Roadster is labelled upcoming/planned; it does not
        have a verified official production 3D model here.
      </p>
    </div>
  );
}
