"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  ExternalLink,
  Filter,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";

type Alert = {
  severity?: string;
  severity_level?: string;
  severity_color?: string;
  disaster_type?: string;
  area_description?: string;
  warning_message?: string;
  effective_start_time?: string;
  effective_end_time?: string;
  alert_source?: string;
  sender_org_id?: string;
  alert_id_sdma_autoinc?: string | number;
  identifier?: string;
  centroid?: string;
  area_covered?: string;
  disseminated?: boolean | string;
};

type Priority = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

type QueueItem = Alert & {
  priority: Priority;
  score: number;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getPriority(alert: Alert): {
  priority: Priority;
  score: number;
} {
  const severity = normalize(
    alert.severity || alert.severity_level
  );

  const message = normalize(
    alert.warning_message
  );

  const disaster = normalize(
    alert.disaster_type
  );

  let score = 0;

  if (
    severity.includes("extreme") ||
    severity.includes("critical")
  ) {
    score += 100;
  } else if (severity.includes("severe")) {
    score += 75;
  } else if (
    severity.includes("moderate") ||
    severity.includes("warning")
  ) {
    score += 45;
  } else {
    score += 20;
  }

  if (
    disaster.includes("flood") ||
    disaster.includes("cyclone") ||
    disaster.includes("storm") ||
    disaster.includes("landslide") ||
    disaster.includes("earthquake")
  ) {
    score += 20;
  }

  if (
    message.includes("evacuation") ||
    message.includes("danger") ||
    message.includes("life") ||
    message.includes("immediate")
  ) {
    score += 15;
  }

  if (score >= 100) {
    return {
      priority: "CRITICAL",
      score,
    };
  }

  if (score >= 70) {
    return {
      priority: "HIGH",
      score,
    };
  }

  if (score >= 40) {
    return {
      priority: "MODERATE",
      score,
    };
  }

  return {
    priority: "LOW",
    score,
  };
}

function priorityClasses(priority: Priority) {
  switch (priority) {
    case "CRITICAL":
      return {
        text: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        dot: "bg-red-400",
      };

    case "HIGH":
      return {
        text: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        dot: "bg-orange-400",
      };

    case "MODERATE":
      return {
        text: "text-yellow-400",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        dot: "bg-yellow-400",
      };

    default:
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        dot: "bg-emerald-400",
      };
  }
}

