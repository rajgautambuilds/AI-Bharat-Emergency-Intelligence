"use client";

import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import type { LeafletMouseEvent, Path } from "leaflet";
import type { GeoJsonObject } from "geojson";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo, useState } from "react";

/* =========================================================
   TYPES
========================================================= */

type Weather = {
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  apparentTemperature: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  windGusts: number;
};

type WeatherResponse = {
  success?: boolean;
  count?: number;
  updatedAt?: string;
  data?: Weather[];
};

type Alert = {
  identifier?: string;
  severity?: string;
  severity_level?: string;
  severity_color?: string;
  disaster_type?: string;
  area_description?: string;
  area_covered?: string;
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

type RiskLevel =
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "CRITICAL";

type MapFilter =
  | "ALL"
  | "OFFICIAL"
  | "WEATHER"
  | "RISK"
  | "CRITICAL"
  | "SEVERE"
  | "MODERATE";

type StateFeature = {
  type: string;
  properties?: {
    ST_NM?: string;
    ST_ID?: string;
    ID?: string;
    NAME_1?: string;
    name?: string;
  };
};

type IndiaGeoJSON = {
  type: string;
  features: StateFeature[];
};

/* =========================================================
   TYPESCRIPT COMPATIBILITY
========================================================= */

const SafeMapContainer: typeof MapContainer = MapContainer;

const SafeCircleMarker: typeof CircleMarker = CircleMarker;

const SafeTileLayer: typeof TileLayer = TileLayer;

const SafeGeoJSON: typeof GeoJSON = GeoJSON;

const SafeMarkerClusterGroup: typeof MarkerClusterGroup =
  MarkerClusterGroup;

/* =========================================================
   INDIA STATE BOUNDARY DATA
========================================================= */

const INDIA_STATES_GEOJSON_URL =
  "https://raw.githubusercontent.com/india-in-data/india-states-2019/master/india_states.geojson";

/* =========================================================
   WEATHER RISK ENGINE
========================================================= */

function calculateRisk(
  weather: Weather
): RiskLevel {
  let score = 0;

  /* Rain */

  if (weather.precipitation >= 20) {
    score += 40;
  } else if (weather.precipitation >= 10) {
    score += 30;
  } else if (weather.precipitation >= 2) {
    score += 15;
  }

  /* Wind */

  if (weather.windGusts >= 80) {
    score += 35;
  } else if (weather.windGusts >= 60) {
    score += 25;
  } else if (weather.windGusts >= 40) {
    score += 10;
  }

  /* Temperature */

  if (weather.temperature >= 45) {
    score += 35;
  } else if (weather.temperature >= 40) {
    score += 25;
  } else if (weather.temperature >= 35) {
    score += 10;
  }

  /* Thunderstorm */

  if (
    weather.weatherCode === 95 ||
    weather.weatherCode === 96 ||
    weather.weatherCode === 99
  ) {
    score += 30;
  }

  if (score >= 60) {
    return "CRITICAL";
  }

  if (score >= 35) {
    return "HIGH";
  }

  if (score >= 15) {
    return "MODERATE";
  }

  return "LOW";
}

/* =========================================================
   RISK SCORE
========================================================= */

function getRiskScore(
  risk: RiskLevel
) {
  switch (risk) {
    case "CRITICAL":
      return 4;

    case "HIGH":
      return 3;

    case "MODERATE":
      return 2;

    default:
      return 1;
  }
}

/* =========================================================
   WEATHER COLORS
========================================================= */

function getWeatherColor(
  risk: RiskLevel
) {
  switch (risk) {
    case "CRITICAL":
      return "#ef4444";

    case "HIGH":
      return "#f97316";

    case "MODERATE":
      return "#eab308";

    default:
      return "#22c55e";
  }
}

/* =========================================================
   STATE RISK COLORS
========================================================= */

function getStateFillColor(
  risk?: RiskLevel
) {
  if (!risk) {
    return "#334155";
  }

  switch (risk) {
    case "CRITICAL":
      return "#dc2626";

    case "HIGH":
      return "#ea580c";

    case "MODERATE":
      return "#ca8a04";

    case "LOW":
      return "#15803d";

    default:
      return "#334155";
  }
}

/* =========================================================
   OFFICIAL ALERT COLORS
========================================================= */

function getAlertColor(
  alert: Alert
) {
  const severity = (
    alert.severity ||
    alert.severity_level ||
    ""
  ).toLowerCase();

  const color = (
    alert.severity_color ||
    ""
  ).toLowerCase();

  if (
    severity.includes("critical") ||
    color.includes("red")
  ) {
    return "#ef4444";
  }

  if (
    severity.includes("severe") ||
    severity.includes("orange") ||
    color.includes("orange")
  ) {
    return "#f97316";
  }

  if (
    severity.includes("moderate") ||
    severity.includes("yellow") ||
    color.includes("yellow")
  ) {
    return "#eab308";
  }

  return "#3b82f6";
}

/* =========================================================
   STATE NAME NORMALIZER
========================================================= */

function normalizeStateName(
  value?: string
) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(
      /state|union territory|ut/g,
      ""
    )
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
  value?: string
) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

