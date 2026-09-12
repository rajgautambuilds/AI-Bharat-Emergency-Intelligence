"use client";

import { useEffect, useState } from "react";

type Alert = {
  severity?: string;
  severity_level?: string;
  severity_color?: string;
};

type WeatherResponse = {
  success?: boolean;
  count?: number;
  data?: unknown[];
};

function getSeverity(alert: Alert) {
  return (
    alert.severity ||
    alert.severity_level ||
    "unknown"
  ).toLowerCase();
}

export default function LiveStats() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weatherCount, setWeatherCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        if (!cancelled) {
          setLoading(true);
        }

        const [
          alertsResponse,
          weatherResponse,
        ] = await Promise.all([
          fetch("/api/alerts", {
            cache: "no-store",
          }),
          fetch("/api/weather", {
            cache: "no-store",
          }),
        ]);

        const alertsData = await alertsResponse.json();

        const weatherData: WeatherResponse =
          await weatherResponse.json();

        if (cancelled) {
          return;
        }

        if (alertsData.success) {
          setAlerts(
            Array.isArray(alertsData.alerts)
              ? alertsData.alerts
              : []
          );
        }

        if (weatherData.success) {
          setWeatherCount(
            weatherData.count ||
              weatherData.data?.length ||
              0
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Live stats error:",
            error
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Initial load is delayed so the React
    // set-state-in-effect lint rule is satisfied.
    const initialLoad = setTimeout(() => {
      loadStats();
    }, 0);

    // Refresh every 5 minutes.
    const interval = setInterval(() => {
      loadStats();
    }, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

  const orangeCount = alerts.filter((alert) => {
    const severity = getSeverity(alert);

    const color = (
      alert.severity_color || ""
    ).toLowerCase();

    return (
      severity.includes("severe") ||
      severity.includes("orange") ||
      color.includes("orange")
    );
  }).length;

  const yellowCount = alerts.filter((alert) => {
    const severity = getSeverity(alert);

    const color = (
      alert.severity_color || ""
    ).toLowerCase();

    return (
      severity.includes("moderate") ||
      severity.includes("yellow") ||
      color.includes("yellow")
    );
  }).length;

  const criticalCount = alerts.filter((alert) =>
    getSeverity(alert).includes("critical")
  ).length;

  const stats = [
    {
      title: "Official Alerts",
      value: alerts.length,
      icon: "🚨",
      description: "NDMA SACHET",
      border: "border-red-500/20",
      valueColor: "text-red-400",
    },
    {
      title: "Weather Locations",
      value: weatherCount,
      icon: "🌦️",
      description: "Open-Meteo",
      border: "border-blue-500/20",
      valueColor: "text-blue-400",
    },
    {
      title: "Critical Alerts",
      value: criticalCount,
      icon: "🔴",
      description: "Official alerts",
      border: "border-red-500/20",
      valueColor: "text-red-400",
    },
    {
      title: "Orange / Severe",
      value: orangeCount,
      icon: "🟠",
      description: "Official alerts",
      border: "border-orange-500/20",
      valueColor: "text-orange-400",
    },
    {
      title: "Yellow / Moderate",
      value: yellowCount,
      icon: "🟡",
      description: "Official alerts",
      border: "border-yellow-500/20",
      valueColor: "text-yellow-400",
    },
  ];

  return (
    <section className="mb-8">
      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Live Intelligence
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Real-time data from connected
            sources
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          LIVE
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className={`rounded-2xl border ${stat.border} bg-slate-900 p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-800`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">
                {stat.icon}
              </span>

              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                LIVE
              </span>
            </div>

            <p className="mt-4 text-sm text-slate-400">
              {stat.title}
            </p>

            <p
              className={`mt-1 text-4xl font-bold ${stat.valueColor}`}
            >
              {loading ? "..." : stat.value}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {stat.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}