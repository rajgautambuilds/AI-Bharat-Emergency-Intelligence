import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const REQUEST_TIMEOUT = 8000;
const CACHE_SECONDS = 300;

type Alert = {
  disaster_type?: string;
  area_description?: string;
  severity?: string;
  severity_level?: string | number;
  warning_message?: string;
  effective_start_time?: string;
  centroid?: string;
};

type Weather = {
  state?: string;
  temperature?: number;
  apparentTemperature?: number;
  precipitation?: number;
  windSpeed?: number;
  windGusts?: number;
  humidity?: number;
  weatherCode?: number;
};

type Correlation = {
  id: string;
  state: string;
  level: "CRITICAL" | "HIGH" | "MODERATE";
  score: number;
  hazards: string[];
  signals: string[];
  explanation: string;
  recommendation: string;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function findState(
  area: string,
  states: string[]
) {
  const text = normalize(area);

  return states.find((state) =>
    text.includes(normalize(state))
  );
}

function numberValue(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(
  url: string
) {
  const response =
    await fetchWithTimeout(url, {
      next: {
        revalidate: CACHE_SECONDS,
      },
      headers: {
        Accept: "application/json",
      },
    });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status}`
    );
  }

  return response.json();
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  try {
    const baseUrl =
      new URL(request.url).origin;

    /*
     * Fetch official alerts and weather
     * concurrently to reduce total latency.
     */
    const [
      alertsResult,
      weatherResult,
    ] = await Promise.all([
      fetchJson(
        `${baseUrl}/api/alerts`
      ),
      fetchJson(
        `${baseUrl}/api/weather`
      ),
    ]);

    if (!alertsResult?.success) {
      throw new Error(
        "Alerts service returned an unsuccessful response"
      );
    }

    if (!weatherResult?.success) {
      throw new Error(
        "Weather service returned an unsuccessful response"
      );
    }

    const alerts: Alert[] =
      Array.isArray(
        alertsResult?.alerts
      )
        ? alertsResult.alerts
        : [];

    const weather: Weather[] =
      Array.isArray(
        weatherResult?.data
      )
        ? weatherResult.data
        : [];

    if (weather.length === 0) {
      const responseTimeMs =
        Date.now() - startedAt;

      return NextResponse.json(
        {
          success: true,
          generatedAt:
            new Date().toISOString(),
          responseTimeMs,

          summary: {
            totalCorrelations: 0,
            critical: 0,
            high: 0,
            moderate: 0,
          },

          correlations: [],

          methodology: {
            type:
              "rule-based multi-signal correlation",
            inputs: [
              "NDMA SACHET official alerts",
              "Open-Meteo weather observations",
              "State-level signal matching",
            ],
            disclaimer:
              "No usable weather observations were available, so no analytical correlations were generated.",
          },

          sources: {
            alerts: "NDMA SACHET",
            weather: "Open-Meteo",
          },
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    /*
     * Build unique state list once.
     */
    const states = Array.from(
      new Set(
        weather
          .map((item) => item.state)
          .filter(
            (
              state
            ): state is string =>
              Boolean(state)
          )
      )
    );

    /*
     * Build a weather lookup map.
     * This avoids repeated Array.find() calls.
     */
    const weatherByState =
      new Map<string, Weather>();

    for (const item of weather) {
      if (!item.state) {
        continue;
      }

      weatherByState.set(
        item.state,
        item
      );
    }

    /*
     * Build an alert lookup map once.
     *
     * Previously every state repeatedly scanned
     * the entire alerts array. This version performs
     * state matching once and reuses the result.
     */
    const alertsByState =
      new Map<string, Alert[]>();

    for (const alert of alerts) {
      const matchedState =
        findState(
          alert.area_description || "",
          states
        );

      if (!matchedState) {
        continue;
      }

      const existing =
        alertsByState.get(
          matchedState
        );

      if (existing) {
        existing.push(alert);
      } else {
        alertsByState.set(
          matchedState,
          [alert]
        );
      }
    }

    const correlations: Correlation[] =
      [];

    for (const state of states) {
      const stateAlerts =
        alertsByState.get(state) ?? [];

      const stateWeather =
        weatherByState.get(state);

      if (!stateWeather) {
        continue;
      }

      const hazards =
        new Set<string>();

      const signals: string[] =
        [];

      let score = 0;

      /*
       * OFFICIAL ALERT SIGNALS
       */
      for (const alert of stateAlerts) {
        const disaster =
          normalize(
            alert.disaster_type
          );

        const severity =
          normalize(
            alert.severity
          );

        const message =
          normalize(
            alert.warning_message
          );

        if (
          disaster.includes("flood")
        ) {
          hazards.add("Flood");

          score += 30;

          signals.push(
            "Official flood alert detected"
          );
        }

        if (
          disaster.includes("cyclone") ||
          disaster.includes("storm")
        ) {
          hazards.add("Storm");

          score += 30;

          signals.push(
            "Official storm alert detected"
          );
        }

        if (
          disaster.includes("landslide")
        ) {
          hazards.add(
            "Landslide"
          );

          score += 25;

          signals.push(
            "Official landslide alert detected"
          );
        }

        if (
          disaster.includes("earthquake")
        ) {
          hazards.add(
            "Earthquake"
          );

          score += 35;

          signals.push(
            "Official earthquake alert detected"
          );
        }

        if (
          severity.includes(
            "extreme"
          ) ||
          severity.includes(
            "critical"
          )
        ) {
          score += 25;
        }

        if (
          message.includes(
            "evacuation"
          ) ||
          message.includes(
            "immediate"
          ) ||
          message.includes(
            "danger"
          )
        ) {
          score += 15;
        }
      }

      /*
       * WEATHER SIGNALS
       */
      const temperature =
        numberValue(
          stateWeather.temperature
        );

      const precipitation =
        numberValue(
          stateWeather.precipitation
        );

      const wind = Math.max(
        numberValue(
          stateWeather.windSpeed
        ),
        numberValue(
          stateWeather.windGusts
        )
      );

      if (
        precipitation >= 20
      ) {
        hazards.add(
          "Heavy Rain"
        );

        score += 20;

        signals.push(
          `Heavy precipitation detected (${precipitation} mm)`
        );
      }

      if (
        precipitation >= 50
      ) {
        score += 15;

        signals.push(
          "Very high precipitation increases flood concern"
        );
      }

      if (wind >= 50) {
        hazards.add(
          "Strong Wind"
        );

        score += 20;

        signals.push(
          `Strong wind detected (${wind} km/h)`
        );
      }

      if (wind >= 70) {
        score += 15;

        signals.push(
          "Severe wind conditions detected"
        );
      }

      if (
        temperature >= 42
      ) {
        hazards.add(
          "Extreme Heat"
        );

        score += 25;

        signals.push(
          `Extreme temperature detected (${temperature}°C)`
        );
      }

      /*
       * CROSS-SIGNAL CORRELATIONS
       */
      const hasFlood =
        hazards.has("Flood");

      const hasRain =
        hazards.has(
          "Heavy Rain"
        );

      const hasStorm =
        hazards.has("Storm");

      const hasWind =
        hazards.has(
          "Strong Wind"
        );

      const hasHeat =
        hazards.has(
          "Extreme Heat"
        );

      if (
        hasFlood &&
        hasRain
      ) {
        score += 30;

        signals.push(
          "Flood + heavy rainfall correlation detected"
        );
      }

      if (
        hasStorm &&
        hasWind
      ) {
        score += 30;

        signals.push(
          "Storm + strong wind correlation detected"
        );
      }

      if (
        hasHeat &&
        temperature >= 45
      ) {
        score += 25;

        signals.push(
          "Extreme heat amplification detected"
        );
      }

      /*
       * Only create a correlation
       * when meaningful signals exist.
       */
      if (
        hazards.size === 0 &&
        stateAlerts.length === 0
      ) {
        continue;
      }

      let level:
        | "CRITICAL"
        | "HIGH"
        | "MODERATE";

      if (score >= 100) {
        level = "CRITICAL";
      } else if (score >= 65) {
        level = "HIGH";
      } else {
        level = "MODERATE";
      }

      let explanation =
        "Multiple emergency signals detected.";

      if (
        hasFlood &&
        hasRain
      ) {
        explanation =
          "Official flood risk is occurring alongside significant rainfall, increasing the potential for worsening flood conditions.";
      } else if (
        hasStorm &&
        hasWind
      ) {
        explanation =
          "Official storm activity is occurring alongside strong winds, creating a higher-impact weather pattern.";
      } else if (
        hasHeat
      ) {
        explanation =
          "High-temperature conditions indicate elevated heat stress potential.";
      } else if (
        stateAlerts.length > 0
      ) {
        explanation =
          "Official emergency alerts are active in this state and require monitoring.";
      }

      const recommendation =
        level === "CRITICAL"
          ? "Prioritize this region for immediate operational review."
          : level === "HIGH"
            ? "Maintain elevated monitoring and review official alerts."
            : "Continue monitoring official alerts and weather conditions.";

      correlations.push({
        id: `${state}-${level}`,
        state,
        level,
        score: Math.min(
          score,
          150
        ),
        hazards:
          Array.from(
            hazards
          ),
        signals:
          Array.from(
            new Set(signals)
          ).slice(0, 6),
        explanation,
        recommendation,
      });
    }

    /*
     * Highest-risk correlations first.
     */
    correlations.sort(
      (a, b) =>
        b.score - a.score
    );

    const criticalCount =
      correlations.filter(
        (item) =>
          item.level ===
          "CRITICAL"
      ).length;

    const highCount =
      correlations.filter(
        (item) =>
          item.level ===
          "HIGH"
      ).length;

    const moderateCount =
      correlations.filter(
        (item) =>
          item.level ===
          "MODERATE"
      ).length;

    const responseTimeMs =
      Date.now() - startedAt;

    return NextResponse.json(
      {
        success: true,
        generatedAt:
          new Date().toISOString(),
        responseTimeMs,

        summary: {
          totalCorrelations:
            correlations.length,
          critical:
            criticalCount,
          high:
            highCount,
          moderate:
            moderateCount,
        },

        correlations,

        methodology: {
          type:
            "rule-based multi-signal correlation",
          inputs: [
            "NDMA SACHET official alerts",
            "Open-Meteo weather observations",
            "State-level signal matching",
          ],
          disclaimer:
            "Correlation scores are analytical indicators generated from available data. They are not official government warnings or forecasts.",
        },

        sources: {
          alerts:
            "NDMA SACHET",
          weather:
            "Open-Meteo",
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    const responseTimeMs =
      Date.now() - startedAt;

    const isTimeout =
      error instanceof Error &&
      error.name ===
        "AbortError";

    console.error(
      "Correlation engine error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        correlations: [],
        responseTimeMs,
        error: isTimeout
          ? "Correlation data request timed out"
          : "Unable to generate emergency correlations",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}