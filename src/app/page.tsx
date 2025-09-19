export default function HomePage() {
  return (
    <div className="card">
      <div className="h1">Itz The Pools</div>
      <p className="mt-2 opacity-80">
        Multi-league, multi-sport pools platform. This shell was created in <b>Step 1.4</b>.
      </p>
      <ul className="mt-4 list-disc pl-5 space-y-1 opacity-90">
        <li>Next.js App Router + Tailwind</li>
        <li>Reusable <code>card</code>, <code>btn</code>, <code>input</code> utilities</li>
        <li>Supabase/Auth comes in Step 1.5</li>
      </ul>
    </div>
  );
}
