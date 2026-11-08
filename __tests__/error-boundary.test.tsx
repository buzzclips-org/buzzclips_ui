import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/app/error";

describe("ErrorBoundary (app/error.tsx)", () => {
  it("renders generic error state with try again button", () => {
    const mockReset = jest.fn();
    const error = new Error("Something broke inside component");

    render(<ErrorBoundary error={error} reset={mockReset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Something broke inside component")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    fireEvent.click(retryBtn);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("detects network / backend 500 error and renders Backend Service Unavailable", () => {
    const mockReset = jest.fn();
    const networkError = new Error("Failed to fetch from backend 500");

    render(<ErrorBoundary error={networkError} reset={mockReset} />);

    expect(screen.getByText("Backend Service Unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/We couldn't connect to the BuzzClips API servers/i)
    ).toBeInTheDocument();
  });
});
