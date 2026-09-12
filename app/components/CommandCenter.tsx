"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  CloudRain,
  ExternalLink,
  Radio,
  RefreshCw,
  Shield,
  Signal,
  Thermometer,
  Wind,
  XCircle,
} from "lucide-react";

type Alert = {
  severity?: string;
  severity_level?: string;
};

type WeatherItem = {
  temperature?: number | null;
  precipitation?: number | null;
  windGusts?: number | null;
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

/**
 * Safely format a number.
 * Prevents:
 * undefined.toFixed(...)
 * null.toFixed(...)
 * NaN.toFixed(...)
 */
function safeFixed(
  value: unknown,
  digits = 1,
  fallback = "—"
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number.toFixed(digits);
}

/**
 * Safely convert a value to a finite number.
 */
function safeNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
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
      dot: "bg-red-400",
    };
  }

  if (level === "HIGH") {
    return {
      label: "HIGH",
      text: "text-orange-400",
      border: "border-orange-500/30",
      bg: "bg-orange-500/10",
      dot: "bg-orange-400",
    };
  }

  if (level === "MODERATE") {
    return {
      label: "MODERATE",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
      bg: "bg-yellow-500/10",
      dot: "bg-yellow-400",
    };
  }

  return {
    label: "LOW",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
  };
}