/* =========================================================
   PARSE SACHET CENTROID
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

  const longitude = parts[0];
  const latitude = parts[1];

  if (
    latitude < 5 ||
    latitude > 40 ||
    longitude < 65 ||
    longitude > 100
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

/* =========================================================
   INCIDENT MAP FOCUS
========================================================= */

function IncidentMapFocusHandler() {
  const map = useMap();

  useEffect(() => {
    function handleFocusIncident(event: Event) {
      const customEvent =
        event as CustomEvent<Alert>;

      const alert = customEvent.detail;

      if (!alert?.centroid) {
        return;
      }

      const position =
        parseCentroid(alert.centroid);

      if (!position) {
        return;
      }

      map.setView(
        [
          position.latitude,
          position.longitude,
        ],
        10,
        {
          animate: true,
        }
      );
    }

    window.addEventListener(
      "ai-bharat:focus-incident",
      handleFocusIncident
    );

    return () => {
      window.removeEventListener(
        "ai-bharat:focus-incident",
        handleFocusIncident
      );
    };
  }, [map]);

  return null;
}

/* =========================================================
   MAP RESIZE HANDLER
========================================================= */

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

/* =========================================================
   MAIN INDIA MAP
========================================================= */

export default function IndiaMap() {
  const [weather, setWeather] =
    useState<Weather[]>([]);

  const [alerts, setAlerts] =
    useState<Alert[]>([]);

  const [indiaGeoJSON, setIndiaGeoJSON] =
    useState<IndiaGeoJSON | null>(null);

  const [geoJsonLoading, setGeoJsonLoading] =
    useState(true);

  const [geoJsonError, setGeoJsonError] =
    useState(false);

  const [mapFilter, setMapFilter] =
    useState<MapFilter>("ALL");

  const [loadingWeather, setLoadingWeather] =
    useState(true);

  const [loadingAlerts, setLoadingAlerts] =
    useState(true);

  const [weatherError, setWeatherError] =
    useState(false);

  const [alertsError, setAlertsError] =
    useState(false);

  const [weatherUpdatedAt, setWeatherUpdatedAt] =
    useState("");

  const [alertsUpdatedAt, setAlertsUpdatedAt] =
    useState("");

  /* =======================================================
     LOAD INDIA BOUNDARIES
  ======================================================= */

  async function loadIndiaGeoJSON() {
    try {
      setGeoJsonLoading(true);
      setGeoJsonError(false);

      const response =
        await fetch(
          INDIA_STATES_GEOJSON_URL,
          {
            cache: "force-cache",
          }
        );

      if (!response.ok) {
        throw new Error(
          `GeoJSON error: ${response.status}`
        );
      }

      const data: IndiaGeoJSON =
        await response.json();

      if (
        !data ||
        !Array.isArray(data.features)
      ) {
        throw new Error(
          "Invalid India GeoJSON"
        );
      }

      setIndiaGeoJSON(data);
    } catch (error) {
      console.error(
        "India boundary loading error:",
        error
      );

      setGeoJsonError(true);
    } finally {
      setGeoJsonLoading(false);
    }
  }

  /* =======================================================
     LOAD WEATHER
  ======================================================= */

  async function loadWeather() {
    try {
      setLoadingWeather(true);
      setWeatherError(false);

      const response =
        await fetch(
          "/api/weather",
          {
            cache: "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status}`
        );
      }

      const data: WeatherResponse =
        await response.json();

      if (!data.success) {
        throw new Error(
          "Weather API returned unsuccessful response"
        );
      }

      setWeather(
        data.data || []
      );

      setWeatherUpdatedAt(
        data.updatedAt || ""
      );
    } catch (error) {
      console.error(
        "Weather loading error:",
        error
      );

      setWeatherError(true);
    } finally {
      setLoadingWeather(false);
    }
  }

  /* =======================================================
     LOAD OFFICIAL ALERTS
  ======================================================= */

  async function loadAlerts() {
    try {
      setLoadingAlerts(true);
      setAlertsError(false);

      const response =
        await fetch(
          "/api/alerts",
          {
            cache: "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          `Alert API error: ${response.status}`
        );
      }

      const data: AlertResponse =
        await response.json();

      if (!data.success) {
        console.warn(
          "SACHET unavailable:",
          data
        );

        setAlerts([]);

        setAlertsUpdatedAt(
          data.updatedAt || ""
        );

        return;
      }

      setAlerts(
        data.alerts || []
      );

      setAlertsUpdatedAt(
        data.updatedAt || ""
      );
    } catch (error) {
      console.error(
        "Alert loading error:",
        error
      );

      setAlertsError(true);
    } finally {
      setLoadingAlerts(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const initialLoad =
      setTimeout(() => {
        loadIndiaGeoJSON();
        loadWeather();
        loadAlerts();
      }, 0);

    const interval =
      setInterval(() => {
        loadWeather();
        loadAlerts();
      }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

  /* =======================================================
     WEATHER STATE RISK MAP
  ======================================================= */

  const stateRiskMap =
    useMemo(() => {
      const map = new Map<
        string,
        {
          state: string;
          risk: RiskLevel;
          temperature: number;
          precipitation: number;
          windGusts: number;
          humidity: number;
          city: string;
        }
      >();

      weather.forEach(
        (item) => {
          const key =
            normalizeStateName(
              item.state
            );

          if (!key) {
            return;
          }

          const risk =
            calculateRisk(item);

          const existing =
            map.get(key);

          if (!existing) {
            map.set(key, {
              state: item.state,
              risk,
              temperature:
                item.temperature,
              precipitation:
                item.precipitation,
              windGusts:
                item.windGusts,
              humidity:
                item.humidity,
              city: item.city,
            });

            return;
          }

          if (
            getRiskScore(risk) >
            getRiskScore(
              existing.risk
            )
          ) {
            map.set(key, {
              state: item.state,
              risk,
              temperature:
                item.temperature,
              precipitation:
                item.precipitation,
              windGusts:
                item.windGusts,
              humidity:
                item.humidity,
              city: item.city,
            });
          }
        }
      );

      return map;
    }, [weather]);

  /* =======================================================
     RISK SUMMARY
  ======================================================= */

  const weatherRiskSummary =
    useMemo(() => {
      const summary = {
        LOW: 0,
        MODERATE: 0,
        HIGH: 0,
        CRITICAL: 0,
      };

      weather.forEach(
        (item) => {
          const risk =
            calculateRisk(item);

          summary[risk]++;
        }
      );

      return summary;
    }, [weather]);

  /* =======================================================
     OFFICIAL ALERT SUMMARY
  ======================================================= */

  const officialSummary =
    useMemo(() => {
      let critical = 0;
      let severe = 0;
      let moderate = 0;
      let other = 0;

      alerts.forEach(
        (alert) => {
          const severity = (
            alert.severity ||
            alert.severity_level ||
            ""
          ).toLowerCase();

          const color = (
            alert.severity_color ||
            ""
          ).toLowerCase();

          if (
            severity.includes(
              "critical"
            ) ||
            color.includes("red")
          ) {
            critical++;
          } else if (
            severity.includes(
              "severe"
            ) ||
            severity.includes(
              "orange"
            ) ||
            color.includes(
              "orange"
            )
          ) {
            severe++;
          } else if (
            severity.includes(
              "moderate"
            ) ||
            severity.includes(
              "yellow"
            ) ||
            color.includes(
              "yellow"
            )
          ) {
            moderate++;
          } else {
            other++;
          }
        }
      );

      return {
        critical,
        severe,
        moderate,
        other,
      };
    }, [alerts]);

  /* =======================================================
     FILTER WEATHER
  ======================================================= */

  function shouldShowWeather() {
    return (
      mapFilter === "ALL" ||
      mapFilter === "WEATHER"
    );
  }

  /* =======================================================
     FILTER STATE RISK
  ======================================================= */

  function shouldShowRiskLayer() {
    return (
      mapFilter === "ALL" ||
      mapFilter === "RISK"
    );
  }

  /* =======================================================
     FILTER OFFICIAL ALERTS
  ======================================================= */

  function shouldShowAlert(
    alert: Alert
  ) {
    if (
      mapFilter === "ALL" ||
      mapFilter === "OFFICIAL"
    ) {
      return true;
    }

    if (
      mapFilter === "WEATHER" ||
      mapFilter === "RISK"
    ) {
      return false;
    }

    const severity = (
      alert.severity ||
      alert.severity_level ||
      ""
    ).toLowerCase();

    const color = (
      alert.severity_color ||
      ""
    ).toLowerCase();

    if (
      mapFilter === "CRITICAL"
    ) {
      return (
        severity.includes(
          "critical"
        ) ||
        color.includes("red")
      );
    }

    if (
      mapFilter === "SEVERE"
    ) {
      return (
        severity.includes(
          "severe"
        ) ||
        severity.includes(
          "orange"
        ) ||
        color.includes(
          "orange"
        )
      );
    }

    if (
      mapFilter === "MODERATE"
    ) {
      return (
        severity.includes(
          "moderate"
        ) ||
        severity.includes(
          "yellow"
        ) ||
        color.includes(
          "yellow"
        )
      );
    }

    return true;
  }

  /* =======================================================
     STATE GEOJSON STYLE
  ======================================================= */

  function getStateStyle(
    feature?: StateFeature
  ) {
    const stateName =
      feature?.properties?.ST_NM ||
      feature?.properties?.NAME_1 ||
      feature?.properties?.name ||
      "";

    const key =
      normalizeStateName(
        stateName
      );

    const stateData =
      stateRiskMap.get(key);

    const risk =
      stateData?.risk;

    const fillColor =
      getStateFillColor(risk);

    const visible =
      shouldShowRiskLayer();

    return {
      color: "#94a3b8",
      weight: 1,
      opacity: visible
        ? 0.9
        : 0.15,
      fillColor,
      fillOpacity: visible
        ? risk
          ? 0.42
          : 0.12
        : 0.03,
    };
  }

  /* =======================================================
     STATE GEOJSON EVENTS
  ======================================================= */

  function onEachState(
    feature: StateFeature,
    layer: Path
  ) {
    const stateName =
      feature.properties?.ST_NM ||
      feature.properties?.NAME_1 ||
      feature.properties?.name ||
      "Unknown State";

    const key =
      normalizeStateName(
        stateName
      );

    const stateData =
      stateRiskMap.get(key);

    const risk =
      stateData?.risk;

    const color =
      getStateFillColor(risk);

    layer.bindTooltip(
      `
        <div style="font-weight:700;font-size:13px;">
          ${stateName}
        </div>

        <div style="margin-top:3px;color:${color};font-weight:700;">
          ${
            risk
              ? `Weather Risk: ${risk}`
              : "No weather point available"
          }
        </div>
      `,
      {
        sticky: true,
        direction: "top",
      }
    );

    layer.bindPopup(`
      <div style="min-width:230px;">

        <div style="
          font-size:18px;
          font-weight:700;
          margin-bottom:8px;
        ">
          ${stateName}
        </div>

        <div style="
          display:inline-block;
          padding:5px 9px;
          border-radius:999px;
          background:${color};
          color:white;
          font-size:11px;
          font-weight:700;
          margin-bottom:10px;
        ">
          ${
            risk
              ? risk
              : "NO DATA"
          }
        </div>

        ${
          stateData
            ? `
              <div style="
                font-size:13px;
                line-height:1.8;
              ">

                <div>
                  📍 Reference:
                  ${stateData.city}
                </div>

                <div>
                  🌡️ Temperature:
                  <strong>
                    ${stateData.temperature.toFixed(
                      1
                    )}°C
                  </strong>
                </div>

                <div>
                  🌧️ Precipitation:
                  <strong>
                    ${stateData.precipitation.toFixed(
                      1
                    )} mm
                  </strong>
                </div>

                <div>
                  💨 Wind Gusts:
                  <strong>
                    ${stateData.windGusts.toFixed(
                      1
                    )} km/h
                  </strong>
                </div>

                <div>
                  💧 Humidity:
                  <strong>
                    ${stateData.humidity}%
                  </strong>
                </div>

              </div>

              <div style="
                margin-top:10px;
                padding:9px;
                background:#f1f5f9;
                border-radius:8px;
                font-size:11px;
                color:#64748b;
              ">
                Dashboard-derived weather
                intelligence.
                This is not an official
                government warning.
              </div>
            `
            : `
              <div style="
                font-size:12px;
                color:#64748b;
              ">
                No weather observation point
                is currently mapped to this
                state/UT.
              </div>
            `
        }

      </div>
    `);

    layer.on({
      mouseover: (
        event: LeafletMouseEvent
      ) => {
        const target =
          event.target as Path;

        target.setStyle({
          weight: 2.5,
          color: "#ffffff",
          fillOpacity:
            shouldShowRiskLayer()
              ? 0.65
              : 0.08,
        });

        if (
          !target.bringToFront
        ) {
          return;
        }

        target.bringToFront();
      },

      mouseout: (
        event: LeafletMouseEvent
      ) => {
        const target =
          event.target as Path;

        target.setStyle(
          getStateStyle(
            feature
          )
        );
      },
    });
  }

  /* =======================================================
     REFRESH STATE
  ======================================================= */

  const refreshing =
    loadingWeather ||
    loadingAlerts ||
    geoJsonLoading;

  /* =======================================================
     CLUSTERED WEATHER MARKERS
  ======================================================= */

  function renderWeatherMarkers() {
    if (
      !shouldShowWeather()
    ) {
      return null;
    }

    return (
      <SafeMarkerClusterGroup
        chunkedLoading={true}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
        removeOutsideVisibleBounds={true}
        maxClusterRadius={50}
      >
        {weather.map(
          (item) => {
            const risk =
              calculateRisk(item);

            const color =
              getWeatherColor(
                risk
              );

            return (
              <SafeCircleMarker
                key={`weather-${item.state}-${item.city}`}
                center={[
                  item.latitude,
                  item.longitude,
                ]}
                radius={
                  risk === "CRITICAL"
                    ? 13
                    : risk === "HIGH"
                    ? 11
                    : 9
                }
                pathOptions={{
                  color,
                  fillColor:
                    color,
                  fillOpacity:
                    0.85,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="min-w-[240px]">

                    <div className="mb-2 flex items-center justify-between gap-3">

                      <div>
                        <h3 className="text-lg font-bold">
                          {item.state}
                        </h3>

                        <p className="text-sm text-slate-600">
                          {item.city}
                        </p>
                      </div>

                      <span
                        className="rounded-full px-2 py-1 text-xs font-bold text-white"
                        style={{
                          backgroundColor:
                            color,
                        }}
                      >
                        {risk}
                      </span>

                    </div>

                    <hr className="my-2" />

                    <div className="space-y-1 text-sm">

                      <p>
                        🌡️ Temperature:{" "}
                        <strong>
                          {item.temperature.toFixed(
                            1
                          )}
                          °C
                        </strong>
                      </p>

                      <p>
                        🌡️ Feels Like:{" "}
                        <strong>
                          {item.apparentTemperature.toFixed(
                            1
                          )}
                          °C
                        </strong>
                      </p>

                      <p>
                        💧 Humidity:{" "}
                        <strong>
                          {item.humidity}%
                        </strong>
                      </p>

                      <p>
                        🌧️ Precipitation:{" "}
                        <strong>
                          {item.precipitation.toFixed(
                            1
                          )}
                          mm
                        </strong>
                      </p>

                      <p>
                        💨 Wind:{" "}
                        <strong>
                          {item.windSpeed.toFixed(
                            1
                          )}
                          km/h
                        </strong>
                      </p>

                      <p>
                        💨 Gusts:{" "}
                        <strong>
                          {item.windGusts.toFixed(
                            1
                          )}
                          km/h
                        </strong>
                      </p>

                      <p>
                        🌐 Weather Code:{" "}
                        <strong>
                          {item.weatherCode}
                        </strong>
                      </p>

                    </div>

                    <div className="mt-3 rounded-lg bg-slate-100 p-3">

                      <p className="text-xs font-semibold text-slate-500">
                        DASHBOARD-DERIVED RISK
                      </p>

                      <p
                        className="text-lg font-bold"
                        style={{
                          color,
                        }}
                      >
                        {risk}
                      </p>

                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Calculated from current
                      weather conditions.
                      This is not an official
                      government warning.
                    </p>

                  </div>
                </Popup>
              </SafeCircleMarker>
            );
          }
        )}
      </SafeMarkerClusterGroup>
    );
  }

  /* =======================================================
     CLUSTERED OFFICIAL ALERT MARKERS
  ======================================================= */

  function renderAlertMarkers() {
    const filteredAlerts =
      alerts.filter(
        (alert) =>
          shouldShowAlert(alert)
      );

    return (
      <SafeMarkerClusterGroup
        chunkedLoading={true}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        zoomToBoundsOnClick={true}
        removeOutsideVisibleBounds={true}
        maxClusterRadius={55}
      >
        {filteredAlerts.map(
          (alert, index) => {
            const position =
              parseCentroid(
                alert.centroid
              );

            if (!position) {
              return null;
            }

            const color =
              getAlertColor(
                alert
              );

            return (
              <SafeCircleMarker
                key={`alert-${
                  alert.identifier ||
                  index
                }`}
                center={[
                  position.latitude,
                  position.longitude,
                ]}
                radius={13}
                pathOptions={{
                  color,
                  fillColor:
                    color,
                  fillOpacity:
                    0.95,
                  weight: 3,
                }}
                eventHandlers={{
                  click: () => {
                    window.dispatchEvent(
                      new CustomEvent(
                        "ai-bharat:open-incident",
                        {
                          detail: alert,
                        }
                      )
                    );
                  },
                }}
              >
                <Popup>
                  <div className="min-w-[280px]">

                    <div className="mb-3 flex flex-wrap gap-2">

                      <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        OFFICIAL
                      </span>

                      <span
                        className="rounded px-2 py-1 text-xs font-bold text-white"
                        style={{
                          backgroundColor:
                            color,
                        }}
                      >
                        {alert.severity ||
                          alert.severity_level ||
                          "Alert"}
                      </span>

                    </div>

                    <h3 className="text-lg font-bold">
                      {alert.disaster_type ||
                        "Emergency Alert"}
                    </h3>

                    <p className="mt-2 text-sm">
                      📍{" "}
                      {alert.area_description ||
                        "Area not available"}
                    </p>

                    <div className="mt-3 rounded-lg bg-slate-100 p-3">

                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Warning Message
                      </p>

                      <p className="mt-1 text-sm leading-6">
                        {alert.warning_message ||
                          "No warning message available."}
                      </p>

                    </div>

                    <div className="mt-3 space-y-2 rounded-lg bg-slate-100 p-3 text-sm">

                      <p>
                        <strong>
                          Source:
                        </strong>{" "}
                        {alert.alert_source ||
                          "NDMA SACHET"}
                      </p>

                      <p>
                        <strong>
                          Valid From:
                        </strong>{" "}
                        {formatDate(
                          alert.effective_start_time
                        )}
                      </p>

                      <p>
                        <strong>
                          Valid Until:
                        </strong>{" "}
                        {formatDate(
                          alert.effective_end_time
                        )}
                      </p>

                      {alert.area_covered && (
                        <p>
                          <strong>
                            Area Covered:
                          </strong>{" "}
                          {alert.area_covered}
                        </p>
                      )}

                    </div>

                    <div className="mt-3 flex items-center gap-2">

                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

                      <p className="text-xs font-bold text-red-600">
                        Official government alert
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent(
                            "ai-bharat:open-incident",
                            {
                              detail: alert,
                            }
                          )
                        );
                      }}
                      className="mt-4 w-full rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-600"
                    >
                      Open Incident Details
                    </button>

                  </div>
                </Popup>
              </SafeCircleMarker>
            );
          }
        )}
      </SafeMarkerClusterGroup>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl md:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <div className="flex flex-wrap items-center gap-3">

            <h2 className="text-2xl font-bold text-white">
              India Emergency Map
            </h2>

            <span className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">

              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

              LIVE

            </span>

          </div>

          <p className="mt-1 text-sm text-slate-500">
            State risk intelligence +
            official emergency alerts
          </p>

        </div>

        <button
          onClick={() => {
            loadIndiaGeoJSON();
            loadWeather();
            loadAlerts();
          }}
          disabled={refreshing}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh Map"}
        </button>

      </div>

      {/* =================================================
          QUICK STATUS
      ================================================= */}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">

        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Official Alerts
          </p>

          <p className="mt-1 text-2xl font-bold text-red-400">
            {alerts.length}
          </p>

        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Weather Points
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-400">
            {weather.length}
          </p>

        </div>

        <div className="rounded-2xl border border-red-500/20 bg-slate-950 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Critical
          </p>

          <p className="mt-1 text-2xl font-bold text-red-400">
            {officialSummary.critical}
          </p>

        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-slate-950 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Severe
          </p>

          <p className="mt-1 text-2xl font-bold text-orange-400">
            {officialSummary.severe}
          </p>

        </div>

      </div>

      {/* =================================================
          MAP FILTERS
      ================================================= */}

      <div className="mb-4">

        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm font-semibold text-slate-300">
            Map Intelligence Layers
          </p>

          <p className="text-xs text-slate-600">
            {mapFilter === "ALL"
              ? "Showing all intelligence"
              : `Showing ${mapFilter.toLowerCase()}`}
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          {[
            {
              value:
                "ALL" as MapFilter,
              label: "🌐 All",
            },
            {
              value:
                "RISK" as MapFilter,
              label: "🔥 State Risk",
            },
            {
              value:
                "OFFICIAL" as MapFilter,
              label:
                "🚨 Official Alerts",
            },
            {
              value:
                "WEATHER" as MapFilter,
              label:
                "🌦️ Weather",
            },
            {
              value:
                "CRITICAL" as MapFilter,
              label:
                "🔴 Critical",
            },
            {
              value:
                "SEVERE" as MapFilter,
              label:
                "🟠 Severe",
            },
            {
              value:
                "MODERATE" as MapFilter,
              label:
                "🟡 Moderate",
            },
          ].map(
            (filter) => (
              <button
                key={
                  filter.value
                }
                onClick={() =>
                  setMapFilter(
                    filter.value
                  )
                }
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  mapFilter ===
                  filter.value
                    ? "border-blue-500 bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/10"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            )
          )}

        </div>

      </div>

      {/* =================================================
          MAP
      ================================================= */}

      <div className="relative overflow-hidden rounded-2xl border border-slate-800">

        <SafeMapContainer
          center={
            [22.5, 79] as [
              number,
              number
            ]
          }
          zoom={5}
          minZoom={4}
          maxZoom={12}
          scrollWheelZoom={true}
          style={{
            height: "650px",
            width: "100%",
          }}
        >

          <MapResizeHandler />

          <IncidentMapFocusHandler />

          {/* =================================================
              OPENSTREETMAP
          ================================================= */}

          <SafeTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* =================================================
              INDIA STATE RISK LAYER
          ================================================= */}

          {indiaGeoJSON && (
            <SafeGeoJSON
              key={`india-risk-${weather.length}-${mapFilter}`}
              data={
                indiaGeoJSON as unknown as GeoJsonObject
              }
              style={
                getStateStyle
              }
              onEachFeature={
                onEachState
              }
            />
          )}

          {/* =================================================
              CLUSTERED WEATHER MARKERS
          ================================================= */}

          {renderWeatherMarkers()}

          {/* =================================================
              CLUSTERED OFFICIAL ALERT MARKERS
          ================================================= */}

          {renderAlertMarkers()}

        </SafeMapContainer>

        {/* =================================================
            LIVE DATA INDICATOR
        ================================================= */}

        <div className="pointer-events-none absolute left-4 top-4 z-[500]">

          <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

              <span className="text-xs font-semibold text-green-400">
                LIVE DATA
              </span>

            </div>

            <p className="mt-1 text-[10px] text-slate-500">
              Weather + SACHET
              • Refresh: 5 min
            </p>

          </div>

        </div>

        {/* =================================================
            INTELLIGENCE LAYER STATUS
        ================================================= */}

        <div className="pointer-events-none absolute right-4 top-4 z-[500]">

          <div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Intelligence Layer
            </p>

            <p className="mt-1 text-xs font-bold text-white">

              {mapFilter ===
              "RISK"
                ? "STATE RISK HEAT"
                : mapFilter ===
                  "OFFICIAL"
                ? "OFFICIAL ALERTS"
                : mapFilter ===
                  "WEATHER"
                ? "WEATHER POINTS"
                : "MULTI-LAYER"}

            </p>

          </div>

        </div>

        {/* =================================================
            CLUSTER STATUS
        ================================================= */}

        <div className="pointer-events-none absolute bottom-4 left-4 z-[500]">

          <div className="rounded-xl border border-blue-500/20 bg-slate-950/90 px-3 py-2 shadow-xl backdrop-blur">

            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              MAP ENGINE
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-300">
              Smart Marker Clustering
            </p>

            <p className="mt-1 text-[10px] text-slate-600">
              Zoom in to expand
              clustered alerts
            </p>

          </div>

        </div>

        {/* =================================================
            MAP LOADING
        ================================================= */}

        {geoJsonLoading && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2">

            <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-4 py-2 text-xs font-semibold text-slate-300 shadow-xl">

              🗺️ Loading India
              state boundaries...

            </div>

          </div>
        )}

        {/* =================================================
            MAP ERROR
        ================================================= */}

        {geoJsonError && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[500] -translate-x-1/2">

            <div className="rounded-xl border border-yellow-500/20 bg-slate-950/95 px-4 py-2 text-xs font-semibold text-yellow-400 shadow-xl">

              ⚠️ State boundary
              layer unavailable

            </div>

          </div>
        )}

      </div>

      {/* =================================================
          CLUSTER EXPLANATION
      ================================================= */}

      <div className="mt-4 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm font-semibold text-white">
              🧠 Intelligent Map Clustering
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Nearby weather observations
              and official alerts are
              grouped automatically when
              the map is zoomed out.
              Zoom in to inspect individual
              locations.
            </p>

          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-semibold">

            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-400">
              WEATHER CLUSTERS
            </span>

            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-red-400">
              ALERT CLUSTERS
            </span>

          </div>

        </div>

      </div>

      {/* =================================================
          LEGENDS
      ================================================= */}

      <div className="mt-5 grid gap-4 md:grid-cols-2">

        {/* STATE RISK LEGEND */}

        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">

          <p className="mb-3 text-sm font-semibold text-white">
            🔥 State Risk Heat Layer
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-600" />
              LOW
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              MODERATE
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-600" />
              HIGH
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600" />
              CRITICAL
            </div>

          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            State coloring is derived
            from available weather
            observation points. It is
            not an official government
            risk classification.
          </p>

        </div>

        {/* OFFICIAL LEGEND */}

        <div className="rounded-2xl border border-red-500/20 bg-slate-950 p-4">

          <p className="mb-3 text-sm font-semibold text-white">
            🚨 Official SACHET Alerts
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              Critical / Red
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-500" />
              Severe / Orange
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              Moderate / Yellow
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              Other
            </div>

          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Official SACHET markers
            are shown separately from
            dashboard-derived weather
            intelligence.
          </p>

        </div>

      </div>

      {/* =================================================
          WEATHER RISK SUMMARY
      ================================================= */}

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">

        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-semibold text-white">
              Weather Risk Distribution
            </p>

            <p className="text-xs text-slate-600">
              Dashboard-derived
              intelligence
            </p>

          </div>

          <span className="text-xs text-slate-600">
            {weather.length}
            {" "}
            locations
          </span>

        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

          <div className="rounded-xl border border-green-500/10 bg-green-500/5 p-3">

            <p className="text-xs text-slate-500">
              LOW
            </p>

            <p className="mt-1 text-xl font-bold text-green-400">
              {weatherRiskSummary.LOW}
            </p>

          </div>

          <div className="rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-3">

            <p className="text-xs text-slate-500">
              MODERATE
            </p>

            <p className="mt-1 text-xl font-bold text-yellow-400">
              {weatherRiskSummary.MODERATE}
            </p>

          </div>

          <div className="rounded-xl border border-orange-500/10 bg-orange-500/5 p-3">

            <p className="text-xs text-slate-500">
              HIGH
            </p>

            <p className="mt-1 text-xl font-bold text-orange-400">
              {weatherRiskSummary.HIGH}
            </p>

          </div>

          <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3">

            <p className="text-xs text-slate-500">
              CRITICAL
            </p>

            <p className="mt-1 text-xl font-bold text-red-400">
              {weatherRiskSummary.CRITICAL}
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          STATE COVERAGE
      ================================================= */}

      <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4">

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-semibold text-white">
              🇮🇳 India State Intelligence Coverage
            </p>

            <p className="text-xs text-slate-600">
              Weather points currently
              mapped to state/UT boundaries
            </p>

          </div>

          <span className="text-xs font-semibold text-blue-400">
            {stateRiskMap.size}
            {" "}
            states/UTs with weather data
          </span>

        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{
              width: `${Math.min(
                100,
                (stateRiskMap.size /
                  36) *
                  100
              )}%`,
            }}
          />

        </div>

        <p className="mt-2 text-xs text-slate-600">
          Coverage is based on the
          weather locations returned by
          the Open-Meteo integration.
        </p>

      </div>

      {/* =================================================
          DATA STATUS
      ================================================= */}

      <div className="mt-5 grid gap-3 text-xs md:grid-cols-2">

        {/* WEATHER STATUS */}

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

          <div className="flex items-center justify-between">

            <span className="text-slate-400">
              Weather Data
            </span>

            <span
              className={`font-semibold ${
                weatherError
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {loadingWeather
                ? "Loading..."
                : weatherError
                ? "Unavailable"
                : `${weather.length} locations`}
            </span>

          </div>

          {weatherUpdatedAt && (
            <p className="mt-2 text-slate-600">
              Updated:{" "}
              {formatDate(
                weatherUpdatedAt
              )}
            </p>
          )}

          <p className="mt-2 text-slate-700">
            Source: Open-Meteo
          </p>

        </div>

        {/* ALERT STATUS */}

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

          <div className="flex items-center justify-between">

            <span className="text-slate-400">
              Official Alerts
            </span>

            <span
              className={`font-semibold ${
                alertsError
                  ? "text-red-400"
                  : "text-red-400"
              }`}
            >
              {loadingAlerts
                ? "Loading..."
                : alertsError
                ? "Unavailable"
                : `${alerts.length} alerts`}
            </span>

          </div>

          {alertsUpdatedAt && (
            <p className="mt-2 text-slate-600">
              Updated:{" "}
              {formatDate(
                alertsUpdatedAt
              )}
            </p>
          )}

          <p className="mt-2 text-slate-700">
            Source: NDMA SACHET
          </p>

        </div>

      </div>

      {/* =================================================
          INTELLIGENCE NOTICE
      ================================================= */}

      <div className="mt-5 rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4">

        <p className="text-xs font-semibold text-yellow-400">
          ⚠️ Intelligence Notice
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Official alerts shown on this
          map come from NDMA SACHET
          data. State colors and weather
          risk indicators are calculated
          by this dashboard from available
          weather observations and should
          not be treated as official
          emergency warnings.
        </p>

      </div>

      {/* =================================================
          SOURCES
      ================================================= */}

      <div className="mt-4 text-center text-xs text-slate-600">

        Weather: Open-Meteo
        {" • "}
        Official Alerts: NDMA SACHET
        {" • "}
        Boundaries: India States GeoJSON
        {" • "}
        Map: OpenStreetMap
        {" • "}
        Clustering: Leaflet MarkerCluster

      </div>

    </section>
  );
}