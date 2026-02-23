"use client";

import {
  useAdminData,
  PageHeader,
  StatCard,
  LoadingState,
  ErrorState,
  Badge,
} from "../components";

interface TokenInfo {
  key: string;
  label: string;
  required: boolean;
  configured: boolean;
  maskedPreview: string | null;
  docsUrl?: string;
}

interface TokensData {
  tokens: TokenInfo[];
  configured: number;
  missing: number;
  requiredMissing: number;
}

export default function ApiTokensPage() {
  const { data, loading, error, refetch } = useAdminData<TokensData>("api-tokens");

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const requiredTokens = data.tokens.filter((t) => t.required);
  const optionalTokens = data.tokens.filter((t) => !t.required);

  return (
    <>
      <PageHeader
        title="API Tokens"
        description="Status of all configured API keys and secrets"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Configured" value={data.configured} />
        <StatCard label="Missing" value={data.missing} />
        <StatCard
          label="Required Missing"
          value={data.requiredMissing}
          sub={data.requiredMissing > 0 ? "Action needed" : "All good"}
        />
        <StatCard label="Total Keys" value={data.tokens.length} />
      </div>

      {data.requiredMissing > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8">
          <p className="text-red-400 text-sm font-medium">
            {data.requiredMissing} required key{data.requiredMissing > 1 ? "s" : ""} missing.
            Some features will not work until configured.
          </p>
        </div>
      )}

      <TokenSection title="Required" tokens={requiredTokens} />
      <TokenSection title="Optional" tokens={optionalTokens} />

      <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-xs text-white/30">
          Tokens are read from environment variables at runtime. To update them,
          modify your <code className="text-white/50">.env</code> file or your
          deployment platform&apos;s environment settings and restart the server.
        </p>
      </div>
    </>
  );
}

function TokenSection({ title, tokens }: { title: string; tokens: TokenInfo[] }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-white/60 mb-3">{title}</h2>
      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.key}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  token.configured ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">
                    {token.label}
                  </span>
                  <code className="text-[11px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                    {token.key}
                  </code>
                </div>
                {token.configured && token.maskedPreview && (
                  <p className="text-xs text-white/30 mt-1 font-mono">
                    {token.maskedPreview}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {token.docsUrl && (
                <a
                  href={token.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Docs
                </a>
              )}
              <Badge color={token.configured ? "green" : "red"}>
                {token.configured ? "Active" : "Missing"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
