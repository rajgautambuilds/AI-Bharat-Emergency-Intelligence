"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";

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
  disseminated?: string | boolean;
  area_covered?: string;
};

type AlertResponse = {
  success?: boolean;
  count?: number;
  alerts?: Alert[];
  updatedAt?: string;
};

type SortOption = "LATEST" | "SEVERITY" | "HAZARD";

type StatusOption =
  | "ALL"
  | "ACTIVE"
  | "UPCOMING"
  | "EXPIRED";

type HistoricalPeriod = "7D" | "14D" | "30D" | "ALL";

/* =========================================================
   SEVERITY HELPERS
========================================================= */

function getSeverity(alert: Alert) {
  return (
    alert.severity ||
    alert.severity_level ||
    "Unknown"
  ).toLowerCase();
}

function getSeverityLabel(alert: Alert) {
  return (
    alert.severity ||
    alert.severity_level ||
    "Unknown"
  );
}

function getSeverityColor(alert: Alert) {
  const severity = getSeverity(alert);

  const color = (
    alert.severity_color || ""
  ).toLowerCase();

  if (
    severity.includes("critical") ||
    severity.includes("red") ||
    color.includes("red")
  ) {
    return {
      badge:
        "border-red-500/40 bg-red-500/10 text-red-300",
      dot: "bg-red-500",
      text: "text-red-400",
      glow: "shadow-red-500/10",
    };
  }

  if (
    severity.includes("severe") ||
    severity.includes("orange") ||
    color.includes("orange")
  ) {
    return {
      badge:
        "border-orange-500/40 bg-orange-500/10 text-orange-300",
      dot: "bg-orange-500",
      text: "text-orange-400",
      glow: "shadow-orange-500/10",
    };
  }

  if (
    severity.includes("moderate") ||
    severity.includes("yellow") ||
    color.includes("yellow")
  ) {
    return {
      badge:
        "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
      dot: "bg-yellow-500",
      text: "text-yellow-400",
      glow: "shadow-yellow-500/10",
    };
  }

  return {
    badge:
      "border-blue-500/40 bg-blue-500/10 text-blue-300",
    dot: "bg-blue-500",
    text: "text-blue-400",
    glow: "shadow-blue-500/10",
  };
}

