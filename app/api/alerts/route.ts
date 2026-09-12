import { NextResponse } from "next/server";

export const revalidate = 300;

const REQUEST_TIMEOUT = 8000;

const SACHET_URL =
  "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails";

const SACHET_SOURCE_URL =
  "https://sachet.ndma.gov.in/";

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
    const response = await fetchWithTimeout(
      SACHET_URL,
      {
        next: {
          revalidate: 300,
        },
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `SACHET returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const alerts = Array.isArray(data)
      ? data
      : [];

    const responseTimeMs =
      Date.now() - startedAt;

    return NextResponse.json(
      {
        success: true,
        source: "NDMA SACHET",
        sourceUrl: SACHET_SOURCE_URL,
        count: alerts.length,
        alerts,
        responseTimeMs,
        updatedAt:
          new Date().toISOString(),
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
      "SACHET API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        source: "NDMA SACHET",
        sourceUrl: SACHET_SOURCE_URL,
        count: 0,
        alerts: [],
        responseTimeMs,
        error: isTimeout
          ? "SACHET request timed out"
          : "Unable to fetch official SACHET alerts",
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