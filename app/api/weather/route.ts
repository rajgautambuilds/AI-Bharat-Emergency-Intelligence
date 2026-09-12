import { NextResponse } from "next/server";

export const revalidate = 300;

const REQUEST_TIMEOUT = 8000;

const LOCATIONS = [
  // States
  { name: "Andhra Pradesh", latitude: 16.5062, longitude: 80.648 },
  { name: "Arunachal Pradesh", latitude: 27.0844, longitude: 93.6053 },
  { name: "Assam", latitude: 26.1445, longitude: 91.7362 },
  { name: "Bihar", latitude: 25.5941, longitude: 85.1376 },
  { name: "Chhattisgarh", latitude: 21.2514, longitude: 81.6296 },
  { name: "Goa", latitude: 15.4909, longitude: 73.8278 },
  { name: "Gujarat", latitude: 23.0225, longitude: 72.5714 },
  { name: "Haryana", latitude: 30.7333, longitude: 76.7794 },
  { name: "Himachal Pradesh", latitude: 31.1048, longitude: 77.1734 },
  { name: "Jharkhand", latitude: 23.3441, longitude: 85.3096 },
  { name: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
  { name: "Kerala", latitude: 8.5241, longitude: 76.9366 },
  { name: "Madhya Pradesh", latitude: 23.2599, longitude: 77.4126 },
  { name: "Maharashtra", latitude: 19.076, longitude: 72.8777 },
  { name: "Manipur", latitude: 24.817, longitude: 93.9368 },
  { name: "Meghalaya", latitude: 25.5788, longitude: 91.8933 },
  { name: "Mizoram", latitude: 23.7271, longitude: 92.7176 },
  { name: "Nagaland", latitude: 25.6751, longitude: 94.1086 },
  { name: "Odisha", latitude: 20.2961, longitude: 85.8245 },
  { name: "Punjab", latitude: 31.634, longitude: 74.8723 },
  { name: "Rajasthan", latitude: 26.9124, longitude: 75.7873 },
  { name: "Sikkim", latitude: 27.3389, longitude: 88.6065 },
  { name: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
  { name: "Telangana", latitude: 17.385, longitude: 78.4867 },
  { name: "Tripura", latitude: 23.8315, longitude: 91.2868 },
  { name: "Uttar Pradesh", latitude: 26.8467, longitude: 80.9462 },
  { name: "Uttarakhand", latitude: 30.0668, longitude: 79.0193 },
  { name: "West Bengal", latitude: 22.5726, longitude: 88.3639 },

  // Union Territories
  {
    name: "Andaman and Nicobar Islands",
    latitude: 11.7401,
    longitude: 92.6586,
  },
  {
    name: "Chandigarh",
    latitude: 30.7333,
    longitude: 76.7794,
  },
  {
    name: "Dadra and Nagar Haveli and Daman and Diu",
    latitude: 20.3974,
    longitude: 72.8328,
  },
  {
    name: "Delhi",
    latitude: 28.6139,
    longitude: 77.209,
  },
  {
    name: "Jammu and Kashmir",
    latitude: 34.0837,
    longitude: 74.7973,
  },
  {
    name: "Ladakh",
    latitude: 34.1526,
    longitude: 77.5771,
  },
  {
    name: "Lakshadweep",
    latitude: 10.5667,
    longitude: 72.6417,
  },
  {
    name: "Puducherry",
    latitude: 11.9416,
    longitude: 79.8083,
  },
];

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast";

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_gusts_10m",
].join(",");

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
  };
  timezone?: string;
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
) {
  const controller = new AbortController();

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

export async function GET() {
  const startedAt = Date.now();

  try {
    const latitude = LOCATIONS.map(
      (location) => location.latitude
    ).join(",");

    const longitude = LOCATIONS.map(
      (location) => location.longitude
    ).join(",");

    const url =
      `${WEATHER_URL}?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=${CURRENT_FIELDS}` +
      `&timezone=auto`;

    const response = await fetchWithTimeout(url, {
      next: {
        revalidate: 300,
      },
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Open-Meteo returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    /*
     * Open-Meteo returns an array when multiple coordinates
     * are requested. Normalize both array and single-object
     * responses for safer production handling.
     */
    const weatherResponses: OpenMeteoResponse[] =
      Array.isArray(data) ? data : [data];

    const weather = LOCATIONS.map(
      (location, index) => {
        const result = weatherResponses[index];

        return {
          state: location.name,
          latitude: location.latitude,
          longitude: location.longitude,

          temperature:
            result?.current?.temperature_2m ?? null,

          humidity:
            result?.current?.relative_humidity_2m ?? null,

          apparentTemperature:
            result?.current?.apparent_temperature ?? null,

          precipitation:
            result?.current?.precipitation ?? null,

          weatherCode:
            result?.current?.weather_code ?? null,

          windSpeed:
            result?.current?.wind_speed_10m ?? null,

          windGust:
            result?.current?.wind_gusts_10m ?? null,

          timezone:
            result?.timezone ?? null,
        };
      }
    );

    const responseTimeMs =
      Date.now() - startedAt;

    return NextResponse.json(
      {
        success: true,
        source: "Open-Meteo",
        sourceUrl:
          "https://open-meteo.com/",
        count: weather.length,
        updatedAt:
          new Date().toISOString(),
        responseTimeMs,
        data: weather,
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
      error.name === "AbortError";

    console.error(
      "Weather API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        source: "Open-Meteo",
        count: 0,
        data: [],
        responseTimeMs,
        error: isTimeout
          ? "Weather service request timed out"
          : "Unable to fetch weather data",
        updatedAt:
          new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}