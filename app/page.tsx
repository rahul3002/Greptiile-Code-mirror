"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSessions, SessionSummary, submitRepositories } from "@/utils/api";

const examples = [
  {
    title: "Copy an auth flow",
    description: "Find login, session handling, protected routes, and target repo changes.",
  },
  {
    title: "Migrate a dashboard widget",
    description: "Extract UI, data hooks, API calls, and styling dependencies.",
  },
  {
    title: "Port an upload feature",
    description: "Map storage, validation, server actions, and preview states.",
  },
];

const steps = [
  "Connect source repository",
  "Connect target repository",
  "Index both codebases",
  "Describe the feature on the next screen",
];

export default function Home() {
  const [idealRepo, setIdealRepo] = useState("");
  const [userRepo, setUserRepo] = useState("");
  const [idealBranch, setIdealBranch] = useState("main");
  const [userBranch, setUserBranch] = useState("main");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => {
        setSessions([]);
      });
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(
      idealRepo.trim() &&
        userRepo.trim() &&
        idealBranch.trim() &&
        userBranch.trim() &&
        !isLoading
    );
  }, [idealRepo, userRepo, idealBranch, userBranch, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await submitRepositories(
        idealRepo.trim(),
        userRepo.trim(),
        idealBranch.trim(),
        userBranch.trim()
      );
      router.push(`/extract-feature/${result.sessionId}`);
    } catch (submitError) {
      console.error("Error submitting repositories:", submitError);
      setError(
        "Could not prepare these repositories. Check the repo names, branches, and server environment keys."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1110] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-[#101816] px-6 py-6 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
              Code Mirror
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
              Feature migration workspace
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Compare a source repository with your target codebase, then ask the app to produce a migration plan.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300/50 text-sm text-emerald-200">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm text-slate-300">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Recent sessions
            </p>
            <div className="mt-4 space-y-3">
              {sessions.length === 0 && (
                <p className="text-sm leading-6 text-slate-400">
                  Sessions will appear here after MongoDB is configured and a migration is created.
                </p>
              )}
              {sessions.slice(0, 5).map((session) => (
                <Link
                  key={session._id}
                  href={`/extract-feature/${session._id}`}
                  className="block border border-white/10 bg-white/[0.03] p-3 text-sm transition hover:border-emerald-300/50 hover:bg-emerald-300/10"
                >
                  <span className="block truncate font-medium text-white">
                    {session.idealRepo} to {session.userRepo}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {session.status || "ready"} · {session.analyses?.length || 0} analyses
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-300">New migration</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-4xl">
                  Tell me which repos to compare.
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300 sm:min-w-72">
                <div className="border border-white/10 bg-white/[0.04] px-3 py-3">
                  Index
                </div>
                <div className="border border-white/10 bg-white/[0.04] px-3 py-3">
                  Analyze
                </div>
                <div className="border border-white/10 bg-white/[0.04] px-3 py-3">
                  Plan
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
              <fieldset className="border border-white/10 bg-white/[0.04] p-5">
                <legend className="px-2 text-sm font-semibold text-emerald-200">
                  Source repository
                </legend>
                <label htmlFor="idealRepo" className="block text-sm text-slate-300">
                  Repository
                </label>
                <input
                  type="text"
                  placeholder="owner/repository"
                  id="idealRepo"
                  value={idealRepo}
                  onChange={(e) => setIdealRepo(e.target.value)}
                  className="mt-2 w-full border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-emerald-300"
                  required
                />
                <label htmlFor="idealBranch" className="mt-5 block text-sm text-slate-300">
                  Branch
                </label>
                <input
                  type="text"
                  id="idealBranch"
                  value={idealBranch}
                  onChange={(e) => setIdealBranch(e.target.value)}
                  className="mt-2 w-full border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-emerald-300"
                  required
                />
              </fieldset>

              <fieldset className="border border-white/10 bg-white/[0.04] p-5">
                <legend className="px-2 text-sm font-semibold text-cyan-200">
                  Target repository
                </legend>
                <label htmlFor="userRepo" className="block text-sm text-slate-300">
                  Repository
                </label>
                <input
                  type="text"
                  placeholder="owner/repository"
                  id="userRepo"
                  value={userRepo}
                  onChange={(e) => setUserRepo(e.target.value)}
                  className="mt-2 w-full border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
                  required
                />
                <label htmlFor="userBranch" className="mt-5 block text-sm text-slate-300">
                  Branch
                </label>
                <input
                  type="text"
                  id="userBranch"
                  value={userBranch}
                  onChange={(e) => setUserBranch(e.target.value)}
                  className="mt-2 w-full border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
                  required
                />
              </fieldset>

              <div className="lg:col-span-2">
                {error && (
                  <div className="mb-4 border border-red-300/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-emerald-500 px-5 py-3 font-semibold text-[#08100f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 sm:w-auto"
                  disabled={!canSubmit}
                >
                  {isLoading ? "Preparing repositories..." : "Prepare migration workspace"}
                </button>
              </div>
            </form>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {examples.map((example) => (
                <article key={example.title} className="border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-base font-semibold text-white">{example.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{example.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
