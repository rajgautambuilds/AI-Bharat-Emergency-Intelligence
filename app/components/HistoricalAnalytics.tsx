"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Flame,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

type AlertItem = {
  identifier?: string;
  severity?: string;
  severity_level?: number | string;
  disaster_type?: string;
  effective_start_time?: string;
  effective_end_time?: string;
};

type RangeOption = "7D" | "30D" | "90D";

const severityColors = {
  critical: "#ef4444",
  severe: "#f97316",
  moderate: "#eab308",
  low: "#22c55e",
  other: "#64748b",
};

function getSeverity(alert: AlertItem) {
  const value = String(alert.severity || "").toLowerCase();
  const level = Number(alert.severity_level);

  if (
    value.includes("critical") ||
    value.includes("extreme") ||
    level >= 4
  ) {
    return "critical";
  }

  if (
    value.includes("severe") ||
    value.includes("warning") ||
    level === 3
  ) {
    return "severe";
  }

  if (
    value.includes("moderate") ||
    value.includes("watch") ||
    level === 2
  ) {
    return "moderate";
  }

  if (
    value.includes("low") ||
    value.includes("minor") ||
    level === 1
  ) {
    return "low";
  }

  return "other";
}

function getHazard(alert: AlertItem) {
  const value = String(alert.disaster_type || "").trim();

  if (!value) return "Other";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAlertDate(alert: AlertItem) {
  if (!alert.effective_start_time) return null;

  const date = new Date(alert.effective_start_time);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default function HistoricalAnalytics() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeOption>("30D");
  const [showMenu, setShowMenu] = useState(false);

  // Load official SACHET data
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);

        const response = await fetch("/api/alerts", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load alerts");
        }

        const data = await response.json();

        if (mounted && data.success) {
          setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
        }
      } catch (error) {
        console.error("Historical analytics error:", error);

        if (mounted) {
          setAlerts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();

    const days =
      range === "7D"
        ? 7
        : range === "30D"
          ? 30
          : 90;

    const start = new Date(now);

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    // Create every day in selected period
    const dailyMap = new Map<
      string,
      {
        date: Date;
        total: number;
        critical: number;
        severe: number;
        moderate: number;
        low: number;
      }
    >();

    for (let i = 0; i < days; i++) {
      const date = new Date(start);

      date.setDate(start.getDate() + i);

      const key = date.toISOString().slice(0, 10);

      dailyMap.set(key, {
        date,
        total: 0,
        critical: 0,
        severe: 0,
        moderate: 0,
        low: 0,
      });
    }

    const filteredAlerts = alerts.filter((alert) => {
      const date = getAlertDate(alert);

      if (!date) return false;

      return date >= start && date <= now;
    });

    // Daily trend
    filteredAlerts.forEach((alert) => {
      const date = getAlertDate(alert);

      if (!date) return;

      const key = date.toISOString().slice(0, 10);
      const day = dailyMap.get(key);

      if (!day) return;

      day.total++;

      const severity = getSeverity(alert);

      if (severity === "critical") day.critical++;
      if (severity === "severe") day.severe++;
      if (severity === "moderate") day.moderate++;
      if (severity === "low") day.low++;
    });

    const dailyTrend = Array.from(dailyMap.values()).map((item) => ({
      date: formatDate(item.date),
      total: item.total,
      critical: item.critical,
      severe: item.severe,
      moderate: item.moderate,
      low: item.low,
    }));

    // Severity analysis
    const severityCounts = {
      critical: 0,
      severe: 0,
      moderate: 0,
      low: 0,
      other: 0,
    };

    // Hazard analysis
    const hazardMap = new Map<string, number>();

    filteredAlerts.forEach((alert) => {
      const severity = getSeverity(alert);

      severityCounts[severity]++;

      const hazard = getHazard(alert);

      hazardMap.set(
        hazard,
        (hazardMap.get(hazard) || 0) + 1
      );
    });

    const severityData = [
      {
        name: "Critical",
        value: severityCounts.critical,
        color: severityColors.critical,
      },
      {
        name: "Severe",
        value: severityCounts.severe,
        color: severityColors.severe,
      },
      {
        name: "Moderate",
        value: severityCounts.moderate,
        color: severityColors.moderate,
      },
      {
        name: "Low",
        value: severityCounts.low,
        color: severityColors.low,
      },
      {
        name: "Other",
        value: severityCounts.other,
        color: severityColors.other,
      },
    ].filter((item) => item.value > 0);

    const hazardData = Array.from(hazardMap.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const peakDay = [...dailyTrend].sort(
      (a, b) => b.total - a.total
    )[0];

    const critical = severityCounts.critical;

    const highPriority =
      severityCounts.critical +
      severityCounts.severe;

    const average =
      days > 0
        ? filteredAlerts.length / days
        : 0;

    return {
      days,
      start,
      total: filteredAlerts.length,
      critical,
      highPriority,
      average,
      dailyTrend,
      severityData,
      hazardData,
      peakDay,
    };
  }, [alerts, range]);

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Historical Intelligence
              </h2>

              <p className="text-xs text-slate-500">
                Analysis of available official SACHET alert records
              </p>
            </div>
          </div>
        </div>

        {/* RANGE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((value) => !value)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/50"
          >
            <CalendarDays className="h-4 w-4 text-cyan-400" />

            {range === "7D"
              ? "Last 7 Days"
              : range === "30D"
                ? "Last 30 Days"
                : "Last 90 Days"}

            <ChevronDown className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              {(["7D", "30D", "90D"] as RangeOption[]).map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setRange(option);
                      setShowMenu(false);
                    }}
                    className={`block w-full px-4 py-3 text-left text-sm ${
                      range === option
                        ? "bg-cyan-500/10 text-cyan-400"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {option === "7D"
                      ? "Last 7 Days"
                      : option === "30D"
                        ? "Last 30 Days"
                        : "Last 90 Days"}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* STATUS */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <Activity className="h-4 w-4 text-emerald-400" />

        <span className="text-xs font-bold text-slate-300">
          OFFICIAL DATA
        </span>

        <span className="text-xs text-slate-500">
          NDMA SACHET
        </span>

        <span className="ml-auto rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
          LIVE DATA
        </span>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="text-sm text-slate-400">
              Loading historical intelligence...
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI CARDS */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Alerts
                </span>

                <BarChart3 className="h-4 w-4 text-cyan-400" />
              </div>

              <div className="text-2xl font-bold text-white">
                {analytics.total}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Selected period
              </p>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Critical
                </span>

                <ShieldAlert className="h-4 w-4 text-red-400" />
              </div>

              <div className="text-2xl font-bold text-red-400">
                {analytics.critical}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Critical / extreme records
              </p>
            </div>

            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  High Priority
                </span>

                <AlertTriangle className="h-4 w-4 text-orange-400" />
              </div>

              <div className="text-2xl font-bold text-orange-400">
                {analytics.highPriority}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Critical + severe
              </p>
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Daily Average
                </span>

                <TrendingUp className="h-4 w-4 text-violet-400" />
              </div>

              <div className="text-2xl font-bold text-violet-400">
                {analytics.average.toFixed(1)}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Records per day
              </p>
            </div>
          </div>

          {/* TREND */}
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">
                  Alert Activity Trend
                </h3>

                <p className="text-xs text-slate-500">
                  Daily official alert records
                </p>
              </div>

              {analytics.peakDay &&
                analytics.peakDay.total > 0 && (
                  <div className="hidden text-right sm:block">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">
                      Peak Day
                    </div>

                    <div className="text-sm font-bold text-cyan-400">
                      {analytics.peakDay.date}
                    </div>
                  </div>
                )}
            </div>

            <div className="h-[320px] w-full">
              {analytics.total === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No alert records available in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyTrend}>
                    <defs>
                      <linearGradient
                        id="historicalGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22d3ee"
                          stopOpacity={0.35}
                        />

                        <stop
                          offset="95%"
                          stopColor="#22d3ee"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={25}
                    />

                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fill: "#64748b",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#historicalGradient)"
                      name="Alerts"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* LOWER CHARTS */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* SEVERITY */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-white">
                  Severity Distribution
                </h3>

                <p className="text-xs text-slate-500">
                  Alert severity within selected period
                </p>
              </div>

              <div className="grid items-center gap-4 md:grid-cols-2">
                <div className="h-[240px]">
                  {analytics.severityData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No severity data
                    </div>
                  ) : (
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={analytics.severityData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {analytics.severityData.map(
                            (entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.color}
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            border: "1px solid #334155",
                            borderRadius: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="space-y-2">
                  {analytics.severityData.map(
                    (item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                item.color,
                            }}
                          />

                          <span className="text-sm text-slate-300">
                            {item.name}
                          </span>
                        </div>

                        <span className="font-bold text-white">
                          {item.value}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* HAZARDS */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    Hazard Distribution
                  </h3>

                  <p className="text-xs text-slate-500">
                    Most frequent disaster categories
                  </p>
                </div>

                <Flame className="h-5 w-5 text-orange-400" />
              </div>

              <div className="h-[280px]">
                {analytics.hazardData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No hazard data
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={analytics.hazardData}
                      layout="vertical"
                      margin={{
                        top: 0,
                        right: 10,
                        left: 15,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1e293b"
                        horizontal={false}
                      />

                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{
                          fill: "#64748b",
                          fontSize: 11,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        type="category"
                        dataKey="name"
                        width={105}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                        }}
                      />

                      <Bar
                        dataKey="value"
                        name="Alerts"
                        fill="#f97316"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* NOTE */}
          <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex gap-3">
              <Activity className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

              <div>
                <h3 className="text-sm font-semibold text-cyan-300">
                  Intelligence Note
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Analytics are calculated from the official SACHET
                  records currently returned by the dashboard API.
                  Missing historical records are not artificially
                  generated.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}