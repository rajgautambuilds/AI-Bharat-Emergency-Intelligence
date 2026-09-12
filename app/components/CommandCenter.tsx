"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CloudRain,
  Radio,
  Shield,
  Signal,
  Thermometer,
  Wind,
} from "lucide-react";

type Alert = {
  severity?: string;
  severity_level?: string;
};

type WeatherItem = {
  temperature?: number;
  precipitation?: number;
  windGusts?: number;
};

type Analyst = {
  overallLevel?: string;
  officialAlerts?: {
    total?: number;
    severe?: number;
  };
  weather?: {
    monitoredLocations?: number;
    critical?: number;
    high?: number;
  };
};

function severity(alert: Alert) {
  return (
    alert.severity ||
    alert.severity_level ||
    ""
  ).toLowerCase();
}

function getPriority(
  analyst: Analyst | null
) {
  const level =
    analyst?.overallLevel?.toUpperCase();

  if (level === "CRITICAL") {
    return {
      label: "CRITICAL",
      text: "text-red-400",
      border: "border-red-500/30",
      bg: "bg-red-500/10",
    };
  }

  if (level === "HIGH") {
    return {
      label: "HIGH",
      text: "text-orange-400",
      border: "border-orange-500/30",
      bg: "bg-orange-500/10",
    };
  }

  if (level === "MODERATE") {
    return {
      label: "MODERATE",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/10",
    };
  }

  return {
    label: "LOW",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  };
}

export default function CommandCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weather, setWeather] = useState<
    WeatherItem[]
  >([]);
  const [analyst, setAnalyst] =
    useState<Analyst | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCommandData() {
      try {
        const [
          alertsResponse,
          weatherResponse,
          analystResponse,
        ] = await Promise.all([
          fetch("/api/alerts", {
            cache: "no-store",
          }),
          fetch("/api/weather", {
            cache: "no-store",
          }),
          fetch("/api/analyst", {
            cache: "no-store",
          }),
        ]);

        const alertsData =
          await alertsResponse.json();

        const weatherData =
          await weatherResponse.json();

        const analystData =
          await analystResponse.json();

        if (cancelled) return;

        setAlerts(
          Array.isArray(alertsData.alerts)
            ? alertsData.alerts
            : []
        );

        setWeather(
          Array.isArray(weatherData.data)
            ? weatherData.data
            : []
        );

        setAnalyst(
          analystData.success
            ? analystData.analyst || null
            : null
        );
      } catch (error) {
        console.error(
          "Command center error:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(
      loadCommandData,
      0
    );

    const interval = setInterval(
      loadCommandData,
      5 * 60 * 1000
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const criticalAlerts =
    alerts.filter((alert) => {
      const value = severity(alert);

      return (
        value.includes("critical") ||
        value.includes("extreme")
      );
    }).length;

  const severeAlerts =
    alerts.filter((alert) => {
      const value = severity(alert);

      return value.includes("severe");
    }).length;

  const maxTemperature =
    weather.length > 0
      ? Math.max(
          ...weather.map((item) =>
            Number(item.temperature ?? -Infinity)
          )
        )
      : null;

  const maxPrecipitation =
    weather.length > 0
      ? Math.max(
          ...weather.map((item) =>
            Number(
              item.precipitation ?? -Infinity
            )
          )
        )
      : null;

  const maxWind =
    weather.length > 0
      ? Math.max(
          ...weather.map((item) =>
            Number(item.windGusts ?? -Infinity)
          )
        )
      : null;

  const priority = getPriority(analyst);

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#090d14] shadow-2xl">
      {/* HEADER */}
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10">
                <Activity className="h-7 w-7 text-cyan-400" />
              </div>

              <div>
                <p className="text-xs font-medium tracking-[0.3em] text-cyan-400">
                  OPERATIONS
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  Emergency Command Center
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Real-time operational overview of
              monitored emergency signals
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

            <span className="text-sm font-semibold text-emerald-400">
              SYSTEM ONLINE
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* PRIMARY STATUS */}
        <div
          className={`rounded-2xl border ${priority.border} ${priority.bg} p-5`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Brain
                className={`h-7 w-7 ${priority.text}`}
              />

              <div>
                <p className="text-xs tracking-[0.25em] text-slate-500">
                  AI OPERATIONAL PRIORITY
                </p>

                <p
                  className={`mt-1 text-2xl font-bold ${priority.text}`}
                >
                  {loading
                    ? "ANALYZING"
                    : priority.label}
                </p>
              </div>
            </div>

            <div className="text-sm text-slate-500">
              Based on current monitored signals
            </div>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-6 w-6 text-red-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                ALERTS
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {alerts.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              official SACHET alerts
            </p>
          </div>

          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
            <div className="flex items-center justify-between">
              <Shield className="h-6 w-6 text-orange-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                PRIORITY
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {criticalAlerts +
                severeAlerts}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              critical + severe signals
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <div className="flex items-center justify-between">
              <Radio className="h-6 w-6 text-blue-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                MONITORING
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {weather.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              weather locations
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-center justify-between">
              <Signal className="h-6 w-6 text-violet-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                AI
              </span>
            </div>

            <p className="mt-5 text-3xl font-bold">
              {analyst?.weather?.high ??
                0}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              high-risk weather signals
            </p>
          </div>
        </div>

        {/* ENVIRONMENTAL SIGNALS */}
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-cyan-400" />

            <h3 className="font-semibold">
              Environmental Signals
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3">
                <Thermometer className="h-5 w-5 text-orange-400" />

                <span className="text-sm text-slate-400">
                  Highest temperature
                </span>
              </div>

              <p className="mt-4 text-2xl font-bold">
                {maxTemperature !== null
                  ? `${maxTemperature.toFixed(1)}°C`
                  : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3">
                <CloudRain className="h-5 w-5 text-blue-400" />

                <span className="text-sm text-slate-400">
                  Highest precipitation
                </span>
              </div>

              <p className="mt-4 text-2xl font-bold">
                {maxPrecipitation !== null
                  ? `${maxPrecipitation.toFixed(1)} mm`
                  : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex items-center gap-3">
                <Wind className="h-5 w-5 text-cyan-400" />

                <span className="text-sm text-slate-400">
                  Strongest wind gust
                </span>
              </div>

              <p className="mt-4 text-2xl font-bold">
                {maxWind !== null
                  ? `${maxWind.toFixed(1)} km/h`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* DATA SOURCES */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center gap-3">
            <Signal className="h-5 w-5 text-emerald-400" />

            <h3 className="font-semibold">
              Intelligence Systems
            </h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

              <div>
                <p className="text-sm font-medium">
                  NDMA SACHET
                </p>

                <p className="text-xs text-slate-500">
                  Official alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

              <div>
                <p className="text-sm font-medium">
                  Open-Meteo
                </p>

                <p className="text-xs text-slate-500">
                  Weather observations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

              <div>
                <p className="text-sm font-medium">
                  AI Analyst
                </p>

                <p className="text-xs text-slate-500">
                  Decision-support layer
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>
            Monitoring interval: 5 minutes
          </span>

          <span>
            AI analysis is decision support, not
            an official warning.
          </span>
        </div>
      </div>
    </section>
  );
}