import React from "react";
import { render, screen } from "@testing-library/react";
import { Navbar } from "@/components/partials/Navbar";
import { useAuth } from "@/store/auth-context";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));

// Mock framer-motion to avoid animation issues in Jest JSDOM
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, whileHover, whileTap, transition, initial, animate, exit, variants, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock Auth Context
jest.mock("@/store/auth-context", () => ({
  useAuth: jest.fn(),
}));

describe("Navbar Component", () => {
  it("renders brand logo and basic navigation links", () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      logout: jest.fn(),
      user: null,
    });

    render(<Navbar />);

    expect(screen.getByText("buzzclips")).toBeInTheDocument();
    expect(screen.getByText("Video Editor").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("Explore").closest("a")).toHaveAttribute("href", "/explore");
  });

  it("shows Sign In button when unauthenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      logout: jest.fn(),
      user: null,
    });

    render(<Navbar />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows user avatar and hides Sign In button when authenticated", () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      logout: jest.fn(),
      user: {
        userId: "u123",
        user_name: "TestUser",
        user_email: "test@example.com",
        avatar_url: "/avatar.png",
      },
    });

    render(<Navbar />);

    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("renders default fallback avatar letter when user name and avatar are empty", () => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      logout: jest.fn(),
      user: {
        userId: "u456",
        user_name: "",
        user_email: "anon@example.com",
        avatar_url: "",
      },
    });

    render(<Navbar />);
    expect(screen.getByText("U")).toBeInTheDocument();
  });
});
