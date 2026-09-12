"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";

type Priority = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

type Hazard = {
  hazard: string;
  count: number;
};

type AttentionState = {
  state: string;
  score: number;
  level: Priority;
  reasons: string[];
};

type AnalystData = {
  success: boolean;
  generatedAt?: string;
  overallLevel?: Priority;
  situation?: string;

  officialAlerts?: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };

  weather?: {
    monitoredLocations: number;
    elevatedRiskLocations: number;
  };

  topHazards?: Hazard[];

  attentionStates?: AttentionState[];

  correlationSignals?: string[];

  recommendations?: string[];

  confidence?: number;

  disclaimer?: string;

  error?: string;
};

function priorityClasses(priority: Priority) {
  switch (priority) {
    case "CRITICAL":
      return {
        badge:
          "border-red-500/40 bg-red-500/10 text-red-300",
        glow: "shadow-red-950/20",
        dot: "bg-red-400",
      };

    case "HIGH":
      return {
        badge:
          "border-orange-500/40 bg-orange-500/10 text-orange-300",
        glow: "shadow-orange-950/20",
        dot: "bg-orange-400",
      };

    case "MODERATE":
      return {
        badge:
          "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
        glow: "shadow-yellow-950/20",
        dot: "bg-yellow-400",
      };

    default:
      return {
        badge:
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        glow: "shadow-emerald-950/20",
        dot: "bg-emerald-400",
      };
  }
}

