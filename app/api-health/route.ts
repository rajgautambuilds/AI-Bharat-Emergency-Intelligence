import { NextResponse } from "next/server";

type ServiceStatus = {
  name: string;
  status: "UP" | "DOWN";
  responseTimeMs: number | null;
  message: string;
};

async function checkService(
  name: string,
  url: string
): Promise<ServiceStatus> {
  const start = Date.now();

  try {
    const response = await fetch(url, {
      cache: "no-store",
    });

    const responseTimeMs = Date.now() - start;

    if (!response.ok) {
      return {
        name,
        status: "DOWN",
        responseTimeMs,
        message: `HTTP ${response.status}`,
      };
    }

    return {
      name,
      status: "UP",
      responseTimeMs,
      message: "Service responding normally",
    };
  } catch (error) {
    const responseTimeMs = Date.now() - start;

    return {
      name,
      status: "DOWN",
      responseTimeMs,
      message:
        error instanceof Error
          ? error.message
          : "Connection failed",
    };
  }
}

export async function GET() {
  const start = Date.now();

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const services = await Promise.all([
      checkService(
        "NDMA SACHET",
        `${baseUrl}/api/alerts`
      ),

      checkService(
        "Open-Meteo Weather",
        `${baseUrl}/api/weather`
      ),

      checkService(
        "Correlation Engine",
        `${baseUrl}/api/correlation`
      ),
    ]);

    const healthyCount = services.filter(
      (service) => service.status === "UP"
    ).length;

    const totalServices = services.length;

    let overallStatus:
      | "OPERATIONAL"
      | "DEGRADED"
      | "OUTAGE";

    if (healthyCount === totalServices) {
      overallStatus = "OPERATIONAL";
    } else if (healthyCount > 0) {
      overallStatus = "DEGRADED";
    } else {
      overallStatus = "OUTAGE";
    }

    return NextResponse.json({
      success: true,

      status: overallStatus,

      healthyServices: healthyCount,

      totalServices,

      responseTimeMs: Date.now() - start,

      checkedAt: new Date().toISOString(),

      services,
    });
  } catch (error) {
    console.error(
      "API health check error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        status: "OUTAGE",
        healthyServices: 0,
        totalServices: 3,
        responseTimeMs: null,
        checkedAt: new Date().toISOString(),
        services: [],
        error:
          "Unable to complete health checks",
      },
      {
        status: 500,
      }
    );
  }
}