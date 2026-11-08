import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StatusPage from "@/app/status/page";
import * as requests from "@/utility/requests";

describe("StatusPage Component", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("renders status page with all monitored services and default healthy state", async () => {
    const mockHealth = {
      status: "UP",
      timestamp: Date.now(),
      services: {
        postgres: { status: "UP", latencyMs: 4, details: "PostgreSQL responding normally" },
        redis: { status: "UP", latencyMs: 2, details: "Redis cache responding normally" },
        rabbitmq: { status: "UP", latencyMs: 5, details: "RabbitMQ connection open" },
        firebase: { status: "UP", latencyMs: 1, details: "Firebase Admin SDK active" },
        s3: { status: "UP", latencyMs: 25, details: "AWS S3 storage bucket verified" },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as unknown as Response);

    render(<StatusPage />);

    expect(screen.getByText("System Status")).toBeInTheDocument();
    expect(screen.getByText(/Live Cloud Infrastructure Monitor/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL Database")).toBeInTheDocument();
      expect(screen.getByText("Redis Cache & Buffer")).toBeInTheDocument();
      expect(screen.getByText("RabbitMQ Broker")).toBeInTheDocument();
      expect(screen.getByText("Firebase Admin SDK")).toBeInTheDocument();
      expect(screen.getByText("AWS S3 Object Storage")).toBeInTheDocument();
    });
  });

  it("displays degraded state when a service is degraded", async () => {
    const mockDegraded = {
      status: "DEGRADED",
      timestamp: Date.now(),
      services: {
        postgres: { status: "UP", latencyMs: 4 },
        redis: { status: "DEGRADED", latencyMs: 120, details: "High latency detected" },
        rabbitmq: { status: "UP", latencyMs: 5 },
        firebase: { status: "UP", latencyMs: 1 },
        s3: { status: "UP", latencyMs: 25 },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDegraded,
    } as unknown as Response);

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Degraded Performance Detected")).toBeInTheDocument();
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });
  });

  it("handles refresh button click", async () => {
    const mockHealth = {
      status: "UP",
      timestamp: Date.now(),
      services: {
        postgres: { status: "UP", latencyMs: 4 },
      },
    };

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as unknown as Response);
    global.fetch = fetchMock;

    render(<StatusPage />);

    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  it("displays service disruption state when backend is unreachable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network connection refused"));

    render(<StatusPage />);

    await waitFor(() => {
      expect(screen.getByText("Service Disruption Ongoing")).toBeInTheDocument();
      expect(screen.getAllByText("Offline / Disrupted").length).toBeGreaterThan(0);
    });
  });
});

describe("Health & View Tracking Requests", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetchSystemHealth calls /health and parses JSON", async () => {
    const mockResponse = { status: "UP", timestamp: 12345, services: {} };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await requests.fetchSystemHealth();
    expect(result).toEqual(mockResponse);
  });

  it("fetchSystemHealth throws on HTTP error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(requests.fetchSystemHealth()).rejects.toThrow("Health check returned HTTP 500");
  });

  it("recordVideoView returns true on successful POST", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
    } as unknown as Response);

    const result = await requests.recordVideoView(42);
    expect(result).toBe(true);
  });

  it("recordVideoView returns false on network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    const result = await requests.recordVideoView(42);
    expect(result).toBe(false);
  });
});
