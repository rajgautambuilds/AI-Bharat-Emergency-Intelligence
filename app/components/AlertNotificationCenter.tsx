"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";

type Alert = {
  alert_id_sdma_autoinc?: string | number;
  identifier?: string;
  severity?: string;
  severity_level?: string;
  disaster_type?: string;
  warning_message?: string;
  area_description?: string;
  effective_start_time?: string;
  effective_end_time?: string;
  disseminated?: boolean | string;
  alert_source?: string;
};

type AlertsResponse = {
  success?: boolean;
  count?: number;
  alerts?: Alert[];
  updatedAt?: string;
};

function getSeverity(alert: Alert) {
  const value = `${alert.severity ?? ""} ${
    alert.severity_level ?? ""
  }`.toLowerCase();

  if (
    value.includes("extreme") ||
    value.includes("critical")
  ) {
    return "CRITICAL";
  }

  if (
    value.includes("severe") ||
    value.includes("high")
  ) {
    return "SEVERE";
  }

  if (
    value.includes("moderate") ||
    value.includes("warning")
  ) {
    return "MODERATE";
  }

  return "INFO";
}

function severityRank(alert: Alert) {
  const severity = getSeverity(alert);

  if (severity === "CRITICAL") return 4;
  if (severity === "SEVERE") return 3;
  if (severity === "MODERATE") return 2;

  return 1;
}

function getAlertId(
  alert: Alert,
  index: number
) {
  return String(
    alert.alert_id_sdma_autoinc ??
      alert.identifier ??
      `${alert.disaster_type}-${alert.area_description}-${index}`
  );
}