function formatTime(value?: string) {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EmergencyAnalyst() {
  const [data, setData] = useState<AnalystData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalyst() {
    try {
      setError("");

      const response = await fetch("/api/analyst", {
        cache: "no-store",
      });

      const result =
        (await response.json()) as AnalystData;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to load analyst"
        );
      }

      setData(result);
    } catch (err) {
      console.error("Analyst error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analyst"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadAnalyst();
  }

 useEffect(() => {
  const timer = window.setTimeout(() => {
    loadAnalyst();
  }, 0);

  const interval = window.setInterval(() => {
    loadAnalyst();
  }, 5 * 60 * 1000);

  return () => {
    window.clearTimeout(timer);
    window.clearInterval(interval);
  };
}, []);

  if (loading) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-800 bg-[#090d14] p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-red-400" />

          <div>
            <p className="text-xs font-medium tracking-[0.3em] text-red-400">
              AI INTELLIGENCE
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Emergency Analyst
            </h2>
          </div>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Processing live emergency intelligence...
        </p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mt-8 rounded-3xl border border-red-500/20 bg-[#090d14] p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-medium tracking-[0.3em] text-red-400">
              AI INTELLIGENCE
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Emergency Analyst
            </h2>

            <p className="mt-3 text-sm text-slate-400">
              {error || "Unable to load analyst"}
            </p>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />

              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const overallLevel = data.overallLevel || "LOW";

  const priorityStyle =
    priorityClasses(overallLevel);

  const officialAlerts = data.officialAlerts || {
    total: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };

  const weather = data.weather || {
    monitoredLocations: 0,
    elevatedRiskLocations: 0,
  };

  const topHazards = data.topHazards || [];

  const attentionStates =
    data.attentionStates || [];

  const correlationSignals =
    data.correlationSignals || [];

  const recommendations =
    data.recommendations || [];

  const confidence = data.confidence ?? 0;

  return (
    <section className="mt-8 rounded-3xl border border-slate-800 bg-[#090d14] shadow-xl">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <Brain className="h-6 w-6 text-red-400" />
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.3em] text-red-400">
              AI INTELLIGENCE
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Emergency Analyst
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Live correlation of official alerts and
              environmental signals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            ANALYST ONLINE
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            title="Refresh analyst"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* CURRENT SITUATION */}
        <div
          className={`rounded-2xl border border-slate-800 bg-slate-950/60 p-5 shadow-xl ${priorityStyle.glow}`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-slate-500" />

                <p className="text-xs font-medium tracking-[0.25em] text-slate-500">
                  CURRENT SITUATION
                </p>
              </div>

              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-300">
                {data.situation ||
                  "No current situation summary available."}
              </p>
            </div>

            <div
              className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold ${priorityStyle.badge}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${priorityStyle.dot}`}
              />

              {overallLevel}
            </div>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Official Alerts
              </span>

              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {officialAlerts.total}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              NDMA SACHET
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Critical
              </span>

              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <p className="mt-3 text-3xl font-bold text-red-300">
              {officialAlerts.critical}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Priority review
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Weather Locations
              </span>

              <TrendingUp className="h-5 w-5 text-sky-400" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {weather.monitoredLocations}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Live monitored
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Confidence
              </span>

              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

            <p className="mt-3 text-3xl font-bold">
              {confidence}%
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Analytical confidence
            </p>
          </div>
        </div>

        {/* CORRELATION SIGNALS */}
        {correlationSignals.length > 0 && (
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-300" />
              </div>

              <div>
                <p className="text-xs font-medium tracking-[0.25em] text-purple-300">
                  CORRELATION ENGINE
                </p>

                <h3 className="mt-1 text-lg font-semibold">
                  Cross-signal intelligence
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {correlationSignals.map(
                (signal, index) => (
                  <div
                    key={`${signal}-${index}`}
                    className="rounded-xl border border-purple-500/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300"
                  >
                    <span className="mr-2 text-purple-400">
                      ●
                    </span>

                    {signal}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ATTENTION STATES */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.25em] text-slate-500">
                PRIORITY GEOGRAPHY
              </p>

              <h3 className="mt-1 text-xl font-bold">
                States requiring attention
              </h3>
            </div>

            <span className="text-xs text-slate-500">
              Dashboard-derived
            </span>
          </div>

          {attentionStates.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
              No state-level attention signals available.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {attentionStates.map(
                (state, index) => {
                  const style =
                    priorityClasses(state.level);

                  return (
                    <div
                      key={`${state.state}-${index}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-white">
                            {state.state}
                          </h4>

                          <p className="mt-1 text-xs text-slate-500">
                            Intelligence score:{" "}
                            {Math.round(state.score)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${style.badge}`}
                        >
                          {state.level}
                        </span>
                      </div>

                      {state.reasons.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {state.reasons
                            .slice(0, 3)
                            .map(
                              (reason, reasonIndex) => (
                                <p
                                  key={`${reason}-${reasonIndex}`}
                                  className="text-xs leading-5 text-slate-400"
                                >
                                  • {reason}
                                </p>
                              )
                            )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* TOP HAZARDS */}
        <div>
          <div className="mb-4">
            <p className="text-xs font-medium tracking-[0.25em] text-slate-500">
              HAZARD INTELLIGENCE
            </p>

            <h3 className="mt-1 text-xl font-bold">
              Most active official hazards
            </h3>
          </div>

          {topHazards.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-500">
              No hazard data available.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topHazards.map(
                (item, index) => (
                  <div
                    key={`${item.hazard}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-sm font-bold text-red-300">
                        {index + 1}
                      </div>

                      <span className="text-sm font-medium text-slate-200">
                        {item.hazard}
                      </span>
                    </div>

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {item.count}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* RECOMMENDATIONS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <p className="text-xs font-medium tracking-[0.25em] text-emerald-400">
                DECISION SUPPORT
              </p>

              <h3 className="mt-1 text-lg font-semibold">
                Recommended actions
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recommendations.map(
              (recommendation, index) => (
                <div
                  key={`${recommendation}-${index}`}
                  className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3"
                >
                  <span className="mt-0.5 text-emerald-400">
                    {index + 1}.
                  </span>

                  <p className="text-sm leading-6 text-slate-300">
                    {recommendation}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />

            <span>
              Updated: {formatTime(data.generatedAt)}
            </span>
          </div>

          <p className="max-w-3xl leading-5 md:text-right">
            {data.disclaimer ||
              "AI analysis is decision support only and does not replace official emergency warnings."}
          </p>
        </div>
      </div>
    </section>
  );
}