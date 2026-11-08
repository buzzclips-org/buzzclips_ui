import React from "react";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/partials/Footer";

describe("Footer Component", () => {
  it("renders about description and quick links without developer names", () => {
    render(<Footer />);

    expect(screen.getByText(/About \| BuzzClips/i)).toBeInTheDocument();
    expect(screen.queryByText("Ayushmaan Aggarwal")).not.toBeInTheDocument();
    expect(screen.queryByText("Rajit Kuthiala")).not.toBeInTheDocument();
    expect(screen.getByText("Tech Stack")).toBeInTheDocument();
    expect(screen.getByText("Contribute")).toBeInTheDocument();
    expect(screen.getByText("System Status")).toBeInTheDocument();
  });

  it("displays copyright with current year", () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${currentYear} BuzzClips \\| MIT License`, "i"))
    ).toBeInTheDocument();
  });

  it("displays build commit badge linking to github commit", () => {
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA = "584bd9a";
    process.env.NEXT_PUBLIC_BUILD_NUMBER = "42";

    render(<Footer />);

    expect(screen.getByText("build:")).toBeInTheDocument();
    expect(screen.getByText(/#42 • 584bd9a/i)).toBeInTheDocument();

    const commitLink = screen.getByRole("link", {
      name: /#42 • 584bd9a/i,
    });
    expect(commitLink).toHaveAttribute(
      "href",
      "https://github.com/bideo-org/bideo_ui/commit/584bd9a"
    );
  });

  it("handles commit SHA without build number", () => {
    delete process.env.NEXT_PUBLIC_BUILD_NUMBER;
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA = "abcdef123456";

    render(<Footer />);

    expect(screen.getByText("abcdef1")).toBeInTheDocument();
    const commitLink = screen.getByRole("link", {
      name: "abcdef1",
    });
    expect(commitLink).toHaveAttribute(
      "href",
      "https://github.com/bideo-org/bideo_ui/commit/abcdef1"
    );
  });

  it("links to repo root when commitSha is dev", () => {
    delete process.env.NEXT_PUBLIC_BUILD_NUMBER;
    process.env.NEXT_PUBLIC_GIT_COMMIT_SHA = "dev";

    // Mock fallbackBuildInfo by simulating dev
    render(<Footer />);

    const links = screen.getAllByRole("link");
    const commitLink = links.find((l) =>
      l.getAttribute("href") === "https://github.com/bideo-org/bideo_ui"
    );
    expect(commitLink).toBeDefined();
  });
});