function formatTime(value?: string) {
  if (!value) {
    return "Time unavailable";
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

function severityClass(alert: Alert) {
  const severity = getSeverity(alert);

  if (severity === "CRITICAL") {
    return "border-red-500/40 bg-red-500/10 text-red-300";
  }

  if (severity === "SEVERE") {
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  }

  if (severity === "MODERATE") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-300";
  }

  return "border-slate-700 bg-slate-800/50 text-slate-300";
}

export default function AlertNotificationCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newAlerts, setNewAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const previousIdsRef = useRef<string[]>([]);

  const loadAlerts = useCallback(
    async (isManual = false) => {
      if (isManual) {
        setIsRefreshing(true);
      }

      try {
        const response = await fetch(
          "/api/alerts",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            `Alert API returned ${response.status}`
          );
        }

        const data =
          (await response.json()) as AlertsResponse;

        const incomingAlerts = Array.isArray(
          data.alerts
        )
          ? data.alerts
          : [];

        const incomingIds =
          incomingAlerts.map(
            (alert, index) =>
              getAlertId(alert, index)
          );

        const previousIds =
          previousIdsRef.current;

        if (previousIds.length > 0) {
          const detectedNewAlerts =
            incomingAlerts.filter(
              (alert, index) =>
                !previousIds.includes(
                  getAlertId(alert, index)
                )
            );

          if (
            detectedNewAlerts.length > 0
          ) {
            setNewAlerts(
              detectedNewAlerts
            );

            setIsOpen(true);
          }
        }

        previousIdsRef.current =
          incomingIds;

        setAlerts(incomingAlerts);

        setLastUpdated(
          data.updatedAt ??
            new Date().toISOString()
        );

        setError("");
      } catch (loadError) {
        console.error(
          "Alert notification error:",
          loadError
        );

        setError(
          "Unable to load the official alert feed."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAlerts();
    }, 0);

    const interval = window.setInterval(() => {
      void loadAlerts();
    }, 5 * 60 * 1000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [loadAlerts]);

  const sortedAlerts = useMemo(() => {
    return [...alerts]
      .sort(
        (a, b) =>
          severityRank(b) -
          severityRank(a)
      )
      .slice(0, 6);
  }, [alerts]);

  const criticalCount = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          getSeverity(alert) ===
          "CRITICAL"
      ).length,
    [alerts]
  );

  const severeCount = useMemo(
    () =>
      alerts.filter(
        (alert) =>
          getSeverity(alert) ===
          "SEVERE"
      ).length,
    [alerts]
  );

  function dismissNewAlerts() {
    setNewAlerts([]);
    setIsOpen(false);
  }

  return (
    <>
      {/* Notification Bell */}
      <div className="fixed right-5 top-5 z-[1000]">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-950/95 text-slate-200 shadow-2xl backdrop-blur transition hover:border-red-500/50 hover:bg-slate-900"
          aria-label="Open emergency notifications"
        >
          {newAlerts.length > 0 ? (
            <BellRing className="h-5 w-5 text-red-400" />
          ) : (
            <Bell className="h-5 w-5" />
          )}

          {newAlerts.length > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {newAlerts.length > 9
                ? "9+"
                : newAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Notification Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-start justify-end bg-black/50 p-4 backdrop-blur-sm">
          <div className="mt-16 flex max-h-[calc(100vh-5rem)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#090d14] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-medium tracking-[0.25em] text-red-400">
                    ALERT CENTER
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-white">
                    Emergency Notifications
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close notifications"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* New Alerts */}
            {newAlerts.length > 0 && (
              <div className="border-b border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-red-300">
                      <BellRing className="h-4 w-4" />
                      New official alerts detected
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {newAlerts.length} new alert
                      {newAlerts.length !==
                      1
                        ? "s"
                        : ""}{" "}
                      detected from the NDMA SACHET
                      feed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={dismissNewAlerts}
                    className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 border-b border-slate-800 p-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[10px] font-medium tracking-wider text-slate-500">
                  TOTAL
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {alerts.length}
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-[10px] font-medium tracking-wider text-red-400">
                  CRITICAL
                </p>

                <p className="mt-1 text-xl font-bold text-red-300">
                  {criticalCount}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3">
                <p className="text-[10px] font-medium tracking-wider text-orange-400">
                  SEVERE
                </p>

                <p className="mt-1 text-xl font-bold text-orange-300">
                  {severeCount}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading official alerts...
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <p className="text-sm font-semibold text-red-300">
                    Alert feed unavailable
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {error}
                  </p>
                </div>
              ) : sortedAlerts.length ===
                0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />

                  <p className="mt-3 text-sm font-semibold text-white">
                    No alerts available
                  </p>

                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                    The official SACHET feed
                    currently returned no
                    alerts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAlerts.map(
                    (alert, index) => {
                      const severity =
                        getSeverity(alert);

                      return (
                        <article
                          key={getAlertId(
                            alert,
                            index
                          )}
                          className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${severityClass(
                                    alert
                                  )}`}
                                >
                                  {severity}
                                </span>

                                {alert.disaster_type && (
                                  <span className="rounded-full border border-slate-800 px-2.5 py-1 text-[10px] text-slate-400">
                                    {
                                      alert.disaster_type
                                    }
                                  </span>
                                )}
                              </div>

                              <h3 className="mt-3 text-sm font-semibold text-white">
                                {alert.warning_message ??
                                  "Official emergency alert"}
                              </h3>

                              {alert.area_description && (
                                <p className="mt-2 text-xs text-slate-400">
                                  📍{" "}
                                  {
                                    alert.area_description
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                            <div>
                              Start:{" "}
                              <span className="text-slate-400">
                                {formatTime(
                                  alert.effective_start_time
                                )}
                              </span>
                            </div>

                            <div>
                              End:{" "}
                              <span className="text-slate-400">
                                {formatTime(
                                  alert.effective_end_time
                                )}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] tracking-wider text-slate-500">
                    LAST UPDATED
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {lastUpdated
                      ? formatTime(
                          lastUpdated
                        )
                      : "Not available"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void loadAlerts(true);
                    }}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        isRefreshing
                          ? "animate-spin"
                          : ""
                      }`}
                    />

                    Refresh
                  </button>

                  <a
                    href="https://sachet.ndma.gov.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                  >
                    NDMA SACHET

                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-5 text-slate-600">
                Official alert information is
                sourced from NDMA SACHET. Dashboard
                notifications are informational and
                should not replace official emergency
                instructions.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}