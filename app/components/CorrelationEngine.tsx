"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Flame,
  RefreshCw,
  ShieldAlert,
  Wind,
} from "lucide-react";

type Correlation = {
  id: string;
  state: string;
  level: "CRITICAL" | "HIGH" | "MODERATE";
  score: number;
  hazards: string[];
  signals: string[];
  explanation: string;
  recommendation: string;
};

type CorrelationResponse = {
  success: boolean;
  generatedAt?: string;
  summary?: {
    totalCorrelations: number;
    critical: number;
    high: number;
    moderate: number;
  };
  correlations?: Correlation[];
  methodology?: {
    type: string;
    inputs: string[];
    disclaimer: string;
  };
  error?: string;
};

function levelClasses(level: Correlation["level"]) {
  if (level === "CRITICAL") {
    return {
      border: "border-red-500/40",
      bg: "bg-red-500/10",
      text: "text-red-300",
      badge: "bg-red-500/15 text-red-300",
    };
  }

  if (level === "HIGH") {
    return {
      border: "border-orange-500/40",
      bg: "bg-orange-500/10",
      text: "text-orange-300",
      badge: "bg-orange-500/15 text-orange-300",
    };
  }

  return {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
    text: "text-yellow-300",
    badge: "bg-yellow-500/15 text-yellow-300",
  };
}

function hazardIcon(hazard: string) {
  const value = hazard.toLowerCase();

  if (
    value.includes("rain") ||
    value.includes("flood")
  ) {
    return <CloudRain className="h-4 w-4" />;
  }

  if (
    value.includes("wind") ||
    value.includes("storm") ||
    value.includes("cyclone")
  ) {
    return <Wind className="h-4 w-4" />;
  }

  if (value.includes("heat")) {
    return <Flame className="h-4 w-4" />;
  }

  if (
    value.includes("earthquake") ||
    value.includes("landslide")
  ) {
    return <AlertTriangle className="h-4 w-4" />;
  }

  return <ShieldAlert className="h-4 w-4" />;
}

export default function CorrelationEngine() {
  const [data, setData] =
    useState<CorrelationResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [expanded, setExpanded] =
    useState<string | null>(null);

  async function loadCorrelation() {
    try {
      setError("");

      const response = await fetch(
        "/api/correlation",
        {
          cache: "no-store",
        }
      );

      const result: CorrelationResponse =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Unable to load correlation data"
        );
      }

      setData(result);
    } catch (err) {
      console.error(
        "Correlation UI error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load correlation data"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCorrelation();
    }, 0);

    const interval =
      window.setInterval(() => {
        loadCorrelation();
      }, 5 * 60 * 1000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  const correlations = useMemo(
    () =>
      [...(data?.correlations || [])].sort(
        (a, b) => b.score - a.score
      ),
    [data]
  );

  const summary = data?.summary;

  return (
    <section className="mt-8 rounded-3xl border border-slate-800 bg-[#090d14] p-6 shadow-2xl">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
              <Brain className="h-5 w-5 text-violet-300" />
            </div>

            <div>
              <p className="text-xs font-medium tracking-[0.3em] text-violet-400">
                ADVANCED INTELLIGENCE
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                Emergency Correlation Engine
              </h2>
            </div>
          </div>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Combines official emergency alerts and
            live weather signals to identify
            potentially connected emergency patterns.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCorrelation}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 transition hover:border-violet-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* SUMMARY */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Correlations
            </p>

            <Activity className="h-4 w-4 text-slate-500" />
          </div>

          <p className="mt-3 text-3xl font-bold">
            {loading
              ? "—"
              : summary?.totalCorrelations ?? 0}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            detected patterns
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <p className="text-xs uppercase tracking-wider text-red-400">
            Critical
          </p>

          <p className="mt-3 text-3xl font-bold text-red-300">
            {loading
              ? "—"
              : summary?.critical ?? 0}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            highest priority patterns
          </p>
        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
          <p className="text-xs uppercase tracking-wider text-orange-400">
            High
          </p>

          <p className="mt-3 text-3xl font-bold text-orange-300">
            {loading
              ? "—"
              : summary?.high ?? 0}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            elevated patterns
          </p>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <p className="text-xs uppercase tracking-wider text-yellow-400">
            Moderate
          </p>

          <p className="mt-3 text-3xl font-bold text-yellow-300">
            {loading
              ? "—"
              : summary?.moderate ?? 0}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            monitoring patterns
          </p>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-violet-400" />

          <p className="mt-3 text-sm text-slate-400">
            Analyzing live emergency signals...
          </p>
        </div>
      )}

      {/* EMPTY */}
      {!loading &&
        !error &&
        correlations.length === 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-slate-600" />

            <p className="mt-3 font-medium text-slate-300">
              No significant correlations detected
            </p>

            <p className="mt-1 text-sm text-slate-500">
              The engine will continue monitoring
              incoming official alerts and weather
              signals.
            </p>
          </div>
        )}

      {/* CORRELATION LIST */}
      {!loading &&
        correlations.length > 0 && (
          <div className="mt-6 space-y-3">
            {correlations.map(
              (correlation, index) => {
                const classes =
                  levelClasses(
                    correlation.level
                  );

                const isExpanded =
                  expanded ===
                  correlation.id;

                return (
                  <div
                    key={correlation.id}
                    className={`overflow-hidden rounded-2xl border ${classes.border} bg-slate-950/60`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(
                          isExpanded
                            ? null
                            : correlation.id
                        )
                      }
                      className="w-full px-5 py-5 text-left transition hover:bg-slate-900/60"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.bg} ${classes.text}`}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {correlation.state}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${classes.badge}`}
                              >
                                {correlation.level}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-400">
                              {correlation.explanation}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {correlation.hazards.map(
                                (hazard) => (
                                  <span
                                    key={hazard}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300"
                                  >
                                    {hazardIcon(
                                      hazard
                                    )}
                                    {hazard}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-5 lg:pl-6">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500">
                              Correlation score
                            </p>

                            <p
                              className={`mt-1 text-2xl font-bold ${classes.text}`}
                            >
                              {correlation.score}
                            </p>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 px-5 py-5">
                        <div className="grid gap-5 lg:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Detected signals
                            </p>

                            <div className="mt-3 space-y-2">
                              {correlation.signals.map(
                                (signal) => (
                                  <div
                                    key={signal}
                                    className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300"
                                  >
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                                    <span>
                                      {signal}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Operational recommendation
                            </p>

                            <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                              <div className="flex gap-3">
                                <Brain className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />

                                <p className="text-sm leading-6 text-slate-300">
                                  {
                                    correlation.recommendation
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                              <p className="text-xs leading-5 text-slate-500">
                                This is an analytical
                                correlation generated
                                from available data. It
                                is not an official
                                government warning.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

      {/* FOOTER */}
      <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>
          Sources: NDMA SACHET + Open-Meteo
        </p>

        <p>
          Rule-based multi-signal intelligence
        </p>
      </div>
    </section>
  );
}