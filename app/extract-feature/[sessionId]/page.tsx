"use client";

import Chat from "@/components/Chat";
import { extractFeature, ExtractionResult, getSession, SessionDetails } from "@/utils/api";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ResultKey = "implementationSuggestions" | "compatibilityAnalysis" | "extractedFeature";

const resultTabs: Array<{ key: ResultKey; label: string; description: string }> = [
  {
    key: "implementationSuggestions",
    label: "Implementation plan",
    description: "Practical migration paths and step-by-step guidance.",
  },
  {
    key: "compatibilityAnalysis",
    label: "Compatibility",
    description: "Architecture fit, risks, dependencies, and effort.",
  },
  {
    key: "extractedFeature",
    label: "Source feature",
    description: "What the assistant found in the source repository.",
  },
];

const featureTemplates = [
  "Authentication flow with protected pages",
  "Dashboard chart with API-backed data",
  "File upload with validation and preview",
  "Notifications system with unread state",
];

export default function ExtractFeature() {
  const params = useParams();
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [activeTab, setActiveTab] = useState<ResultKey>("implementationSuggestions");
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState("");

  const sessionId = params.sessionId as string;
  const selectedResult = result?.[activeTab];

  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId)
      .then(setSession)
      .catch(() => {
        setSession(null);
      });
  }, [sessionId]);

  const canAnalyze = useMemo(() => {
    return Boolean(featureTitle.trim() && featureDescription.trim() && !isLoading);
  }, [featureTitle, featureDescription, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setShowChat(false);

    try {
      if (typeof sessionId !== "string") {
        throw new Error("Invalid session ID");
      }

      const data = await extractFeature(
        sessionId,
        featureTitle.trim(),
        featureDescription.trim()
      );
      setResult(data);
      setActiveTab("implementationSuggestions");
      getSession(sessionId).then(setSession).catch(() => setSession(null));
    } catch (extractError) {
      console.error("Error extracting feature:", extractError);
      setError(
        "Feature analysis failed. Confirm your API keys are configured and the selected repositories were indexed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = (title: string) => {
    setFeatureTitle(title);
    setFeatureDescription(
      `Analyze how the source repository implements "${title}". Identify the relevant files, dependencies, data flow, UI states, server/API logic, integration steps, risks, and tests needed to reproduce it in the target repository.`
    );
  };

  const formatMessage = (content: string) => {
    const blocks = content.split(/```[\w]*\n/);

    return blocks.map((block, index) => {
      if (index % 2 === 1) {
        return (
          <pre
            key={index}
            className="my-4 overflow-x-auto border border-white/10 bg-[#07100f] p-4 text-sm leading-6 text-emerald-100"
          >
            <code>{block.replace(/```$/, "")}</code>
          </pre>
        );
      }

      const formattedBlock = block
        .replace(/^####\s(.*?)$/gm, "<h4>$1</h4>")
        .replace(/^###\s(.*?)$/gm, "<h3>$1</h3>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/(\d+\.\s.*?)$/gm, "$1<br />")
        .replace(/\n/g, "<br />");

      return (
        <div
          key={index}
          className="analysis-copy"
          dangerouslySetInnerHTML={{ __html: formattedBlock }}
        />
      );
    });
  };

  return (
    <main className="min-h-screen bg-[#0b1110] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-white/10 bg-[#101816] px-6 py-6 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Migration session
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
            Describe the feature to copy.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            The stronger the description, the better the assistant can separate core implementation from surrounding code.
          </p>

          <div className="mt-8 border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Session ID
            </p>
            <p className="mt-2 break-all text-sm text-slate-200">{sessionId}</p>
          </div>

          <div className="mt-4 border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Status
            </p>
            <p className="mt-2 text-sm font-medium text-white">{session?.status || "unknown"}</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {session?.statusMessage || "Connect MongoDB to load saved session metadata."}
            </p>
          </div>

          {session && (
            <div className="mt-4 space-y-3">
              <RepositoryMiniCard
                label="Source"
                repo={session.sourceRepository?.fullName || session.idealRepo}
                branch={session.sourceRepository?.branch || session.idealBranch}
                sha={session.sourceRepository?.latestCommitSha}
              />
              <RepositoryMiniCard
                label="Target"
                repo={session.targetRepository?.fullName || session.userRepo}
                branch={session.targetRepository?.branch || session.userBranch}
                sha={session.targetRepository?.latestCommitSha}
              />
            </div>
          )}

          <div className="mt-6 space-y-3">
            {featureTemplates.map((template) => (
              <button
                key={template}
                type="button"
                onClick={() => applyTemplate(template)}
                className="w-full border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-200 transition hover:border-emerald-300/50 hover:bg-emerald-300/10"
              >
                {template}
              </button>
            ))}
          </div>

          {session?.analyses && session.analyses.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Analysis history
              </p>
              <div className="mt-4 space-y-3">
                {session.analyses.slice(-5).reverse().map((analysis) => (
                  <div key={analysis._id} className="border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-sm font-medium text-white">{analysis.featureTitle}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                      {analysis.featureDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="px-5 py-8 sm:px-8 lg:px-10">
          <form onSubmit={handleSubmit} className="border-b border-white/10 pb-8">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
              <div>
                <label htmlFor="featureTitle" className="text-sm font-medium text-slate-300">
                  Feature title
                </label>
                <input
                  type="text"
                  id="featureTitle"
                  value={featureTitle}
                  onChange={(e) => setFeatureTitle(e.target.value)}
                  placeholder="Example: GitHub OAuth login"
                  className="mt-2 w-full border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-emerald-300"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="featureDescription"
                  className="text-sm font-medium text-slate-300"
                >
                  Feature description
                </label>
                <textarea
                  id="featureDescription"
                  value={featureDescription}
                  onChange={(e) => setFeatureDescription(e.target.value)}
                  placeholder="Describe the behavior, screens, APIs, edge cases, and what should be copied into your target repo."
                  className="mt-2 min-h-32 w-full border border-white/15 bg-[#0c1312] px-3 py-3 text-white outline-none transition focus:border-emerald-300"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 border border-red-300/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                className="bg-emerald-500 px-5 py-3 font-semibold text-[#08100f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                disabled={!canAnalyze}
              >
                {isLoading ? "Analyzing feature..." : "Generate migration plan"}
              </button>
              {result && (
                <button
                  type="button"
                  onClick={() => setShowChat((current) => !current)}
                  className="border border-white/15 px-5 py-3 font-semibold text-slate-100 transition hover:border-cyan-300 hover:bg-cyan-300/10"
                >
                  {showChat ? "Hide chat" : "Ask follow-up questions"}
                </button>
              )}
            </div>
          </form>

          {isLoading && (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {["Extracting source", "Checking target fit", "Building plan"].map((label) => (
                <div key={label} className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="h-2 w-24 animate-pulse bg-emerald-300/60" />
                  <p className="mt-4 text-sm text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          )}

          {result && selectedResult && (
            <div className="mt-8">
              <div className="grid gap-3 md:grid-cols-3">
                {resultTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`border px-4 py-4 text-left transition ${
                      activeTab === tab.key
                        ? "border-emerald-300 bg-emerald-300/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">{tab.label}</span>
                    <span className="mt-2 block text-xs leading-5 text-slate-300">
                      {tab.description}
                    </span>
                  </button>
                ))}
              </div>

              <article className="mt-6 border border-white/10 bg-white/[0.04] p-5 sm:p-7">
                <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">
                      {resultTabs.find((tab) => tab.key === activeTab)?.label}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      Review this output, then use chat to tighten the implementation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(selectedResult.message)}
                    className="border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-300 hover:bg-emerald-300/10"
                  >
                    Copy output
                  </button>
                </div>
                <div className="max-w-none text-slate-200">{formatMessage(selectedResult.message)}</div>
              </article>
            </div>
          )}

          {showChat && <Chat sessionId={sessionId} />}
        </section>
      </div>
    </main>
  );
}

function RepositoryMiniCard({
  label,
  repo,
  branch,
  sha,
}: {
  label: string;
  repo?: string;
  branch?: string;
  sha?: string;
}) {
  return (
    <div className="border border-white/10 bg-[#0c1312] p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-medium text-slate-100">{repo || "Unknown repo"}</p>
      <p className="mt-1 text-xs text-slate-400">
        {branch || "unknown branch"}
        {sha ? ` · ${sha.slice(0, 7)}` : ""}
      </p>
    </div>
  );
}
