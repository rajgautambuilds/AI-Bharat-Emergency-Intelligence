"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

type AlertItem = {
  severity?: string;
  identifier?: string;
  effective_start_time?: string;
  effective_end_time?: string;
  disaster_type?: string;
  area_description?: string;
  severity_level?: string;
  warning_message?: string;
  disseminated?: string | boolean;
  severity_color?: string;
  alert_id_sdma_autoinc?: string | number;
  alert_source?: string;
  area_covered?: string;
  sender_org_id?: string | number;
  centroid?: string;
};

type AlertResponse = {
  success?: boolean;
  count?: number;
  alerts?: AlertItem[];
  updatedAt?: string;
};

const severityRank: Record<string, number> = {
  critical: 4,
  severe: 3,
  high: 3,
  moderate: 2,
  low: 1,
};

function getSeverity(alert: AlertItem) {
  const value = String(
    alert.severity_level || alert.severity || "Moderate"
  ).toLowerCase();

  if (value.includes("critical")) return "Critical";
  if (value.includes("severe")) return "Severe";
  if (value.includes("high")) return "Severe";
  if (value.includes("moderate")) return "Moderate";
  if (value.includes("low")) return "Low";

  return alert.severity || alert.severity_level || "Moderate";
}

function severityStyle(level: string) {
  const value = level.toLowerCase();

  if (value === "critical") {
    return {
      badge: "border-red-500/30 bg-red-500/10 text-red-300",
      dot: "bg-red-500",
      line: "bg-red-500",
    };
  }

  if (value === "severe") {
    return {
      badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
      dot: "bg-orange-500",
      line: "bg-orange-500",
    };
  }

  if (value === "moderate") {
    return {
      badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
      dot: "bg-yellow-500",
      line: "bg-yellow-500",
    };
  }

  return {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-500",
    line: "bg-emerald-500",
  };
}

function formatDate(value?: string) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAlertTitle(alert: AlertItem) {
  return (
    alert.warning_message ||
    alert.disaster_type ||
    alert.identifier ||
    "Emergency Alert"
  );
}

function getArea(alert: AlertItem) {
  return (
    alert.area_description ||
    alert.area_covered ||
    "Area information unavailable"
  );
}

export default function EmergencyTimeline() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadAlerts(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/alerts", {
        cache: "no-store",
      });

      const result: AlertResponse = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error("Unable to load emergency alerts");
      }

      setAlerts(Array.isArray(result.alerts) ? result.alerts : []);
    } catch (err) {
      console.error("Timeline error:", err);
      setError("Unable to load live SACHET alerts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // Delay the first state update so React's
    // set-state-in-effect ESLint rule is satisfied.
    const initialLoad = setTimeout(() => {
      loadAlerts();
    }, 0);

    const interval = setInterval(() => {
      loadAlerts();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

  const timelineAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => {
        const severityA =
          severityRank[getSeverity(a).toLowerCase()] || 0;

        const severityB =
          severityRank[getSeverity(b).toLowerCase()] || 0;

        if (severityA !== severityB) {
          return severityB - severityA;
        }

        const dateA = new Date(
          a.effective_start_time || ""
        ).getTime();

        const dateB = new Date(
          b.effective_start_time || ""
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 12);
  }, [alerts]);

  const summary = useMemo(() => {
    let critical = 0;
    let severe = 0;
    let moderate = 0;

    for (const alert of alerts) {
      const severity = getSeverity(alert).toLowerCase();

      if (severity === "critical") {
        critical++;
      } else if (severity === "severe") {
        severe++;
      } else if (severity === "moderate") {
        moderate++;
      }
    }

    return {
      critical,
      severe,
      moderate,
    };
  }, [alerts]);

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/90 p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
              <Radio className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                Emergency Timeline
              </h2>

              <p className="text-xs text-slate-500">
                Live official alerts from NDMA SACHET
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadAlerts(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Total Alerts
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {alerts.length}
          </p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-red-400">
            Critical
          </p>

          <p className="mt-2 text-2xl font-bold text-red-300">
            {summary.critical}
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-orange-400">
            Severe
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-300">
            {summary.severe}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-yellow-400">
            Moderate
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-300">
            {summary.moderate}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[250px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-red-500" />

            <p className="mt-3 text-sm text-slate-500">
              Loading emergency timeline...
            </p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && timelineAlerts.length === 0 && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-600" />

          <p className="mt-3 text-sm font-medium text-slate-300">
            No alerts available
          </p>

          <p className="mt-1 text-xs text-slate-500">
            The SACHET feed currently returned no alerts.
          </p>
        </div>
      )}

      {/* Timeline */}
      {!loading && timelineAlerts.length > 0 && (
        <div className="mt-7">
          {timelineAlerts.map((alert, index) => {
            const severity = getSeverity(alert);
            const style = severityStyle(severity);

            return (
              <div
                key={
                  alert.alert_id_sdma_autoinc ||
                  alert.identifier ||
                  `${index}-${alert.effective_start_time}`
                }
                className="relative flex gap-4"
              >
                {/* Timeline line */}
                {index !== timelineAlerts.length - 1 && (
                  <div
                    className={`absolute left-[9px] top-7 h-[calc(100%-8px)] w-px opacity-30 ${style.line}`}
                  />
                )}

                {/* Timeline dot */}
                <div className="relative z-10 mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-950 bg-slate-950">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${style.dot} ${
                      severity === "Critical"
                        ? "animate-pulse"
                        : ""
                    }`}
                  />
                </div>

                {/* Alert card */}
                <div className="mb-5 min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700 hover:bg-slate-900">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
                        >
                          {severity}
                        </span>

                        {alert.disaster_type && (
                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                            {alert.disaster_type}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-sm font-semibold leading-6 text-white">
                        {getAlertTitle(alert)}
                      </h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />

                      {formatDate(alert.effective_start_time)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-600">
                          Affected Area
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {getArea(alert)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Valid Until
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(alert.effective_end_time)}
                      </p>
                    </div>
                  </div>

                  {alert.alert_source && (
                    <div className="mt-4 border-t border-slate-800 pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Alert Source
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {alert.alert_source}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 flex flex-col gap-2 border-t border-slate-800 pt-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
        <span>
          Showing highest-priority recent alerts
        </span>

        <span>
          Source: NDMA SACHET
        </span>
      </div>
    </section>
  );
}