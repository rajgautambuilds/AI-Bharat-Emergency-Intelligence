import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Alert = {
  severity?: string;
  severity_level?: string;
  disaster_type?: string;
  area_description?: string;
  warning_message?: string;
  effective_start_time?: string;
  effective_end_time?: string;
  alert_source?: string;
  identifier?: string;
};

type WeatherItem = {
  state?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  temperature?: number;
  temperature_2m?: number;
  humidity?: number;
  relative_humidity_2m?: number;
  apparentTemperature?: number;
  apparent_temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  wind_speed_10m?: number;
  windGust?: number;
  wind_gusts_10m?: number;
  weatherCode?: number;
  weather_code?: number;
};

type WeatherResponse = {
  success?: boolean;
  data?: WeatherItem[];
};

type AlertResponse = {
  success?: boolean;
  alerts?: Alert[];
};

type Priority = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

type StateAttention = {
  state: string;
  score: number;
  level: Priority;
  reasons: string[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalize(value: unknown): string {
  return text(value).trim().toLowerCase();
}

function getAlertScore(alert: Alert): number {
  const severity = normalize(
    alert.severity_level || alert.severity
  );

  const disaster = normalize(alert.disaster_type);
  const message = normalize(alert.warning_message);

  let score = 0;

  // Official severity
  if (
    severity.includes("extreme") ||
    severity.includes("critical")
  ) {
    score += 100;
  } else if (
    severity.includes("severe") ||
    severity.includes("high")
  ) {
    score += 75;
  } else if (
    severity.includes("moderate") ||
    severity.includes("warning")
  ) {
    score += 45;
  } else {
    score += 20;
  }

  // High-impact hazards
  if (
    disaster.includes("flood") ||
    disaster.includes("cyclone") ||
    disaster.includes("storm") ||
    disaster.includes("landslide") ||
    disaster.includes("earthquake")
  ) {
    score += 20;
  }

  // Emergency language
  if (
    message.includes("evacuation") ||
    message.includes("evacuate") ||
    message.includes("danger") ||
    message.includes("life") ||
    message.includes("immediate")
  ) {
    score += 15;
  }

  return score;
}

function getPriority(score: number): Priority {
  if (score >= 100) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

function getWeatherRisk(weather: WeatherItem): {
  score: number;
  reasons: string[];
} {
  const temperature = number(
    weather.temperature_2m ?? weather.temperature
  );

  const humidity = number(
    weather.relative_humidity_2m ?? weather.humidity
  );

  const precipitation = number(weather.precipitation);

  const windSpeed = number(
    weather.wind_speed_10m ?? weather.windSpeed
  );

  const windGust = number(
    weather.wind_gusts_10m ?? weather.windGust
  );

  const reasons: string[] = [];
  let score = 0;

  if (temperature >= 45) {
    score += 50;
    reasons.push("Extreme heat conditions");
  } else if (temperature >= 42) {
    score += 35;
    reasons.push("Very high temperature");
  } else if (temperature >= 40) {
    score += 20;
    reasons.push("High temperature");
  }

  if (precipitation >= 30) {
    score += 45;
    reasons.push("Heavy precipitation signal");
  } else if (precipitation >= 15) {
    score += 30;
    reasons.push("Moderate precipitation signal");
  } else if (precipitation >= 5) {
    score += 15;
    reasons.push("Rainfall signal");
  }

  if (windGust >= 80) {
    score += 45;
    reasons.push("Very strong wind gusts");
  } else if (windGust >= 60) {
    score += 30;
    reasons.push("Strong wind gusts");
  } else if (windSpeed >= 40) {
    score += 20;
    reasons.push("High wind speed");
  }

  if (humidity >= 90 && precipitation >= 10) {
    score += 15;
    reasons.push("High humidity with rainfall");
  }

  return {
    score,
    reasons,
  };
}

function getStateName(weather: WeatherItem): string {
  return text(weather.state || weather.name || "Unknown");
}

function getAlertState(alert: Alert): string {
  return text(alert.area_description || "Unknown");
}

function isFloodRelated(value: string): boolean {
  return (
    value.includes("flood") ||
    value.includes("flash flood") ||
    value.includes("waterlogging")
  );
}

function isStormRelated(value: string): boolean {
  return (
    value.includes("storm") ||
    value.includes("cyclone") ||
    value.includes("thunderstorm") ||
    value.includes("strong wind") ||
    value.includes("wind")
  );
}

function isHeatRelated(value: string): boolean {
  return (
    value.includes("heat") ||
    value.includes("hot") ||
    value.includes("temperature")
  );
}

function isRainRelated(value: string): boolean {
  return (
    value.includes("rain") ||
    value.includes("heavy rainfall") ||
    value.includes("precipitation")
  );
}

function buildSituation(
  overallLevel: Priority,
  officialAlerts: number,
  weatherLocations: number,
  attentionStates: StateAttention[]
): string {
  if (overallLevel === "CRITICAL") {
    return `Critical intelligence conditions detected across the monitored network. ${officialAlerts} official alert signals and ${attentionStates.length} high-attention state signals require priority review.`;
  }

  if (overallLevel === "HIGH") {
    return `Elevated emergency conditions are being observed. Official alerts and environmental signals indicate multiple areas requiring operational attention.`;
  }

  if (overallLevel === "MODERATE") {
    return `Moderate emergency activity is present across the monitored network. Continue active monitoring of official alerts and environmental conditions.`;
  }

  return `No critical dashboard-derived escalation detected across the currently monitored ${weatherLocations} weather locations. Continue routine monitoring of official sources.`;
}

export async function GET(request: Request) {
  try {
    /*
     * IMPORTANT:
     * Use the actual deployment origin instead of
     * localhost:3000. This works both locally and on Vercel.
     */
    const baseUrl = new URL(request.url).origin;

    const [alertsResponse, weatherResponse] = await Promise.all([
      fetch(`${baseUrl}/api/alerts`, {
        next: { revalidate: 300 },
      }),
      fetch(`${baseUrl}/api/weather`, {
        next: { revalidate: 300 },
      }),
    ]);

    if (!alertsResponse.ok) {
      throw new Error(
        `Alerts API returned ${alertsResponse.status}`
      );
    }

    if (!weatherResponse.ok) {
      throw new Error(
        `Weather API returned ${weatherResponse.status}`
      );
    }

    const alertData =
      (await alertsResponse.json()) as AlertResponse;

    const weatherData =
      (await weatherResponse.json()) as WeatherResponse;

    const alerts = Array.isArray(alertData.alerts)
      ? alertData.alerts
      : [];

    const weather = Array.isArray(weatherData.data)
      ? weatherData.data
      : [];

    /*
     * ---------------------------------------------------------
     * 1. OFFICIAL ALERT ANALYSIS
     * ---------------------------------------------------------
     */

    const alertScores = alerts.map((alert) => {
      const score = getAlertScore(alert);

      return {
        alert,
        score,
        priority: getPriority(score),
      };
    });

    const criticalAlerts = alertScores.filter(
      (item) => item.priority === "CRITICAL"
    ).length;

    const highAlerts = alertScores.filter(
      (item) => item.priority === "HIGH"
    ).length;

    /*
     * ---------------------------------------------------------
     * 2. WEATHER RISK ANALYSIS
     * ---------------------------------------------------------
     */

    const weatherRisks = weather.map((item) => {
      const risk = getWeatherRisk(item);

      return {
        ...item,
        riskScore: risk.score,
        reasons: risk.reasons,
      };
    });

    /*
     * ---------------------------------------------------------
     * 3. STATE CORRELATION
     * ---------------------------------------------------------
     */

    const stateMap = new Map<string, StateAttention>();

    function ensureState(state: string): StateAttention {
      const existing = stateMap.get(state);

      if (existing) {
        return existing;
      }

      const created: StateAttention = {
        state,
        score: 0,
        level: "LOW",
        reasons: [],
      };

      stateMap.set(state, created);

      return created;
    }

    // Add weather intelligence
    for (const item of weatherRisks) {
      const state = getStateName(item);

      if (state === "Unknown") continue;

      const entry = ensureState(state);

      entry.score += item.riskScore;

      for (const reason of item.reasons) {
        if (!entry.reasons.includes(reason)) {
          entry.reasons.push(reason);
        }
      }
    }

    // Add official alert intelligence
    for (const item of alertScores) {
      const state = getAlertState(item.alert);

      if (state === "Unknown") continue;

      /*
       * Area descriptions can contain multiple locations.
       * We use text matching rather than claiming an exact
       * geographic relationship.
       */

      for (const weatherItem of weatherRisks) {
        const weatherState = getStateName(weatherItem);

        if (
          weatherState === "Unknown" ||
          !state
            .toLowerCase()
            .includes(weatherState.toLowerCase())
        ) {
          continue;
        }

        const entry = ensureState(weatherState);

        entry.score += item.score;

        const alertReason = `${
          item.alert.disaster_type || "Emergency"
        } official alert`;

        if (!entry.reasons.includes(alertReason)) {
          entry.reasons.push(alertReason);
        }

        const alertText = normalize(
          `${item.alert.disaster_type || ""} ${
            item.alert.warning_message || ""
          }`
        );

        const weatherReasons = weatherItem.reasons
          .join(" ")
          .toLowerCase();

        /*
         * Correlation bonus:
         * alert type and environmental signal point
         * toward a similar hazard.
         */

        let correlationReason = "";

        if (
          isFloodRelated(alertText) &&
          (isRainRelated(weatherReasons) ||
            (weatherItem.precipitation !== undefined &&
              number(weatherItem.precipitation) >= 10))
        ) {
          entry.score += 35;
          correlationReason =
            "Flood alert + rainfall signal correlation";
        } else if (
          isStormRelated(alertText) &&
          (weatherItem.wind_speed_10m !== undefined ||
            weatherItem.windSpeed !== undefined) &&
          number(
            weatherItem.wind_gusts_10m ??
              weatherItem.windGust
          ) >= 40
        ) {
          entry.score += 35;
          correlationReason =
            "Storm alert + strong wind correlation";
        } else if (
          isHeatRelated(alertText) &&
          number(
            weatherItem.temperature_2m ??
              weatherItem.temperature
          ) >= 40
        ) {
          entry.score += 35;
          correlationReason =
            "Heat alert + high temperature correlation";
        }

        if (
          correlationReason &&
          !entry.reasons.includes(correlationReason)
        ) {
          entry.reasons.push(correlationReason);
        }
      }
    }

    /*
     * ---------------------------------------------------------
     * 4. FINAL STATE PRIORITIES
     * ---------------------------------------------------------
     */

    const attentionStates = Array.from(
      stateMap.values()
    )
      .map((state) => {
        let level: Priority = "LOW";

        if (state.score >= 180) {
          level = "CRITICAL";
        } else if (state.score >= 110) {
          level = "HIGH";
        } else if (state.score >= 50) {
          level = "MODERATE";
        }

        return {
          ...state,
          level,
          reasons: state.reasons.slice(0, 5),
        };
      })
      .sort((a, b) => b.score - a.score);

    /*
     * ---------------------------------------------------------
     * 5. TOP HAZARDS
     * ---------------------------------------------------------
     */

    const hazardCounts = new Map<string, number>();

    for (const alert of alerts) {
      const hazard =
        text(alert.disaster_type).trim() ||
        "Unknown emergency";

      hazardCounts.set(
        hazard,
        (hazardCounts.get(hazard) || 0) + 1
      );
    }

    const topHazards = Array.from(
      hazardCounts.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([hazard, count]) => ({
        hazard,
        count,
      }));

    /*
     * ---------------------------------------------------------
     * 6. CORRELATION SIGNALS
     * ---------------------------------------------------------
     */

    const correlationSignals: string[] = [];

    for (const state of attentionStates) {
      if (
        state.reasons.some((reason) =>
          reason.toLowerCase().includes("correlation")
        )
      ) {
        correlationSignals.push(
          `${state.state}: ${state.reasons
            .filter((reason) =>
              reason
                .toLowerCase()
                .includes("correlation")
            )
            .join(", ")}`
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * 7. OVERALL PRIORITY
     * ---------------------------------------------------------
     */

    const topStateScore =
      attentionStates[0]?.score || 0;

    let overallLevel: Priority = "LOW";

    if (
      criticalAlerts > 0 ||
      topStateScore >= 180
    ) {
      overallLevel = "CRITICAL";
    } else if (
      highAlerts >= 2 ||
      topStateScore >= 110
    ) {
      overallLevel = "HIGH";
    } else if (
      alerts.length > 0 ||
      topStateScore >= 50
    ) {
      overallLevel = "MODERATE";
    }

    /*
     * ---------------------------------------------------------
     * 8. RECOMMENDATIONS
     * ---------------------------------------------------------
     */

    const recommendations: string[] = [];

    if (criticalAlerts > 0) {
      recommendations.push(
        "Prioritize review of critical official SACHET alerts."
      );
    }

    if (highAlerts > 0) {
      recommendations.push(
        "Review high-priority official alerts and affected areas."
      );
    }

    if (correlationSignals.length > 0) {
      recommendations.push(
        "Review alert-weather correlation signals for possible escalation."
      );
    }

    if (
      weatherRisks.some(
        (item) => item.riskScore >= 45
      )
    ) {
      recommendations.push(
        "Monitor locations showing elevated environmental risk signals."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Continue routine monitoring of official emergency sources and environmental conditions."
      );
    }

    /*
     * ---------------------------------------------------------
     * 9. CONFIDENCE
     * ---------------------------------------------------------
     *
     * This is analytical confidence, not probability of an
     * emergency occurring.
     */

    let confidence = 70;

    if (alerts.length > 0) {
      confidence += 10;
    }

    if (weather.length > 0) {
      confidence += 10;
    }

    if (correlationSignals.length > 0) {
      confidence += 5;
    }

    confidence = Math.min(confidence, 95);

    /*
     * ---------------------------------------------------------
     * 10. FINAL RESPONSE
     * ---------------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      generatedAt: new Date().toISOString(),

      overallLevel,

      situation: buildSituation(
        overallLevel,
        alerts.length,
        weather.length,
        attentionStates
      ),

      officialAlerts: {
        total: alerts.length,
        critical: criticalAlerts,
        high: highAlerts,
        moderate: alertScores.filter(
          (item) => item.priority === "MODERATE"
        ).length,
        low: alertScores.filter(
          (item) => item.priority === "LOW"
        ).length,
      },

      weather: {
        monitoredLocations: weather.length,
        elevatedRiskLocations:
          weatherRisks.filter(
            (item) => item.riskScore >= 30
          ).length,
      },

      topHazards,

      attentionStates: attentionStates.slice(0, 10),

      correlationSignals: correlationSignals.slice(
        0,
        10
      ),

      recommendations,

      confidence,

      disclaimer:
        "This is dashboard-generated decision-support intelligence based on live weather data and official SACHET alert feeds. It is not an official government warning, emergency declaration, or prediction. Always follow instructions from authorized authorities.",

      sources: {
        officialAlerts: "NDMA SACHET",
        officialAlertsUrl:
          "https://sachet.ndma.gov.in/",
        weather: "Open-Meteo",
        map: "OpenStreetMap",
      },
    });
  } catch (error) {
    console.error("AI Analyst error:", error);

    return NextResponse.json(
      {
        success: false,
        overallLevel: "LOW",
        situation:
          "AI Emergency Analyst is temporarily unable to process live intelligence data.",
        officialAlerts: {
          total: 0,
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
        },
        weather: {
          monitoredLocations: 0,
          elevatedRiskLocations: 0,
        },
        topHazards: [],
        attentionStates: [],
        correlationSignals: [],
        recommendations: [
          "Check the live data sources and retry the analysis.",
        ],
        confidence: 0,
        disclaimer:
          "Analyst data is currently unavailable. This dashboard does not replace official emergency warnings.",
        error: "Unable to generate analyst intelligence",
      },
      { status: 500 }
    );
  }
}