function severityRank(alert: Alert) {
  const severity = getSeverity(alert);

  const color = (
    alert.severity_color || ""
  ).toLowerCase();

  if (
    severity.includes("critical") ||
    severity.includes("red") ||
    color.includes("red")
  ) {
    return 4;
  }

  if (
    severity.includes("severe") ||
    severity.includes("orange") ||
    color.includes("orange")
  ) {
    return 3;
  }

  if (
    severity.includes("moderate") ||
    severity.includes("yellow") ||
    color.includes("yellow")
  ) {
    return 2;
  }

  return 1;
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

/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getRelativeTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(
    Math.abs(diff) / 60000
  );

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ${
      diff >= 0 ? "ago" : "from now"
    }`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ${
      diff >= 0 ? "ago" : "from now"
    }`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${
    days === 1 ? "" : "s"
  } ${diff >= 0 ? "ago" : "from now"}`;
}

/* =========================================================
   STATUS
========================================================= */

function getAlertStatus(
  alert: Alert
): StatusOption {
  const now = Date.now();

  const start = alert.effective_start_time
    ? new Date(
        alert.effective_start_time
      ).getTime()
    : null;

  const end = alert.effective_end_time
    ? new Date(
        alert.effective_end_time
      ).getTime()
    : null;

  if (
    start !== null &&
    Number.isFinite(start) &&
    now < start
  ) {
    return "UPCOMING";
  }

  if (
    end !== null &&
    Number.isFinite(end) &&
    now > end
  ) {
    return "EXPIRED";
  }

  return "ACTIVE";
}

function getStatusStyle(
  status: StatusOption
) {
  if (status === "ACTIVE") {
    return {
      badge:
        "border-green-500/30 bg-green-500/10 text-green-400",
      dot: "bg-green-500",
    };
  }

  if (status === "UPCOMING") {
    return {
      badge:
        "border-blue-500/30 bg-blue-500/10 text-blue-400",
      dot: "bg-blue-500",
    };
  }

  return {
    badge:
      "border-slate-700 bg-slate-950 text-slate-500",
    dot: "bg-slate-600",
  };
}

/* =========================================================
   SEVERITY FILTER
========================================================= */

function matchesSeverity(
  alert: Alert,
  filter: string
) {
  if (filter === "ALL") {
    return true;
  }

  const severity = getSeverity(alert);

  const color = (
    alert.severity_color || ""
  ).toLowerCase();

  if (filter === "CRITICAL") {
    return (
      severity.includes("critical") ||
      severity.includes("red") ||
      color.includes("red")
    );
  }

  if (filter === "SEVERE") {
    return (
      severity.includes("severe") ||
      severity.includes("orange") ||
      color.includes("orange")
    );
  }

  if (filter === "MODERATE") {
    return (
      severity.includes("moderate") ||
      severity.includes("yellow") ||
      color.includes("yellow")
    );
  }

  if (filter === "OTHER") {
    return (
      !severity.includes("critical") &&
      !severity.includes("red") &&
      !severity.includes("severe") &&
      !severity.includes("orange") &&
      !severity.includes("moderate") &&
      !severity.includes("yellow") &&
      !color.includes("red") &&
      !color.includes("orange") &&
      !color.includes("yellow")
    );
  }

  return true;
}

/* =========================================================
   CENTROID
========================================================= */

function parseCentroid(
  centroid?: string
) {
  if (!centroid) {
    return null;
  }

  const parts = centroid
    .split(",")
    .map((value) =>
      Number(value.trim())
    );

  if (
    parts.length !== 2 ||
    !Number.isFinite(parts[0]) ||
    !Number.isFinite(parts[1])
  ) {
    return null;
  }

  return {
    longitude: parts[0],
    latitude: parts[1],
  };
}

/* =========================================================
   EMERGENCY TIMELINE
========================================================= */

function EmergencyTimeline({
  alerts,
  onSelect,
}: {
  alerts: Alert[];
  onSelect: (alert: Alert) => void;
}) {
  const timelineAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => {
        const severityDifference =
          severityRank(b) -
          severityRank(a);

        if (severityDifference !== 0) {
          return severityDifference;
        }

        const dateA =
          a.effective_start_time
            ? new Date(
                a.effective_start_time
              ).getTime()
            : 0;

        const dateB =
          b.effective_start_time
            ? new Date(
                b.effective_start_time
              ).getTime()
            : 0;

        return dateB - dateA;
      })
      .slice(0, 12);
  }, [alerts]);

  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl md:p-6">

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="flex flex-wrap items-center gap-3">

            <h2 className="text-2xl font-bold">
              Emergency Timeline
            </h2>

            <span className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">

              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

              LIVE

            </span>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            Highest-priority official alerts
            ordered by severity and effective time
          </p>

        </div>

        <div className="text-xs text-slate-600">
          Showing {timelineAlerts.length} priority events
        </div>

      </div>

      {timelineAlerts.length === 0 ? (

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center">

          <p className="text-sm text-slate-600">
            No timeline data available
          </p>

        </div>

      ) : (

        <div className="relative">

          <div className="absolute bottom-5 left-[11px] top-5 w-px bg-slate-800 md:left-[15px]" />

          <div className="space-y-5">

            {timelineAlerts.map(
              (alert, index) => {

                const colors =
                  getSeverityColor(alert);

                const status =
                  getAlertStatus(alert);

                const statusStyle =
                  getStatusStyle(status);

                const centroid =
                  parseCentroid(
                    alert.centroid
                  );

                return (

                  <div
                    key={
                      alert.identifier ||
                      `${alert.disaster_type}-${alert.area_description}-${index}`
                    }
                    className="relative pl-9 md:pl-12"
                  >

                    <div
                      className={`absolute left-0 top-5 flex h-6 w-6 items-center justify-center rounded-full border-4 border-slate-900 ${colors.dot} shadow-lg`}
                    />

                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-slate-600 hover:bg-slate-900">

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0 flex-1">

                          <div className="mb-3 flex flex-wrap items-center gap-2">

                            <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400">
                              🚨 OFFICIAL
                            </span>

                            <span
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colors.badge}`}
                            >
                              {getSeverityLabel(
                                alert
                              )}
                            </span>

                            <span
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}
                            >

                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot} ${
                                  status ===
                                  "ACTIVE"
                                    ? "animate-pulse"
                                    : ""
                                }`}
                              />

                              {status}

                            </span>

                          </div>

                          <h3 className="text-lg font-bold text-white">
                            {alert.disaster_type ||
                              "Emergency Alert"}
                          </h3>

                          <p className="mt-2 text-sm text-slate-400">
                            📍{" "}
                            {alert.area_description ||
                              "Area not available"}
                          </p>

                          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4">

                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                              Official Warning
                            </p>

                            <p className="text-sm leading-6 text-slate-400">
                              {alert.warning_message ||
                                "No warning message available."}
                            </p>

                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">

                            {centroid && (
                              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-500">
                                📍{" "}
                                {centroid.latitude.toFixed(
                                  3
                                )}
                                ,{" "}
                                {centroid.longitude.toFixed(
                                  3
                                )}
                              </span>
                            )}

                            <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-500">
                              Source:{" "}
                              {alert.alert_source ||
                                "NDMA SACHET"}
                            </span>

                          </div>

                        </div>

                        <div className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 lg:w-[250px]">

                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Effective From
                          </p>

                          <p className="mt-2 text-sm font-semibold text-slate-300">
                            {formatDate(
                              alert.effective_start_time
                            )}
                          </p>

                          <p className="mt-1 text-xs text-blue-400">
                            {getRelativeTime(
                              alert.effective_start_time
                            )}
                          </p>

                          <div className="my-4 border-t border-slate-800" />

                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Effective Until
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            {formatDate(
                              alert.effective_end_time
                            )}
                          </p>

                          <button
                            onClick={() =>
                              onSelect(alert)
                            }
                            className="mt-4 w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20 hover:text-white"
                          >
                            View Details →
                          </button>

                        </div>

                      </div>

                      <div className="mt-4 border-t border-slate-800 pt-3">

                        <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">

                          <span>
                            Timeline event #{index + 1}
                          </span>

                          {alert.identifier && (
                            <span className="max-w-full truncate font-mono">
                              ID:{" "}
                              {alert.identifier}
                            </span>
                          )}

                        </div>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>
      )}

    </section>
  );
}

/* =========================================================
   HISTORICAL ANALYTICS
========================================================= */

function HistoricalAnalytics({
  alerts,
}: {
  alerts: Alert[];
}) {
  const [period, setPeriod] =
    useState<HistoricalPeriod>("30D");

  const [now, setNow] =
    useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const validAlerts = useMemo(() => {
    return alerts
      .map((alert) => ({
        alert,
        date: alert.effective_start_time
          ? new Date(
              alert.effective_start_time
            )
          : null,
      }))
      .filter(
        (
          item
        ): item is {
          alert: Alert;
          date: Date;
        } =>
          item.date !== null &&
          Number.isFinite(
            item.date.getTime()
          )
      );
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (period === "ALL") {
      return validAlerts;
    }

    const days = Number(
      period.replace("D", "")
    );

    return validAlerts.filter(
      ({ date }) => {
        const age =
          now - date.getTime();

        return (
          age >= 0 &&
          age <
            days *
              24 *
              60 *
              60 *
              1000
        );
      }
    );
  }, [validAlerts, period, now]);

  const summary = useMemo(() => {
    const critical =
      filteredAlerts.filter(
        ({ alert }) =>
          getSeverityGroup(alert) ===
          "CRITICAL"
      ).length;

    const severe =
      filteredAlerts.filter(
        ({ alert }) =>
          getSeverityGroup(alert) ===
          "SEVERE"
      ).length;

    const moderate =
      filteredAlerts.filter(
        ({ alert }) =>
          getSeverityGroup(alert) ===
          "MODERATE"
      ).length;

    const other =
      filteredAlerts.filter(
        ({ alert }) =>
          getSeverityGroup(alert) ===
          "OTHER"
      ).length;

    const hazards = new Set(
      filteredAlerts.map(
        ({ alert }) =>
          alert.disaster_type?.trim() ||
          "Other"
      )
    ).size;

    const dates = new Set(
      filteredAlerts.map(
        ({ date }) =>
          date.toISOString().slice(0, 10)
      )
    ).size;

    return {
      total: filteredAlerts.length,
      critical,
      severe,
      moderate,
      other,
      hazards,
      dates,
    };
  }, [filteredAlerts]);

  const trendData = useMemo(() => {
    const grouped: Record<
      string,
      {
        date: Date;
        Critical: number;
        Severe: number;
        Moderate: number;
        Other: number;
      }
    > = {};

    filteredAlerts.forEach(
      ({ alert, date }) => {
        const key =
          date.toISOString().slice(0, 10);

        if (!grouped[key]) {
          grouped[key] = {
            date,
            Critical: 0,
            Severe: 0,
            Moderate: 0,
            Other: 0,
          };
        }

        const group =
          getSeverityGroup(alert);

        if (group === "CRITICAL") {
          grouped[key].Critical++;
        } else if (
          group === "SEVERE"
        ) {
          grouped[key].Severe++;
        } else if (
          group === "MODERATE"
        ) {
          grouped[key].Moderate++;
        } else {
          grouped[key].Other++;
        }
      }
    );

    return Object.values(grouped)
      .sort(
        (a, b) =>
          a.date.getTime() -
          b.date.getTime()
      )
      .map((item) => ({
        date: item.date.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
          }
        ),
        Critical: item.Critical,
        Severe: item.Severe,
        Moderate: item.Moderate,
        Other: item.Other,
      }));
  }, [filteredAlerts]);

  const severityDistribution =
    useMemo(() => {
      return [
        {
          name: "Critical",
          value: summary.critical,
        },
        {
          name: "Severe",
          value: summary.severe,
        },
        {
          name: "Moderate",
          value: summary.moderate,
        },
        {
          name: "Other",
          value: summary.other,
        },
      ].filter(
        (item) => item.value > 0
      );
    }, [summary]);

  const hazardDistribution =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      filteredAlerts.forEach(
        ({ alert }) => {
          const hazard =
            alert.disaster_type?.trim() ||
            "Other";

          counts[hazard] =
            (counts[hazard] || 0) + 1;
        }
      );

      return Object.entries(counts)
        .sort(
          (a, b) => b[1] - a[1]
        )
        .slice(0, 10)
        .map(
          ([name, value]) => ({
            name,
            value,
          })
        );
    }, [filteredAlerts]);

  const recentEvents = useMemo(() => {
    return [...filteredAlerts]
      .sort(
        (a, b) =>
          b.date.getTime() -
          a.date.getTime()
      )
      .slice(0, 8);
  }, [filteredAlerts]);

  return (
    <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl md:p-6">

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-xl">
              📊
            </div>

            <div>

              <h2 className="text-2xl font-bold">
                Historical Emergency Analytics
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Historical analysis of available
                official SACHET alerts
              </p>

            </div>

          </div>

        </div>

        {/* PERIOD */}

        <div className="flex flex-wrap gap-2">

          {(
            [
              "7D",
              "14D",
              "30D",
              "ALL",
            ] as HistoricalPeriod[]
          ).map((item) => (

            <button
              key={item}
              onClick={() =>
                setPeriod(item)
              }
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                period === item
                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                  : "border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500 hover:text-white"
              }`}
            >
              {item === "ALL"
                ? "All Data"
                : `Last ${item.replace(
                    "D",
                    " Days"
                  )}`}
            </button>

          ))}

        </div>

      </div>

      {/* DATA NOTICE */}

      <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">

        <div className="flex flex-wrap items-center gap-2 text-xs">

          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 font-bold text-blue-300">
            DATA-DRIVEN
          </span>

          <span className="text-slate-500">
            Analytics are calculated from
            alerts currently returned by
            the official SACHET feed.
            No artificial historical
            incidents are generated.
          </span>

        </div>

      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

          <p className="text-xs uppercase tracking-wider text-slate-600">
            Alerts Analyzed
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {summary.total}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Selected period
          </p>

        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

          <p className="text-xs uppercase tracking-wider text-red-400">
            Critical
          </p>

          <p className="mt-2 text-3xl font-bold text-red-400">
            {summary.critical}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Highest priority
          </p>

        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">

          <p className="text-xs uppercase tracking-wider text-orange-400">
            Severe
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-400">
            {summary.severe}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            High priority
          </p>

        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

          <p className="text-xs uppercase tracking-wider text-slate-600">
            Hazard Types
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {summary.hazards}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Distinct categories
          </p>

        </div>

      </div>

      {filteredAlerts.length === 0 ? (

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-12 text-center">

          <div className="text-4xl">
            📭
          </div>

          <h3 className="mt-3 font-semibold text-white">
            No historical data available
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            No valid alerts are available
            for this period.
          </p>

        </div>

      ) : (

        <>

          {/* TREND */}

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">

            <div className="mb-5">

              <h3 className="font-semibold">
                Emergency Alert Trend
              </h3>

              <p className="mt-1 text-xs text-slate-600">
                Alert volume by effective
                start date
              </p>

            </div>

            <div className="h-[340px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={trendData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    stroke="#64748b"
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#020617",
                      border:
                        "1px solid #334155",
                      borderRadius:
                        "12px",
                      color: "#fff",
                    }}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="Critical"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Severe"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Moderate"
                    stroke="#eab308"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="Other"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* DISTRIBUTION */}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">

            {/* SEVERITY */}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

              <div className="mb-4">

                <h3 className="font-semibold">
                  Historical Severity Distribution
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Severity of alerts in
                  selected period
                </p>

              </div>

              <div className="h-[320px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        severityDistribution
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      innerRadius={60}
                      paddingAngle={3}
                      label
                    >

                      {severityDistribution.map(
                        (entry) => (

                          <Cell
                            key={
                              entry.name
                            }
                            fill={
                              entry.name ===
                              "Critical"
                                ? "#ef4444"
                                : entry.name ===
                                  "Severe"
                                ? "#f97316"
                                : entry.name ===
                                  "Moderate"
                                ? "#eab308"
                                : "#3b82f6"
                            }
                          />

                        )
                      )}

                    </Pie>

                    <Tooltip
                      contentStyle={{
                        background:
                          "#020617",
                        border:
                          "1px solid #334155",
                        borderRadius:
                          "12px",
                      }}
                    />

                  </PieChart>

                </ResponsiveContainer>

              </div>

            </div>

            {/* HAZARD */}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

              <div className="mb-4">

                <h3 className="font-semibold">
                  Historical Hazard Distribution
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Top hazard categories
                </p>

              </div>

              <div className="h-[320px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      hazardDistribution
                    }
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 20,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                      stroke="#64748b"
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="#64748b"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        background:
                          "#020617",
                        border:
                          "1px solid #334155",
                        borderRadius:
                          "12px",
                      }}
                    />

                    <Bar
                      dataKey="value"
                      name="Alerts"
                      fill="#3b82f6"
                      radius={[
                        0,
                        6,
                        6,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            </div>

          </div>

          {/* RECENT HISTORICAL EVENTS */}

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">

            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h3 className="font-semibold">
                  Recent Historical Events
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Latest available events
                </p>

              </div>

              <span className="text-xs text-slate-600">
                Showing{" "}
                {recentEvents.length}
              </span>

            </div>

            <div className="space-y-3">

              {recentEvents.map(
                (
                  { alert, date },
                  index
                ) => {

                  const severity =
                    getSeverityGroup(
                      alert
                    );

                  const severityText =
                    severity ===
                    "CRITICAL"
                      ? "Critical"
                      : severity ===
                        "SEVERE"
                      ? "Severe"
                      : severity ===
                        "MODERATE"
                      ? "Moderate"
                      : "Other";

                  const severityClass =
                    severity ===
                    "CRITICAL"
                      ? "border-red-500/30 bg-red-500/10 text-red-400"
                      : severity ===
                        "SEVERE"
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                      : severity ===
                        "MODERATE"
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-400";

                  return (

                    <div
                      key={
                        alert.identifier ||
                        `${index}-${date.getTime()}`
                      }
                      className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                    >

                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${severityClass}`}
                            >
                              {severityText}
                            </span>

                            <span className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-slate-500">
                              {alert.disaster_type ||
                                "Other"}
                            </span>

                          </div>

                          <p className="mt-2 text-sm font-semibold text-white">
                            {alert.area_description ||
                              "Area not available"}
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {alert.warning_message ||
                              "No warning message available."}
                          </p>

                        </div>

                        <div className="shrink-0 md:text-right">

                          <p className="text-xs font-semibold text-slate-300">
                            {date.toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-600">
                            Effective start
                          </p>

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          </div>

        </>

      )}

      {/* FOOTER */}

      <div className="mt-6 flex flex-col gap-2 border-t border-slate-800 pt-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">

        <span>
          Source: NDMA SACHET
        </span>

        <span>
          {summary.dates} date groups analyzed
        </span>

      </div>

    </section>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AlertsPage() {
  const [alerts, setAlerts] =
    useState<Alert[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState<StatusOption>("ALL");

  const [hazardFilter, setHazardFilter] =
    useState("ALL");

  const [sortBy, setSortBy] =
    useState<SortOption>("SEVERITY");

  const [updatedAt, setUpdatedAt] =
    useState("");

  const [selectedAlert, setSelectedAlert] =
    useState<Alert | null>(null);

  const [copied, setCopied] =
    useState(false);

  const [showOnlyActive, setShowOnlyActive] =
    useState(false);

  /* =======================================================
     LOAD OFFICIAL ALERTS
  ======================================================= */

  async function loadAlerts(
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
          `API error: ${response.status}`
        );
      }

      const data: AlertResponse =
        await response.json();

      if (!data.success) {
        throw new Error(
          "Alert service returned an error."
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
        "Alert loading error:",
        error
      );

      setError(
        "Unable to connect to the official alert service."
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
  const timer = window.setTimeout(() => {
    loadAlerts();
  }, 0);

  const interval = window.setInterval(() => {
    loadAlerts();
  }, 5 * 60 * 1000);

  return () => {
    window.clearTimeout(timer);
    window.clearInterval(interval);
  };
}, []);
  /* =======================================================
     HAZARDS
  ======================================================= */

  const hazards = useMemo(() => {
    const values = alerts
      .map(
        (alert) =>
          alert.disaster_type?.trim()
      )
      .filter(
        (value): value is string =>
          Boolean(value)
      );

    return Array.from(
      new Set(values)
    ).sort();
  }, [alerts]);

  /* =======================================================
     SUMMARY COUNTS
  ======================================================= */

  const criticalCount =
    alerts.filter((alert) =>
      matchesSeverity(
        alert,
        "CRITICAL"
      )
    ).length;

  const severeCount =
    alerts.filter((alert) =>
      matchesSeverity(
        alert,
        "SEVERE"
      )
    ).length;

  const moderateCount =
    alerts.filter((alert) =>
      matchesSeverity(
        alert,
        "MODERATE"
      )
    ).length;

  const otherCount =
    alerts.filter((alert) =>
      matchesSeverity(
        alert,
        "OTHER"
      )
    ).length;

  const activeCount =
    alerts.filter(
      (alert) =>
        getAlertStatus(alert) ===
        "ACTIVE"
    ).length;

  const upcomingCount =
    alerts.filter(
      (alert) =>
        getAlertStatus(alert) ===
        "UPCOMING"
    ).length;

  const expiredCount =
    alerts.filter(
      (alert) =>
        getAlertStatus(alert) ===
        "EXPIRED"
    ).length;

  const highPriorityCount =
    criticalCount + severeCount;

  /* =======================================================
     ANALYTICS
  ======================================================= */

  const severityData = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      SEVERE: 0,
      MODERATE: 0,
      OTHER: 0,
    };

    alerts.forEach((alert) => {
      const group =
        getSeverityGroup(alert);

      counts[group]++;
    });

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

  const statusData = useMemo(() => {
    return [
      {
        name: "Active",
        value: activeCount,
      },
      {
        name: "Upcoming",
        value: upcomingCount,
      },
      {
        name: "Expired",
        value: expiredCount,
      },
    ];
  }, [
    activeCount,
    upcomingCount,
    expiredCount,
  ]);

  const hazardData = useMemo(() => {
    const counts: Record<
      string,
      number
    > = {};

    alerts.forEach((alert) => {
      const hazard =
        alert.disaster_type?.trim() ||
        "Other";

      counts[hazard] =
        (counts[hazard] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, 8)
      .map(
        ([name, value]) => ({
          name,
          value,
        })
      );
  }, [alerts]);

  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const filteredAlerts = useMemo(() => {
    const searchText =
      search.trim().toLowerCase();

    const result = alerts.filter(
      (alert) => {
        const searchableText = `
          ${alert.disaster_type || ""}
          ${alert.area_description || ""}
          ${alert.alert_source || ""}
          ${alert.warning_message || ""}
          ${alert.identifier || ""}
          ${alert.severity || ""}
          ${alert.severity_level || ""}
          ${alert.area_covered || ""}
        `.toLowerCase();

        const matchesSearch =
          searchText === "" ||
          searchableText.includes(
            searchText
          );

        const matchesSeverityFilter =
          matchesSeverity(
            alert,
            severityFilter
          );

        const alertStatus =
          getAlertStatus(alert);

        const matchesStatus =
          statusFilter === "ALL" ||
          alertStatus === statusFilter;

        const matchesHazard =
          hazardFilter === "ALL" ||
          alert.disaster_type ===
            hazardFilter;

        const matchesActiveQuickFilter =
          !showOnlyActive ||
          alertStatus === "ACTIVE";

        return (
          matchesSearch &&
          matchesSeverityFilter &&
          matchesStatus &&
          matchesHazard &&
          matchesActiveQuickFilter
        );
      }
    );

    return [...result].sort(
      (a, b) => {
        if (sortBy === "SEVERITY") {
          const severityDifference =
            severityRank(b) -
            severityRank(a);

          if (
            severityDifference !== 0
          ) {
            return severityDifference;
          }

          const dateA =
            a.effective_start_time
              ? new Date(
                  a.effective_start_time
                ).getTime()
              : 0;

          const dateB =
            b.effective_start_time
              ? new Date(
                  b.effective_start_time
                ).getTime()
              : 0;

          return dateB - dateA;
        }

        if (sortBy === "HAZARD") {
          return (
            (
              a.disaster_type || ""
            ).localeCompare(
              b.disaster_type || ""
            )
          );
        }

        const dateA =
          a.effective_start_time
            ? new Date(
                a.effective_start_time
              ).getTime()
            : 0;

        const dateB =
          b.effective_start_time
            ? new Date(
                b.effective_start_time
              ).getTime()
            : 0;

        return dateB - dateA;
      }
    );
  }, [
    alerts,
    search,
    severityFilter,
    statusFilter,
    hazardFilter,
    sortBy,
    showOnlyActive,
  ]);

  /* =======================================================
     COPY ALERT ID
  ======================================================= */

  async function copyAlertId(
    identifier?: string
  ) {
    if (!identifier) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        identifier
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  function clearFilters() {
    setSearch("");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
    setHazardFilter("ALL");
    setSortBy("SEVERITY");
    setShowOnlyActive(false);
  }

  const hasFilters =
    Boolean(search) ||
    severityFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    hazardFilter !== "ALL" ||
    showOnlyActive;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-8">

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            >
              ← Dashboard
            </Link>

            <a
              href="https://sachet.ndma.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              🚨 Official SACHET ↗
            </a>

          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl">
                  🚨
                </div>

                <div>

                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    Alert Center
                  </h1>

                  <p className="mt-1 text-slate-400">
                    Live official emergency
                    alerts for India
                  </p>

                </div>

              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">

                <span className="flex items-center gap-2 text-sm font-semibold text-green-400">

                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

                  LIVE FEED

                </span>

                <span className="text-xs text-slate-600">
                  Auto refresh: 5 minutes
                </span>

                {updatedAt && (
                  <span className="text-xs text-slate-600">
                    Updated:{" "}
                    {formatDate(
                      updatedAt
                    )}
                  </span>
                )}

                {updatedAt && (
                  <span className="text-xs text-slate-700">
                    (
                    {getRelativeTime(
                      updatedAt
                    )}
                    )
                  </span>
                )}

              </div>

            </div>

            <button
              onClick={() =>
                loadAlerts(true)
              }
              disabled={
                loading || refreshing
              }
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "↻ Refresh Now"}
            </button>

          </div>

        </header>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="font-semibold text-red-300">
                  Alert service unavailable
                </p>

                <p className="mt-1 text-sm text-red-400/80">
                  {error}
                </p>

              </div>

              <button
                onClick={() =>
                  loadAlerts(true)
                }
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Try Again
              </button>

            </div>

          </div>
        )}

        {/* =================================================
            SYSTEM STATUS
        ================================================= */}

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />

                <p className="font-semibold text-green-400">
                  Official Alert Feed Connected
                </p>

              </div>

              <p className="mt-1 text-xs text-slate-600">
                Source: NDMA SACHET •
                Government emergency alert
                information
              </p>

            </div>

            <div className="text-left md:text-right">

              <p className="text-xs text-slate-600">
                Current feed
              </p>

              <p className="text-lg font-bold text-white">
                {loading
                  ? "Loading..."
                  : `${alerts.length} alerts`}
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            EXECUTIVE SUMMARY
        ================================================= */}

        <section className="mb-8">

          <div className="mb-4">

            <h2 className="text-xl font-bold">
              Live Alert Intelligence
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current information received from
              the connected official feed
            </p>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-slate-700">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  🚨
                </span>

                <span className="text-[10px] font-bold text-slate-600">
                  TOTAL
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Total
              </p>

              <p className="mt-1 text-3xl font-bold">
                {loading
                  ? "..."
                  : alerts.length}
              </p>

            </div>

            <div className="rounded-2xl border border-green-500/20 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-green-500/40">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  🟢
                </span>

                <span className="text-[10px] font-bold text-green-500">
                  ACTIVE
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Active
              </p>

              <p className="mt-1 text-3xl font-bold text-green-400">
                {loading
                  ? "..."
                  : activeCount}
              </p>

            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-blue-500/40">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  🔵
                </span>

                <span className="text-[10px] font-bold text-blue-500">
                  UPCOMING
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Upcoming
              </p>

              <p className="mt-1 text-3xl font-bold text-blue-400">
                {loading
                  ? "..."
                  : upcomingCount}
              </p>

            </div>

            <div className="rounded-2xl border border-red-500/20 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-red-500/40">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  🔴
                </span>

                <span className="text-[10px] font-bold text-red-500">
                  RED
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Critical
              </p>

              <p className="mt-1 text-3xl font-bold text-red-400">
                {loading
                  ? "..."
                  : criticalCount}
              </p>

            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-orange-500/40">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  🟠
                </span>

                <span className="text-[10px] font-bold text-orange-500">
                  ORANGE
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Severe
              </p>

              <p className="mt-1 text-3xl font-bold text-orange-400">
                {loading
                  ? "..."
                  : severeCount}
              </p>

            </div>

            <div className="rounded-2xl border border-yellow-500/20 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-yellow-500/40">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  🟡
                </span>

                <span className="text-[10px] font-bold text-yellow-500">
                  YELLOW
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Moderate
              </p>

              <p className="mt-1 text-3xl font-bold text-yellow-400">
                {loading
                  ? "..."
                  : moderateCount}
              </p>

            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-slate-700">

              <div className="flex items-center justify-between">

                <span className="text-2xl">
                  ⚪
                </span>

                <span className="text-[10px] font-bold text-slate-500">
                  OTHER
                </span>

              </div>

              <p className="mt-4 text-sm text-slate-400">
                Other
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-300">
                {loading
                  ? "..."
                  : otherCount}
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            PRIORITY STRIP
        ================================================= */}

        <section className="mb-8 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-500/5 via-slate-900 to-orange-500/5 p-5">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                Priority Monitoring
              </p>

              <h2 className="mt-2 text-xl font-bold">
                {highPriorityCount} high-severity
                official alerts
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Critical and severe alerts from
                the connected NDMA SACHET feed.
              </p>

            </div>

            <button
              onClick={() => {
                setSeverityFilter("ALL");
                setStatusFilter("ACTIVE");
                setShowOnlyActive(true);
                setSortBy("SEVERITY");
              }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 hover:text-white"
            >
              View Active Alerts →
            </button>

          </div>

        </section>

        {/* =================================================
            EMERGENCY TIMELINE
        ================================================= */}

        <EmergencyTimeline
          alerts={alerts}
          onSelect={setSelectedAlert}
        />

        {/* =================================================
            HISTORICAL ANALYTICS
        ================================================= */}

        <HistoricalAnalytics
          alerts={alerts}
        />

        {/* =================================================
            ADVANCED ANALYTICS
        ================================================= */}

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl md:p-6">

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <h2 className="text-2xl font-bold">
                  Emergency Analytics
                </h2>

                <span className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

                  LIVE

                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Analytics calculated directly from
                live NDMA SACHET alert data
              </p>

            </div>

            <div className="text-xs text-slate-600">
              Auto refresh: 5 minutes
            </div>

          </div>

          {/* ANALYTICS CARDS */}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

              <p className="text-sm text-slate-500">
                Official Alerts
              </p>

              <p className="mt-2 text-4xl font-bold">
                {loading
                  ? "..."
                  : alerts.length}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                NDMA SACHET feed
              </p>

            </div>

            <div className="rounded-2xl border border-green-500/20 bg-slate-950 p-5">

              <p className="text-sm text-slate-500">
                Active
              </p>

              <p className="mt-2 text-4xl font-bold text-green-400">
                {loading
                  ? "..."
                  : activeCount}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Currently active
              </p>

            </div>

            <div className="rounded-2xl border border-red-500/20 bg-slate-950 p-5">

              <p className="text-sm text-slate-500">
                Critical
              </p>

              <p className="mt-2 text-4xl font-bold text-red-400">
                {loading
                  ? "..."
                  : criticalCount}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Official severity
              </p>

            </div>

            <div className="rounded-2xl border border-orange-500/20 bg-slate-950 p-5">

              <p className="text-sm text-slate-500">
                Severe
              </p>

              <p className="mt-2 text-4xl font-bold text-orange-400">
                {loading
                  ? "..."
                  : severeCount}
              </p>

              <p className="mt-2 text-xs text-slate-600">
                Official severity
              </p>

            </div>

          </div>

          {/* CHARTS */}

          <div className="grid gap-6 lg:grid-cols-2">

            {/* SEVERITY */}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

              <div className="mb-4">

                <h3 className="font-semibold">
                  Alert Severity Distribution
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Official alert severity
                </p>

              </div>

              <div className="h-[320px]">

                {severityData.some(
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
                        innerRadius={60}
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
                          background:
                            "#020617",
                          border:
                            "1px solid #334155",
                          borderRadius:
                            "12px",
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

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Critical
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500" />
                  Severe
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-yellow-500" />
                  Moderate
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  Other
                </div>

              </div>

            </div>

            {/* STATUS */}

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

              <div className="mb-4">

                <h3 className="font-semibold">
                  Alert Status Distribution
                </h3>

                <p className="mt-1 text-xs text-slate-600">
                  Current lifecycle state
                </p>

              </div>

              <div className="h-[320px]">

                {statusData.some(
                  (item) =>
                    item.value > 0
                ) ? (

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <PieChart>

                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={105}
                        innerRadius={60}
                        paddingAngle={3}
                        label
                      >

                        <Cell fill="#22c55e" />

                        <Cell fill="#3b82f6" />

                        <Cell fill="#64748b" />

                      </Pie>

                      <Tooltip
                        contentStyle={{
                          background:
                            "#020617",
                          border:
                            "1px solid #334155",
                          borderRadius:
                            "12px",
                        }}
                      />

                    </PieChart>

                  </ResponsiveContainer>

                ) : (

                  <div className="flex h-full items-center justify-center text-sm text-slate-600">
                    No status data available
                  </div>

                )}

              </div>

              <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  Active
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  Upcoming
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-500" />
                  Expired
                </div>

              </div>

            </div>

          </div>

          {/* HAZARD DISTRIBUTION */}

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">

            <div className="mb-5">

              <h3 className="font-semibold">
                Hazard Distribution
              </h3>

              <p className="mt-1 text-xs text-slate-600">
                Most frequent official alert
                categories
              </p>

            </div>

            {hazardData.length > 0 ? (

              <div className="grid gap-5 md:grid-cols-2">

                {hazardData.map(
                  (
                    hazard,
                    index
                  ) => {

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

                          <span className="truncate text-sm text-slate-300">
                            {hazard.name}
                          </span>

                          <span className="font-bold text-white">
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

              <div className="py-10 text-center text-sm text-slate-600">
                No hazard data available
              </div>

            )}

          </div>

          {/* SOURCE */}

          <div className="mt-5 flex flex-col gap-2 border-t border-slate-800 pt-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">

            <span>
              Source: NDMA SACHET
            </span>

            <span>
              {updatedAt
                ? `Updated: ${new Date(
                    updatedAt
                  ).toLocaleString(
                    "en-IN"
                  )}`
                : "Waiting for data..."}
            </span>

          </div>

        </section>

        {/* =================================================
            FILTERS
        ================================================= */}

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div>

              <h2 className="font-bold">
                Alert Filters
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Search and analyze the live
                official feed
              </p>

            </div>

            {hasFilters && (
              <button
                onClick={
                  clearFilters
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Clear Filters
              </button>
            )}

          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

            {/* SEARCH */}

            <div className="lg:col-span-2">

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Search
              </label>

              <div className="relative">

                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                  🔎
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="State, hazard, warning, ID..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />

              </div>

            </div>

            {/* SEVERITY */}

            <div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Severity
              </label>

              <select
                value={
                  severityFilter
                }
                onChange={(event) =>
                  setSeverityFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >

                <option value="ALL">
                  All Severities
                </option>

                <option value="CRITICAL">
                  Critical / Red
                </option>

                <option value="SEVERE">
                  Severe / Orange
                </option>

                <option value="MODERATE">
                  Moderate / Yellow
                </option>

                <option value="OTHER">
                  Other
                </option>

              </select>

            </div>

            {/* STATUS */}

            <div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </label>

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as StatusOption
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >

                <option value="ALL">
                  All Status
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="UPCOMING">
                  Upcoming
                </option>

                <option value="EXPIRED">
                  Expired
                </option>

              </select>

            </div>

            {/* HAZARD */}

            <div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hazard
              </label>

              <select
                value={
                  hazardFilter
                }
                onChange={(event) =>
                  setHazardFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >

                <option value="ALL">
                  All Hazards
                </option>

                {hazards.map(
                  (hazard) => (
                    <option
                      key={hazard}
                      value={hazard}
                    >
                      {hazard}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* SORT */}

          <div className="mt-4 flex flex-col gap-4 border-t border-slate-800 pt-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              <div className="flex items-center gap-3">

                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sort
                </label>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target
                        .value as SortOption
                    )
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >

                  <option value="SEVERITY">
                    Highest Severity
                  </option>

                  <option value="LATEST">
                    Latest
                  </option>

                  <option value="HAZARD">
                    Hazard Name
                  </option>

                </select>

              </div>

              <button
                onClick={() =>
                  setShowOnlyActive(
                    !showOnlyActive
                  )
                }
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  showOnlyActive
                    ? "border-green-500/40 bg-green-500/10 text-green-400"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:border-green-500/30 hover:text-white"
                }`}
              >
                {showOnlyActive
                  ? "✓ Active Only"
                  : "Active Only"}
              </button>

            </div>

            <div className="text-sm text-slate-500">

              Showing{" "}

              <span className="font-bold text-white">
                {filteredAlerts.length}
              </span>{" "}

              of{" "}

              <span className="font-bold text-white">
                {alerts.length}
              </span>{" "}

              alerts

            </div>

          </div>

        </section>

        {/* =================================================
            ALERT LIST
        ================================================= */}

        {loading ? (

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-16 text-center">

            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

            <p className="font-semibold text-slate-300">
              Loading official alerts...
            </p>

            <p className="mt-2 text-xs text-slate-600">
              Connecting to NDMA SACHET
            </p>

          </section>

        ) : filteredAlerts.length === 0 ? (

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-16 text-center">

            <div className="text-5xl">
              🔎
            </div>

            <h2 className="mt-5 text-xl font-bold">
              No matching alerts
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              No official alert matches the
              current filters.
            </p>

            <button
              onClick={
                clearFilters
              }
              className="mt-5 rounded-xl border border-slate-700 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
            >
              Reset Filters
            </button>

          </section>

        ) : (

          <section className="space-y-4">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold">
                  Official Alerts
                </h2>

                <p className="mt-1 text-xs text-slate-600">
                  Live NDMA SACHET feed
                </p>

              </div>

              <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-500">
                {filteredAlerts.length} results
              </span>

            </div>

            {filteredAlerts.map(
              (alert, index) => {

                const colors =
                  getSeverityColor(
                    alert
                  );

                const status =
                  getAlertStatus(
                    alert
                  );

                const statusStyle =
                  getStatusStyle(
                    status
                  );

                const centroid =
                  parseCentroid(
                    alert.centroid
                  );

                return (

                  <article
                    key={
                      alert.identifier ||
                      `${alert.disaster_type}-${alert.area_description}-${index}`
                    }
                    className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:bg-slate-900/80 hover:shadow-xl ${colors.glow}`}
                  >

                    <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="mb-3 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
                            🚨 OFFICIAL
                          </span>

                          <span
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${colors.badge}`}
                          >
                            {getSeverityLabel(
                              alert
                            )}
                          </span>

                          <span
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusStyle.badge}`}
                          >

                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot} ${
                                status ===
                                "ACTIVE"
                                  ? "animate-pulse"
                                  : ""
                              }`}
                            />

                            {status}

                          </span>

                        </div>

                        <h2 className="text-xl font-bold text-white">
                          {alert.disaster_type ||
                            "Emergency Alert"}
                        </h2>

                        <p className="mt-2 text-sm text-slate-300">
                          📍{" "}
                          {alert.area_description ||
                            "Area not available"}
                        </p>

                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            Official Warning Message
                          </p>

                          <p className="leading-7 text-slate-400">
                            {alert.warning_message ||
                              "No warning message available."}
                          </p>

                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">

                          {centroid && (
                            <span className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-500">
                              📍{" "}
                              {centroid.latitude.toFixed(
                                3
                              )}
                              ,{" "}
                              {centroid.longitude.toFixed(
                                3
                              )}
                            </span>
                          )}

                          {alert.area_covered && (
                            <span className="max-w-full truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-500">
                              Area coverage available
                            </span>
                          )}

                        </div>

                      </div>

                      <div className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 lg:w-[290px]">

                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Source
                        </p>

                        <p className="mt-1 text-sm font-semibold text-blue-300">
                          {alert.alert_source ||
                            "NDMA SACHET"}
                        </p>

                        <div className="my-4 border-t border-slate-800" />

                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Effective From
                        </p>

                        <p className="mt-1 text-sm text-slate-300">
                          {formatDate(
                            alert.effective_start_time
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {getRelativeTime(
                            alert.effective_start_time
                          )}
                        </p>

                        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          Effective Until
                        </p>

                        <p className="mt-1 text-sm text-slate-300">
                          {formatDate(
                            alert.effective_end_time
                          )}
                        </p>

                        <button
                          onClick={() =>
                            setSelectedAlert(
                              alert
                            )
                          }
                          className="mt-5 w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 hover:text-white"
                        >
                          View Full Details →
                        </button>

                      </div>

                    </div>

                    <div className="mt-5 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">

                      <span className="text-xs text-slate-600">
                        NDMA SACHET • Official
                        Government Alert
                      </span>

                      {alert.identifier && (
                        <span className="max-w-full truncate text-xs text-slate-700">
                          ID:{" "}
                          {alert.identifier}
                        </span>
                      )}

                    </div>

                  </article>

                );
              }
            )}

          </section>

        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl">
            🚨
          </div>

          <p className="mt-4 text-sm font-semibold text-slate-400">
            Official Alert Source
          </p>

          <p className="mt-1 text-xl font-bold">
            NDMA SACHET
          </p>

          <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-slate-600">
            This dashboard displays emergency
            alert information received from the
            connected official government alert
            feed. Always verify critical information
            through official authorities.
          </p>

          <a
            href="https://sachet.ndma.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
          >
            Open Official SACHET ↗
          </a>

        </footer>

      </div>

      {/* =================================================
          ALERT DETAILS MODAL
      ================================================= */}

      {selectedAlert && (

        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedAlert(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-900/95 px-6 py-5 backdrop-blur">

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
                    🚨 OFFICIAL ALERT
                  </span>

                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      getSeverityColor(
                        selectedAlert
                      ).badge
                    }`}
                  >
                    {getSeverityLabel(
                      selectedAlert
                    )}
                  </span>

                  <span
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      getStatusStyle(
                        getAlertStatus(
                          selectedAlert
                        )
                      ).badge
                    }`}
                  >
                    {getAlertStatus(
                      selectedAlert
                    )}
                  </span>

                </div>

                <h2 className="mt-3 text-2xl font-bold">
                  {selectedAlert.disaster_type ||
                    "Emergency Alert"}
                </h2>

              </div>

              <button
                onClick={() =>
                  setSelectedAlert(null)
                }
                aria-label="Close alert details"
                className="shrink-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xl text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div className="space-y-5 p-6">

              {/* STATUS / SOURCE / HAZARD */}

              <div className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Status
                  </p>

                  <p
                    className={`mt-2 font-bold ${
                      getAlertStatus(
                        selectedAlert
                      ) === "ACTIVE"
                        ? "text-green-400"
                        : getAlertStatus(
                            selectedAlert
                          ) === "UPCOMING"
                        ? "text-blue-400"
                        : "text-slate-500"
                    }`}
                  >
                    ●{" "}
                    {getAlertStatus(
                      selectedAlert
                    )}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Source
                  </p>

                  <p className="mt-2 font-bold text-blue-300">
                    {selectedAlert.alert_source ||
                      "NDMA SACHET"}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Hazard
                  </p>

                  <p className="mt-2 font-bold">
                    {selectedAlert.disaster_type ||
                      "Not available"}
                  </p>

                </div>

              </div>

              {/* AREA */}

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Affected Area
                </p>

                <p className="mt-2 leading-7 text-slate-300">
                  📍{" "}
                  {selectedAlert.area_description ||
                    "Area not available"}
                </p>

                {selectedAlert.area_covered && (

                  <div className="mt-4 border-t border-slate-800 pt-4">

                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Area Covered
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {selectedAlert.area_covered}
                    </p>

                  </div>

                )}

              </div>

              {/* WARNING */}

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

                <div className="flex items-center gap-2">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                    Official Warning Message
                  </p>

                </div>

                <p className="mt-3 leading-8 text-slate-300">
                  {selectedAlert.warning_message ||
                    "No warning message available."}
                </p>

              </div>

              {/* TIME */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Effective From
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(
                      selectedAlert.effective_start_time
                    )}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Effective Until
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {formatDate(
                      selectedAlert.effective_end_time
                    )}
                  </p>

                </div>

              </div>

              {/* COORDINATES */}

              {parseCentroid(
                selectedAlert.centroid
              ) && (

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Alert Coordinates
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">

                    <div>

                      <p className="text-xs text-slate-600">
                        Latitude
                      </p>

                      <p className="mt-1 font-mono text-sm text-slate-300">
                        {
                          parseCentroid(
                            selectedAlert.centroid
                          )?.latitude
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-600">
                        Longitude
                      </p>

                      <p className="mt-1 font-mono text-sm text-slate-300">
                        {
                          parseCentroid(
                            selectedAlert.centroid
                          )?.longitude
                        }
                      </p>

                    </div>

                  </div>

                </div>

              )}

              {/* ID */}

              {selectedAlert.identifier && (

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0">

                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        Alert Identifier
                      </p>

                      <p className="mt-2 break-all font-mono text-xs leading-6 text-slate-400">
                        {selectedAlert.identifier}
                      </p>

                    </div>

                    <button
                      onClick={() =>
                        copyAlertId(
                          selectedAlert.identifier
                        )
                      }
                      className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
                    >
                      {copied
                        ? "✓ Copied"
                        : "Copy ID"}
                    </button>

                  </div>

                </div>

              )}

              {/* DISSEMINATION */}

              {selectedAlert.disseminated !==
                undefined && (

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">

                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Dissemination Status
                  </p>

                  <p className="mt-2 text-sm text-slate-300">
                    {String(
                      selectedAlert.disseminated
                    )}
                  </p>

                </div>

              )}

              {/* OFFICIAL SOURCE */}

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

                <div className="flex items-center gap-2">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

                  <p className="font-semibold text-red-300">
                    Official Government Alert
                  </p>

                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This alert is displayed from
                  the connected NDMA SACHET
                  government alert source.
                </p>

                <a
                  href="https://sachet.ndma.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                >
                  Verify on Official SACHET ↗
                </a>

              </div>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}