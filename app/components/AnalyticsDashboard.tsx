"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Alert = {
  identifier?: string;
  severity?: string;
  severity_level?: string;
  severity_color?: string;
  disaster_type?: string;
  area_description?: string;
  warning_message?: string;
  effective_start_time?: string;
  effective_end_time?: string;
  alert_source?: string;
  centroid?: string;
};

type AlertResponse = {
  success?: boolean;
  count?: number;
  alerts?: Alert[];
  updatedAt?: string;
};

/* =========================================================
   SEVERITY HELPERS
========================================================= */

function getSeverity(alert: Alert) {
  return (
    alert.severity ||
    alert.severity_level ||
    "OTHER"
  ).toLowerCase();
}

function getSeverityGroup(alert: Alert) {
  const severity = getSeverity(alert);

  const color = (
    alert.severity_color || ""
  ).toLowerCase();

  if (
    severity.includes("critical") ||
    severity.includes("red") ||
    color.includes("red")
  ) {
    return "CRITICAL";
  }

  if (
    severity.includes("severe") ||
    severity.includes("orange") ||
    color.includes("orange")
  ) {
    return "SEVERE";
  }

  if (
    severity.includes("moderate") ||
    severity.includes("yellow") ||
    color.includes("yellow")
  ) {
    return "MODERATE";
  }

  return "OTHER";
}

function getHazardName(alert: Alert) {
  return (
    alert.disaster_type ||
    "Other"
  ).trim();
}

/* =========================================================
   DATE FORMAT
========================================================= */