function formatDate(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSeverity(alert: Alert) {
  return (
    alert.severity ||
    alert.severity_level ||
    "Unknown"
  );
}

export default function IncidentPriorityQueue() {
  const [alerts, setAlerts] = useState<QueueItem[]>([]);

  const [filter, setFilter] =
    useState<"ALL" | Priority>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState<string | null>(null);

  const [selectedAlert, setSelectedAlert] =
    useState<QueueItem | null>(null);

  async function loadAlerts() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/alerts",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          "Unable to load alerts"
        );
      }

      const rawAlerts: Alert[] =
        Array.isArray(data.alerts)
          ? data.alerts
          : [];

      const queue: QueueItem[] =
        rawAlerts.map((alert) => {
          const result =
            getPriority(alert);

          return {
            ...alert,
            priority: result.priority,
            score: result.score,
          };
        });

      queue.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        const aTime =
          a.effective_start_time
            ? new Date(
                a.effective_start_time
              ).getTime()
            : 0;

        const bTime =
          b.effective_start_time
            ? new Date(
                b.effective_start_time
              ).getTime()
            : 0;

        return bTime - aTime;
      });

      setAlerts(queue);

      setLastUpdated(
        new Date().toISOString()
      );
    } catch (error) {
      console.error(
        "Incident queue error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * LOAD INCIDENT QUEUE
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAlerts();
    }, 0);

    const interval = setInterval(
      loadAlerts,
      5 * 60 * 1000
    );

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  /*
   * MAP ↔ INCIDENT LINKING
   *
   * When a user clicks an official
   * incident marker on the India map,
   * the map dispatches this event.
   *
   * This listener opens the same
   * incident detail modal.
   */
  useEffect(() => {
    function handleMapIncident(event: Event) {
      const customEvent =
        event as CustomEvent<Alert>;

      const alert = customEvent.detail;

      if (!alert) {
        return;
      }

      const result = getPriority(alert);

      setSelectedAlert({
        ...alert,
        priority: result.priority,
        score: result.score,
      });
    }

    window.addEventListener(
      "ai-bharat:open-incident",
      handleMapIncident
    );

    return () => {
      window.removeEventListener(
        "ai-bharat:open-incident",
        handleMapIncident
      );
    };
  }, []);

  /*
   * QUEUE → MAP LINKING
   *
   * When a user clicks an incident
   * inside the priority queue, send
   * the selected alert to the India map.
   *
   * IndiaMap.tsx will listen for this
   * event and focus/zoom the map to
   * the incident coordinates.
   */
  function focusIncidentOnMap(
    alert: QueueItem
  ) {
    window.dispatchEvent(
      new CustomEvent(
        "ai-bharat:focus-incident",
        {
          detail: alert,
        }
      )
    );
  }

  const filteredAlerts = useMemo(() => {
    if (filter === "ALL") {
      return alerts;
    }

    return alerts.filter(
      (alert) =>
        alert.priority === filter
    );
  }, [alerts, filter]);

  const counts = useMemo(() => {
    return {
      critical: alerts.filter(
        (item) =>
          item.priority === "CRITICAL"
      ).length,

      high: alerts.filter(
        (item) =>
          item.priority === "HIGH"
      ).length,

      moderate: alerts.filter(
        (item) =>
          item.priority === "MODERATE"
      ).length,

      low: alerts.filter(
        (item) =>
          item.priority === "LOW"
      ).length,
    };
  }, [alerts]);

  return (
    <>
      {/* INCIDENT PRIORITY QUEUE */}
      <section className="mt-8 overflow-hidden rounded-3xl border border-red-500/20 bg-[#090d14] shadow-2xl">

        {/* HEADER */}
        <div className="border-b border-slate-800 px-6 py-6">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                <Radio className="h-7 w-7 text-red-400" />
              </div>

              <div>
                <p className="text-xs font-medium tracking-[0.3em] text-red-400">
                  LIVE INCIDENTS
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Incident Priority Queue
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Operational ranking of official SACHET alerts
                </p>
              </div>

            </div>

            <button
              onClick={loadAlerts}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-red-500/40 hover:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

          </div>
        </div>

        <div className="p-6">

          {/* SUMMARY */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {[
              {
                label: "Critical",
                value: counts.critical,
                type: "CRITICAL" as Priority,
              },
              {
                label: "High",
                value: counts.high,
                type: "HIGH" as Priority,
              },
              {
                label: "Moderate",
                value: counts.moderate,
                type: "MODERATE" as Priority,
              },
              {
                label: "Low",
                value: counts.low,
                type: "LOW" as Priority,
              },
            ].map((item) => {

              const classes =
                priorityClasses(
                  item.type
                );

              return (
                <button
                  key={item.label}
                  onClick={() =>
                    setFilter(item.type)
                  }
                  className={`rounded-2xl border ${classes.border} ${classes.bg} p-4 text-left transition hover:scale-[1.01]`}
                >

                  <div className="flex items-center justify-between">

                    <span
                      className={`text-xs font-semibold ${classes.text}`}
                    >
                      {item.label}
                    </span>

                    <span
                      className={`h-2.5 w-2.5 rounded-full ${classes.dot}`}
                    />

                  </div>

                  <p className="mt-3 text-2xl font-bold">
                    {item.value}
                  </p>

                </button>
              );
            })}

          </div>

          {/* FILTER BAR */}
          <div className="mt-6 flex flex-wrap items-center gap-2">

            <div className="mr-2 flex items-center gap-2 text-xs text-slate-500">
              <Filter className="h-4 w-4" />
              FILTER
            </div>

            {(
              [
                "ALL",
                "CRITICAL",
                "HIGH",
                "MODERATE",
                "LOW",
              ] as const
            ).map((item) => (

              <button
                key={item}
                onClick={() =>
                  setFilter(item)
                }
                className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                  filter === item
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : "border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300"
                }`}
              >
                {item}
              </button>

            ))}

          </div>

          {/* QUEUE */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">

            {loading ? (

              <div className="flex min-h-[250px] items-center justify-center">
                <RefreshCw className="h-7 w-7 animate-spin text-red-400" />
              </div>

            ) : filteredAlerts.length === 0 ? (

              <div className="flex min-h-[250px] items-center justify-center p-6 text-center">

                <div>

                  <ShieldAlert className="mx-auto h-8 w-8 text-slate-600" />

                  <p className="mt-3 text-sm text-slate-500">
                    No alerts match this filter.
                  </p>

                </div>

              </div>

            ) : (

              <div>

                {filteredAlerts.map(
                  (alert, index) => {

                    const classes =
                      priorityClasses(
                        alert.priority
                      );

                    return (
                      <button
                        key={
                          alert.alert_id_sdma_autoinc ??
                          alert.identifier ??
                          `${index}-${alert.effective_start_time}`
                        }
                        onClick={() => {
                          setSelectedAlert(
                            alert
                          );

                          focusIncidentOnMap(
                            alert
                          );
                        }}
                        className="block w-full border-b border-slate-800 p-5 text-left transition last:border-b-0 hover:bg-slate-900/60"
                      >

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">

                          {/* PRIORITY */}
                          <div className="flex min-w-[110px] items-center gap-2">

                            <span
                              className={`h-2.5 w-2.5 rounded-full ${classes.dot}`}
                            />

                            <span
                              className={`text-xs font-bold ${classes.text}`}
                            >
                              {alert.priority}
                            </span>

                          </div>

                          {/* INCIDENT */}
                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                {alert.disaster_type ||
                                  "Unknown hazard"}
                              </span>

                              <span className="text-[10px] text-slate-600">
                                SCORE {alert.score}
                              </span>

                              <span className="text-[10px] font-medium text-red-400">
                                VIEW DETAILS →
                              </span>

                            </div>

                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-200">
                              {alert.warning_message ||
                                "Official emergency alert"}
                            </p>

                          </div>

                          {/* LOCATION */}
                          <div className="flex min-w-[220px] items-start gap-2">

                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />

                            <p className="text-xs leading-5 text-slate-500">
                              {alert.area_description ||
                                "Location not specified"}
                            </p>

                          </div>

                          {/* TIME */}
                          <div className="flex min-w-[170px] items-start gap-2">

                            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />

                            <div>

                              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                                Effective
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(
                                  alert.effective_start_time
                                )}
                              </p>

                            </div>

                          </div>

                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            )}

          </div>

          {/* FOOTER */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">

            <span>
              Source: NDMA SACHET official alert feed
            </span>

            <span>
              {lastUpdated
                ? `Updated ${formatDate(
                    lastUpdated
                  )}`
                : "Waiting for data"}
            </span>

          </div>

          {/* DISCLAIMER */}
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">

            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />

            <p className="text-xs leading-5 text-slate-500">
              Priority scores are dashboard-derived
              operational rankings. They do not replace
              the severity or instructions issued by
              official authorities.
            </p>

          </div>

        </div>

      </section>

      {/* INCIDENT DETAIL MODAL */}
      {selectedAlert && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedAlert(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-[#090d14] shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-800 bg-[#090d14] p-6">

              <div>

                <p className="text-xs font-medium tracking-[0.3em] text-red-400">
                  INCIDENT INTELLIGENCE
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  Official Alert Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Detailed information from the current SACHET alert
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedAlert(null)
                }
                className="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:border-red-500/40 hover:text-white"
                aria-label="Close incident details"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-6 p-6">

              {/* STATUS */}
              <div className="flex flex-wrap items-center gap-3">

                {(() => {

                  const classes =
                    priorityClasses(
                      selectedAlert.priority
                    );

                  return (
                    <span
                      className={`rounded-full border px-4 py-2 text-xs font-bold ${classes.border} ${classes.bg} ${classes.text}`}
                    >
                      {selectedAlert.priority}
                    </span>
                  );

                })()}

                <span className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-400">
                  Dashboard Score:{" "}
                  {selectedAlert.score}
                </span>

                <span className="rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-300">
                  OFFICIAL SACHET ALERT
                </span>

              </div>

              {/* WARNING MESSAGE */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-400" />

                  <div>

                    <p className="text-xs uppercase tracking-wider text-red-400">
                      Warning Message
                    </p>

                    <p className="mt-3 text-base leading-7 text-slate-200">
                      {selectedAlert.warning_message ||
                        "No warning message provided."}
                    </p>

                  </div>

                </div>

              </div>

              {/* BASIC DETAILS */}
              <div className="grid gap-4 md:grid-cols-2">

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-600">
                    Disaster Type
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {selectedAlert.disaster_type ||
                      "Unknown"}
                  </p>

                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-600">
                    Official Severity
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-200">
                    {getSeverity(
                      selectedAlert
                    )}
                  </p>

                </div>

              </div>

              {/* LOCATION */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                <div className="flex items-start gap-3">

                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                  <div>

                    <p className="text-xs uppercase tracking-wider text-slate-600">
                      Affected Area
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedAlert.area_description ||
                        "Location not specified"}
                    </p>

                  </div>

                </div>

              </div>

              {/* TIME */}
              <div className="grid gap-4 md:grid-cols-2">

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                  <div className="flex items-start gap-3">

                    <Clock3 className="mt-0.5 h-5 w-5 text-slate-500" />

                    <div>

                      <p className="text-xs uppercase tracking-wider text-slate-600">
                        Effective Start
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        {formatDate(
                          selectedAlert.effective_start_time
                        )}
                      </p>

                    </div>

                  </div>

                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                  <div className="flex items-start gap-3">

                    <Clock3 className="mt-0.5 h-5 w-5 text-slate-500" />

                    <div>

                      <p className="text-xs uppercase tracking-wider text-slate-600">
                        Effective End
                      </p>

                      <p className="mt-2 text-sm text-slate-300">
                        {formatDate(
                          selectedAlert.effective_end_time
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* SOURCE INFORMATION */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                <p className="text-xs uppercase tracking-wider text-slate-600">
                  Source Information
                </p>

                <div className="mt-4 grid gap-5 md:grid-cols-2">

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Alert Source
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {selectedAlert.alert_source ||
                        "NDMA SACHET"}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Alert ID
                    </p>

                    <p className="mt-1 break-all text-sm text-slate-300">
                      {selectedAlert.alert_id_sdma_autoinc ??
                        selectedAlert.identifier ??
                        "Not available"}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Sender Organization
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {selectedAlert.sender_org_id ||
                        "Not available"}
                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Disseminated
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {String(
                        selectedAlert.disseminated ??
                          "Not available"
                      )}
                    </p>

                  </div>

                </div>

              </div>

              {/* AREA COVERED */}
              {selectedAlert.area_covered && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-600">
                    Area Covered
                  </p>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                    {selectedAlert.area_covered}
                  </p>

                </div>
              )}

              {/* CENTROID */}
              {selectedAlert.centroid && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

                  <p className="text-xs uppercase tracking-wider text-slate-600">
                    Alert Coordinates
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-slate-400">
                    {selectedAlert.centroid}
                  </p>

                </div>
              )}

              {/* ACTIONS */}
              <div className="flex flex-wrap gap-3">

                <a
                  href="https://sachet.ndma.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
                >
                  Open NDMA SACHET

                  <ExternalLink className="h-4 w-4" />
                </a>

                <button
                  onClick={() =>
                    setSelectedAlert(null)
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  Close Details
                </button>

              </div>

              {/* DISCLAIMER */}
              <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">

                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />

                <p className="text-xs leading-5 text-slate-500">
                  The alert information shown here comes
                  from the official NDMA SACHET feed.
                  Dashboard priority scoring is an
                  additional analytical layer and does not
                  replace official severity, instructions,
                  or government emergency guidance.
                </p>

              </div>

            </div>

          </div>

        </div>
      )}

    </>
  );
}