"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Server,
  TriangleAlert,
  XCircle,
} from "lucide-react";

type Service = {
  name: string;
  status: "UP" | "DOWN";
  responseTimeMs: number | null;
  message: string;
};

type HealthData = {
  success: boolean;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  healthyServices: number;
  totalServices: number;
  responseTimeMs: number | null;
  checkedAt: string;
  services: Service[];
  error?: string;
};

function statusClasses(
  status: HealthData["status"]
) {
  if (status === "OPERATIONAL") {
    return {
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
    };
  }

  if (status === "DEGRADED") {
    return {
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/10",
      text: "text-yellow-300",
    };
  }

  return {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    text: "text-red-300",
  };
}

function ServiceIcon({
  status,
}: {
  status: Service["status"];
}) {
  if (status === "UP") {
    return (
      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
    );
  }

  return (
    <XCircle className="h-5 w-5 text-red-400" />
  );
}

export default function SystemHealth() {
  const [data, setData] =
    useState<HealthData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadHealth() {
    try {
      setError("");

      const response = await fetch(
        "/api-health",
        {
          cache: "no-store",
        }
      );

      const result: HealthData =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to load system health"
        );
      }

      setData(result);
    } catch (err) {
      console.error(
        "System health error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load system health"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadHealth();
    }, 0);

    const interval =
      window.setInterval(() => {
        loadHealth();
      }, 60 * 1000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  const currentStatus =
    data?.status || "OUTAGE";

  const classes =
    statusClasses(currentStatus);

  return (
    <section className="mt-8 rounded-3xl border border-slate-800 bg-[#090d14] p-6 shadow-2xl">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
            <Server className="h-5 w-5 text-cyan-300" />
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.3em] text-cyan-400">
              PLATFORM MONITORING
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              System Health
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={loadHealth}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* OVERALL STATUS */}
      <div
        className={`mt-6 rounded-2xl border ${classes.border} ${classes.bg} p-5`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {currentStatus ===
              "OPERATIONAL" && (
              <CheckCircle2
                className={`h-6 w-6 ${classes.text}`}
              />
            )}

            {currentStatus ===
              "DEGRADED" && (
              <TriangleAlert
                className={`h-6 w-6 ${classes.text}`}
              />
            )}

            {currentStatus === "OUTAGE" && (
              <XCircle
                className={`h-6 w-6 ${classes.text}`}
              />
            )}

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Overall platform status
              </p>

              <p
                className={`mt-1 text-xl font-bold ${classes.text}`}
              >
                {loading
                  ? "CHECKING..."
                  : currentStatus}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs text-slate-500">
              Healthy services
            </p>

            <p className="mt-1 text-2xl font-bold">
              {data?.healthyServices ?? 0}
              <span className="text-slate-600">
                /
              </span>
              {data?.totalServices ?? 3}
            </p>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* SERVICES */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {(data?.services || []).map(
          (service) => (
            <div
              key={service.name}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ServiceIcon
                    status={service.status}
                  />

                  <div>
                    <h3 className="font-semibold">
                      {service.name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {service.status === "UP"
                        ? "Service available"
                        : "Service unavailable"}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                    service.status === "UP"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-red-500/10 text-red-300"
                  }`}
                >
                  {service.status}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />

                Response time:

                <span className="text-slate-300">
                  {service.responseTimeMs !==
                  null
                    ? `${service.responseTimeMs} ms`
                    : "—"}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {service.message}
              </p>
            </div>
          )
        )}
      </div>

      {/* EMPTY / LOADING */}
      {loading &&
        (data?.services?.length ?? 0) ===
          0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-400" />

            <p className="mt-3 text-sm text-slate-400">
              Checking platform services...
            </p>
          </div>
        )}

      {/* METRICS */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
            <Activity className="h-4 w-4" />
            Health check latency
          </div>

          <p className="mt-2 text-xl font-bold">
            {data?.responseTimeMs !== null &&
            data?.responseTimeMs !== undefined
              ? `${data.responseTimeMs} ms`
              : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
            <Clock3 className="h-4 w-4" />
            Last checked
          </div>

          <p className="mt-2 text-sm font-medium text-slate-300">
            {data?.checkedAt
              ? new Date(
                  data.checkedAt
                ).toLocaleTimeString()
              : "—"}
          </p>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="mt-6 border-t border-slate-800 pt-5">
        <p className="text-xs leading-5 text-slate-500">
          System health indicates whether dashboard
          services are responding. A healthy service
          does not guarantee the accuracy or completeness
          of external emergency data.
        </p>
      </div>
    </section>
  );
}