function formatUpdatedAt(value: string) {
  if (!value) {
    return "Waiting for data...";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function AnalyticsDashboard() {
  const [alerts, setAlerts] =
    useState<Alert[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [updatedAt, setUpdatedAt] =
    useState("");

  /* =======================================================
     LOAD LIVE ANALYTICS DATA
  ======================================================= */

  async function loadAnalytics(
    manual = false
  ) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        "/api/alerts",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Analytics API error: ${response.status}`
        );
      }

      const data: AlertResponse =
        await response.json();

      if (!data.success) {
        throw new Error(
          "Alert API returned unsuccessful response."
        );
      }

      setAlerts(
        Array.isArray(data.alerts)
          ? data.alerts
          : []
      );

      setUpdatedAt(
        data.updatedAt || ""
      );
    } catch (error) {
      console.error(
        "Analytics loading error:",
        error
      );

      setError(
        "Unable to load live analytics from NDMA SACHET."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =======================================================
     INITIAL LOAD + AUTO REFRESH
  ======================================================= */

 useEffect(() => {
  const initialLoad = setTimeout(() => {
    loadAnalytics();
  }, 0);

  const interval = setInterval(() => {
    loadAnalytics();
  }, 5 * 60 * 1000);

  return () => {
    clearTimeout(initialLoad);
    clearInterval(interval);
  };
}, []);

  /* =======================================================
     SEVERITY ANALYTICS
  ======================================================= */

  const severityData = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      SEVERE: 0,
      MODERATE: 0,
      OTHER: 0,
    };

    alerts.forEach(
      (alert) => {
        const group =
          getSeverityGroup(alert);

        counts[group]++;
      }
    );

    return [
      {
        name: "Critical",
        value: counts.CRITICAL,
      },
      {
        name: "Severe",
        value: counts.SEVERE,
      },
      {
        name: "Moderate",
        value: counts.MODERATE,
      },
      {
        name: "Other",
        value: counts.OTHER,
      },
    ];
  }, [alerts]);

  /* =======================================================
     HAZARD ANALYTICS
  ======================================================= */

  const hazardData = useMemo(() => {
    const counts: Record<
      string,
      number
    > = {};

    alerts.forEach(
      (alert) => {
        const hazard =
          getHazardName(alert);

        counts[hazard] =
          (counts[hazard] || 0) + 1;
      }
    );

    return Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 10)
      .map(
        ([name, value]) => ({
          name,
          value,
        })
      );
  }, [alerts]);

  /* =======================================================
     SUMMARY COUNTS
  ======================================================= */

  const criticalCount =
    severityData.find(
      (item) =>
        item.name === "Critical"
    )?.value || 0;

  const severeCount =
    severityData.find(
      (item) =>
        item.name === "Severe"
    )?.value || 0;

  const moderateCount =
    severityData.find(
      (item) =>
        item.name === "Moderate"
    )?.value || 0;

  const otherCount =
    severityData.find(
      (item) =>
        item.name === "Other"
    )?.value || 0;

  /* =======================================================
     TOTAL HAZARD TYPES
  ======================================================= */

  const hazardTypeCount =
    hazardData.length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl md:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <div className="flex flex-wrap items-center gap-3">

            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Emergency Analytics
            </h2>

            <span className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">

              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

              LIVE

            </span>

          </div>

          <p className="mt-2 text-sm text-slate-500">
            Real-time analytics calculated from
            official NDMA SACHET alert data.
          </p>

        </div>

        <button
          onClick={() =>
            loadAnalytics(true)
          }
          disabled={
            loading ||
            refreshing
          }
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh Analytics"}
        </button>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="font-semibold text-red-300">
                Analytics service unavailable
              </p>

              <p className="mt-1 text-xs text-red-400/80">
                {error}
              </p>

            </div>

            <button
              onClick={() =>
                loadAnalytics(true)
              }
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Try Again
            </button>

          </div>

        </div>
      )}

      {/* =================================================
          LIVE DATA STATUS
      ================================================= */}

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-4">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

            </span>

            <div>

              <p className="text-sm font-semibold text-green-400">
                Live Data Connected
              </p>

              <p className="text-xs text-slate-600">
                Source: NDMA SACHET
              </p>

            </div>

          </div>

          <div className="text-left sm:text-right">

            <p className="text-xs text-slate-600">
              Last update
            </p>

            <p className="text-sm font-semibold text-slate-300">
              {formatUpdatedAt(
                updatedAt
              )}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* TOTAL */}

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

          <div className="flex items-center justify-between">

            <span className="text-2xl">
              🚨
            </span>

            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              Total
            </span>

          </div>

          <p className="mt-4 text-sm text-slate-500">
            Official Alerts
          </p>

          <p className="mt-1 text-4xl font-black text-white">
            {loading
              ? "..."
              : alerts.length}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            NDMA SACHET
          </p>

        </div>

        {/* CRITICAL */}

        <div className="rounded-2xl border border-red-500/20 bg-slate-950 p-5">

          <div className="flex items-center justify-between">

            <span className="text-2xl">
              🔴
            </span>

            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500">
              Red
            </span>

          </div>

          <p className="mt-4 text-sm text-slate-500">
            Critical
          </p>

          <p className="mt-1 text-4xl font-black text-red-400">
            {loading
              ? "..."
              : criticalCount}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            Official severity
          </p>

        </div>

        {/* SEVERE */}

        <div className="rounded-2xl border border-orange-500/20 bg-slate-950 p-5">

          <div className="flex items-center justify-between">

            <span className="text-2xl">
              🟠
            </span>

            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
              Orange
            </span>

          </div>

          <p className="mt-4 text-sm text-slate-500">
            Severe
          </p>

          <p className="mt-1 text-4xl font-black text-orange-400">
            {loading
              ? "..."
              : severeCount}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            Official severity
          </p>

        </div>

        {/* MODERATE */}

        <div className="rounded-2xl border border-yellow-500/20 bg-slate-950 p-5">

          <div className="flex items-center justify-between">

            <span className="text-2xl">
              🟡
            </span>

            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">
              Yellow
            </span>

          </div>

          <p className="mt-4 text-sm text-slate-500">
            Moderate
          </p>

          <p className="mt-1 text-4xl font-black text-yellow-400">
            {loading
              ? "..."
              : moderateCount}
          </p>

          <p className="mt-2 text-xs text-slate-600">
            Official severity
          </p>

        </div>

      </div>

      {/* =================================================
          SECONDARY STATS
      ================================================= */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-400">
                Other Alerts
              </p>

              <p className="mt-1 text-3xl font-bold text-blue-400">
                {loading
                  ? "..."
                  : otherCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-xl">
              🔵
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-slate-400">
                Hazard Categories
              </p>

              <p className="mt-1 text-3xl font-bold text-purple-400">
                {loading
                  ? "..."
                  : hazardTypeCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-xl">
              ⚠️
            </div>

          </div>

        </div>

      </div>

      {/* =================================================
          CHART GRID
      ================================================= */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* =================================================
            SEVERITY DISTRIBUTION
        ================================================= */}

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

          <div className="mb-4">

            <h3 className="font-bold text-white">
              Alert Severity Distribution
            </h3>

            <p className="mt-1 text-xs text-slate-600">
              Distribution of current official alerts
            </p>

          </div>

          <div className="h-[320px]">

            {loading ? (

              <div className="flex h-full items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

                  <p className="text-sm text-slate-600">
                    Loading analytics...
                  </p>

                </div>

              </div>

            ) : severityData.some(
                (item) =>
                  item.value > 0
              ) ? (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={105}
                    innerRadius={62}
                    paddingAngle={3}
                    label
                  >

                    <Cell fill="#ef4444" />
                    <Cell fill="#f97316" />
                    <Cell fill="#eab308" />
                    <Cell fill="#3b82f6" />

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        "#020617",
                      border:
                        "1px solid #334155",
                      borderRadius:
                        "12px",
                      color: "#ffffff",
                    }}
                  />

                </PieChart>

              </ResponsiveContainer>

            ) : (

              <div className="flex h-full items-center justify-center text-sm text-slate-600">
                No alert data available
              </div>

            )}

          </div>

          {/* LEGEND */}

          <div className="grid grid-cols-2 gap-3 text-xs">

            <div className="flex items-center gap-2 text-slate-400">

              <span className="h-3 w-3 rounded-full bg-red-500" />

              Critical

            </div>

            <div className="flex items-center gap-2 text-slate-400">

              <span className="h-3 w-3 rounded-full bg-orange-500" />

              Severe

            </div>

            <div className="flex items-center gap-2 text-slate-400">

              <span className="h-3 w-3 rounded-full bg-yellow-500" />

              Moderate

            </div>

            <div className="flex items-center gap-2 text-slate-400">

              <span className="h-3 w-3 rounded-full bg-blue-500" />

              Other

            </div>

          </div>

        </div>

        {/* =================================================
            HAZARD DISTRIBUTION
        ================================================= */}

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

          <div className="mb-5">

            <h3 className="font-bold text-white">
              Hazard Distribution
            </h3>

            <p className="mt-1 text-xs text-slate-600">
              Most frequent official alert categories
            </p>

          </div>

          {loading ? (

            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

                <p className="text-sm text-slate-600">
                  Loading hazards...
                </p>

              </div>

            </div>

          ) : hazardData.length > 0 ? (

            <div className="space-y-5">

              {hazardData.map(
                (hazard, index) => {

                  const maximum =
                    hazardData[0]
                      ?.value || 1;

                  const percentage =
                    (hazard.value /
                      maximum) *
                    100;

                  return (
                    <div
                      key={`${hazard.name}-${index}`}
                    >

                      <div className="mb-2 flex items-center justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-2">

                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold text-slate-500">
                            {index + 1}
                          </span>

                          <span className="truncate text-sm text-slate-300">
                            {hazard.name}
                          </span>

                        </div>

                        <span className="shrink-0 text-sm font-bold text-white">
                          {hazard.value}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          ) : (

            <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-600">
              No hazard data available
            </div>

          )}

        </div>

      </div>

      {/* =================================================
          DATA INFORMATION
      ================================================= */}

      <div className="mt-6 grid gap-4 md:grid-cols-3">

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Data Source
          </p>

          <p className="mt-2 text-sm font-semibold text-red-300">
            NDMA SACHET
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Refresh
          </p>

          <p className="mt-2 text-sm font-semibold text-blue-300">
            Every 5 minutes
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Data Status
          </p>

          <p className="mt-2 text-sm font-semibold text-green-300">
            Live Connected
          </p>

        </div>

      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-6 flex flex-col gap-2 border-t border-slate-800 pt-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">

        <span>
          Analytics calculated from live NDMA SACHET data
        </span>

        <span>
          {updatedAt
            ? `Updated: ${formatUpdatedAt(
                updatedAt
              )}`
            : "Waiting for data..."}
        </span>

      </div>

    </section>
  );
}