export default function CommandCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [weather, setWeather] =
    useState<WeatherItem[]>([]);
  const [analyst, setAnalyst] =
    useState<Analyst | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCommandData() {
      if (!cancelled) {
        setRefreshing(true);
      }

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

        if (
          !alertsResponse.ok ||
          !weatherResponse.ok ||
          !analystResponse.ok
        ) {
          throw new Error(
            "One or more API requests failed"
          );
        }

        const alertsData =
          await alertsResponse.json();

        const weatherData =
          await weatherResponse.json();

        const analystData =
          await analystResponse.json();

        if (cancelled) {
          return;
        }

        const nextAlerts =
          Array.isArray(alertsData?.alerts)
            ? alertsData.alerts
            : [];

        const nextWeather =
          Array.isArray(weatherData?.data)
            ? weatherData.data
            : [];

        const nextAnalyst =
          analystData?.success &&
          analystData?.analyst
            ? analystData.analyst
            : null;

        setAlerts(nextAlerts);
        setWeather(nextWeather);
        setAnalyst(nextAnalyst);

        setError(false);

        setLastUpdated(
          new Date().toISOString()
        );
      } catch (loadError) {
        console.error(
          "Command center error:",
          loadError
        );

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      loadCommandData();
    }, 0);

    const interval = window.setInterval(
      () => {
        loadCommandData();
      },
      5 * 60 * 1000
    );

    return () => {
      cancelled = true;

      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  const criticalAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const value = severity(alert);

      return (
        value.includes("critical") ||
        value.includes("extreme")
      );
    }).length;
  }, [alerts]);

  const severeAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const value = severity(alert);

      return value.includes("severe");
    }).length;
  }, [alerts]);

  /**
   * Only use valid finite numbers.
   * Invalid API values are ignored.
   */
  const validTemperatures = useMemo(() => {
    return weather
      .map((item) =>
        safeNumber(item?.temperature)
      )
      .filter(
        (value): value is number =>
          value !== null
      );
  }, [weather]);

  const validPrecipitation = useMemo(() => {
    return weather
      .map((item) =>
        safeNumber(item?.precipitation)
      )
      .filter(
        (value): value is number =>
          value !== null
      );
  }, [weather]);

  const validWind = useMemo(() => {
    return weather
      .map((item) =>
        safeNumber(item?.windGusts)
      )
      .filter(
        (value): value is number =>
          value !== null
      );
  }, [weather]);

  const maxTemperature =
    validTemperatures.length > 0
      ? Math.max(...validTemperatures)
      : null;

  const maxPrecipitation =
    validPrecipitation.length > 0
      ? Math.max(...validPrecipitation)
      : null;

  const maxWind =
    validWind.length > 0
      ? Math.max(...validWind)
      : null;

  const priority = getPriority(analyst);

  const severeSignals =
    criticalAlerts + severeAlerts;

  const monitoredLocations =
    safeNumber(
      analyst?.weather?.monitoredLocations
    );

  const highRiskWeather =
    safeNumber(
      analyst?.weather?.high
    );

  const prioritySignals =
    safeNumber(
      analyst?.officialAlerts?.severe
    );

  const displayLastUpdated =
    lastUpdated
      ? new Date(
          lastUpdated
        ).toLocaleTimeString()
      : "Waiting for data";

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

          <div className="flex flex-wrap items-center gap-3">

            {/* LAST UPDATED */}
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2">

              <RefreshCw
                className={`h-4 w-4 text-slate-400 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              <span className="text-xs text-slate-400">
                {displayLastUpdated}
              </span>

            </div>

            {/* SYSTEM STATUS */}
            <div
              className={`flex items-center gap-3 rounded-full border ${
                error
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-emerald-500/20 bg-emerald-500/5"
              } px-4 py-2`}
            >

              <span
                className={`h-2.5 w-2.5 animate-pulse rounded-full ${
                  error
                    ? "bg-red-400"
                    : "bg-emerald-400"
                }`}
              />

              <span
                className={`text-sm font-semibold ${
                  error
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {error
                  ? "DATA DEGRADED"
                  : "SYSTEM ONLINE"}
              </span>

            </div>

          </div>
        </div>
      </div>

      <div className="p-6">

        {/* ERROR STATE */}
        {error && (
          <div className="mb-6 flex items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-400" />

            <div>
              <h3 className="font-semibold text-red-300">
                Some intelligence feeds are unavailable
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                The command center is still running,
                but one or more live data services
                could not be loaded. The dashboard
                will retry automatically.
              </p>
            </div>

          </div>
        )}

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

            <div className="flex items-center gap-2 text-sm text-slate-500">

              <span
                className={`h-2 w-2 rounded-full ${priority.dot}`}
              />

              Based on current monitored signals

            </div>

          </div>
        </div>

        {/* KPI GRID */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* ALERTS */}
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

          {/* PRIORITY */}
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">

            <div className="flex items-center justify-between">

              <Shield className="h-6 w-6 text-orange-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                PRIORITY
              </span>

            </div>

            <p className="mt-5 text-3xl font-bold">
              {severeSignals}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              critical + severe signals
            </p>

          </div>

          {/* MONITORING */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

            <div className="flex items-center justify-between">

              <Radio className="h-6 w-6 text-blue-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                MONITORING
              </span>

            </div>

            <p className="mt-5 text-3xl font-bold">

              {monitoredLocations !== null
                ? Math.round(
                    monitoredLocations
                  )
                : weather.length}

            </p>

            <p className="mt-1 text-sm text-slate-500">
              weather locations
            </p>

          </div>

          {/* AI */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">

            <div className="flex items-center justify-between">

              <Signal className="h-6 w-6 text-violet-400" />

              <span className="text-[10px] tracking-wider text-slate-500">
                AI
              </span>

            </div>

            <p className="mt-5 text-3xl font-bold">

              {highRiskWeather !== null
                ? Math.round(
                    highRiskWeather
                  )
                : 0}

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

            {/* TEMPERATURE */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

              <div className="flex items-center gap-3">

                <Thermometer className="h-5 w-5 text-orange-400" />

                <span className="text-sm text-slate-400">
                  Highest temperature
                </span>

              </div>

              <p className="mt-4 text-2xl font-bold">

                {maxTemperature !== null
                  ? `${safeFixed(
                      maxTemperature,
                      1
                    )}°C`
                  : "—"}

              </p>

              <p className="mt-1 text-xs text-slate-600">
                From monitored weather locations
              </p>

            </div>

            {/* PRECIPITATION */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

              <div className="flex items-center gap-3">

                <CloudRain className="h-5 w-5 text-blue-400" />

                <span className="text-sm text-slate-400">
                  Highest precipitation
                </span>

              </div>

              <p className="mt-4 text-2xl font-bold">

                {maxPrecipitation !== null
                  ? `${safeFixed(
                      maxPrecipitation,
                      1
                    )} mm`
                  : "—"}

              </p>

              <p className="mt-1 text-xs text-slate-600">
                Current monitored precipitation
              </p>

            </div>

            {/* WIND */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">

              <div className="flex items-center gap-3">

                <Wind className="h-5 w-5 text-cyan-400" />

                <span className="text-sm text-slate-400">
                  Strongest wind gust
                </span>

              </div>

              <p className="mt-4 text-2xl font-bold">

                {maxWind !== null
                  ? `${safeFixed(
                      maxWind,
                      1
                    )} km/h`
                  : "—"}

              </p>

              <p className="mt-1 text-xs text-slate-600">
                Maximum monitored gust
              </p>

            </div>

          </div>
        </div>

        {/* SIGNAL SUMMARY */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">

          <div className="flex items-center gap-3">

            <Signal className="h-5 w-5 text-cyan-400" />

            <div>

              <h3 className="font-semibold">
                Signal Summary
              </h3>

              <p className="text-xs text-slate-500">
                Current intelligence indicators
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {/* CRITICAL */}
            <div className="rounded-xl border border-slate-800 px-4 py-4">

              <p className="text-xs text-slate-500">
                Critical alerts
              </p>

              <p className="mt-2 text-xl font-bold text-red-400">
                {criticalAlerts}
              </p>

            </div>

            {/* SEVERE */}
            <div className="rounded-xl border border-slate-800 px-4 py-4">

              <p className="text-xs text-slate-500">
                Severe alerts
              </p>

              <p className="mt-2 text-xl font-bold text-orange-400">
                {severeAlerts}
              </p>

            </div>

            {/* ANALYST */}
            <div className="rounded-xl border border-slate-800 px-4 py-4">

              <p className="text-xs text-slate-500">
                Analyst severe signals
              </p>

              <p className="mt-2 text-xl font-bold text-yellow-400">

                {prioritySignals !== null
                  ? Math.round(
                      prioritySignals
                    )
                  : severeAlerts}

              </p>

            </div>

          </div>
        </div>

        {/* INTELLIGENCE SYSTEMS */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">

          <div className="flex items-center gap-3">

            <Signal className="h-5 w-5 text-emerald-400" />

            <div>

              <h3 className="font-semibold">
                Intelligence Systems
              </h3>

              <p className="text-xs text-slate-500">
                Connected data and analysis layers
              </p>

            </div>

          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">

            {/* NDMA SACHET */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3">

              <div className="flex items-center gap-3">

                <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                <div>

                  <p className="text-sm font-medium">
                    NDMA SACHET
                  </p>

                  <p className="text-xs text-slate-500">
                    Official alerts
                  </p>

                </div>

              </div>

              <a
                href="https://sachet.ndma.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open NDMA SACHET"
                className="text-slate-500 transition hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>

            </div>

            {/* OPEN METEO */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3">

              <div className="flex items-center gap-3">

                <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                <div>

                  <p className="text-sm font-medium">
                    Open-Meteo
                  </p>

                  <p className="text-xs text-slate-500">
                    Weather observations
                  </p>

                </div>

              </div>

              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Open-Meteo"
                className="text-slate-500 transition hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>

            </div>

            {/* AI ANALYST */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 px-4 py-3">

              <CheckCircle2 className="h-5 w-5 text-emerald-400" />

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
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5 text-xs text-slate-600">

          <span>
            Monitoring interval: 5 minutes
          </span>

          <span>
            Live sources are automatically refreshed
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