import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeleteVideoButton from "@/components/video/DeleteVideoButton";
import { useAuth } from "@/store/auth-context";
import { deleteVideo } from "@/utility/requests";
import { toast } from "sonner";
import { MESSAGES } from "@/constants/messages";

jest.mock("@/store/auth-context", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/utility/requests", () => ({
  deleteVideo: jest.fn(),
}));

const mockInvalidateQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("DeleteVideoButton Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders trigger button with delete icon and label", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });

    render(<DeleteVideoButton videoId={42} />);
    const button = screen.getByRole("button", { name: /delete video/i });
    expect(button).toBeInTheDocument();
  });

  it("opens confirmation dialog and deletes video on confirm", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });
    (deleteVideo as jest.Mock).mockResolvedValue("Deleted");

    render(<DeleteVideoButton videoId={42} />);

    // Click trigger to open dialog
    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    // Verify dialog content is shown
    expect(screen.getByText("Delete video?")).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone/i)
    ).toBeInTheDocument();

    // Click confirm action
    const confirmButton = screen.getByRole("button", { name: "Delete Video" });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteVideo).toHaveBeenCalledWith("user-123", 42, "token-abc");
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["userVideos"],
    });
    expect(toast.success).toHaveBeenCalledWith(MESSAGES.DELETED_SUCCESS);
  });

  it("shows error toast when deletion fails", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });
    (deleteVideo as jest.Mock).mockRejectedValue(new Error("Server error"));

    render(<DeleteVideoButton videoId={42} />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Video" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(MESSAGES.DELETED_ERROR);
    });
  });

  it("enables delete button when typing 'delete' or clicking auto-fill", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });
    (deleteVideo as jest.Mock).mockResolvedValue("Deleted");

    render(<DeleteVideoButton videoId={42} videoTitle="Epic Gaming Highlights" />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    const confirmButton = screen.getByRole("button", { name: "Delete Video" });
    // Button is disabled until confirmed
    expect(confirmButton).toBeDisabled();

    const input = screen.getByPlaceholderText(/Type "delete" to confirm/i);
    expect(input).toBeInTheDocument();

    // Type wrong string
    fireEvent.change(input, { target: { value: "Wrong Input" } });
    expect(confirmButton).toBeDisabled();

    // Type "delete"
    fireEvent.change(input, { target: { value: "delete" } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteVideo).toHaveBeenCalledWith("user-123", 42, "token-abc");
    });
    expect(toast.success).toHaveBeenCalledWith(MESSAGES.DELETED_SUCCESS);
  });

  it("enables delete button when clicking checkbox without typing", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });
    (deleteVideo as jest.Mock).mockResolvedValue("Deleted");

    render(<DeleteVideoButton videoId={42} videoTitle="Epic Gaming Highlights" />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    const confirmButton = screen.getByRole("button", { name: "Delete Video" });
    expect(confirmButton).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(deleteVideo).toHaveBeenCalledWith("user-123", 42, "token-abc");
    });
    expect(toast.success).toHaveBeenCalledWith(MESSAGES.DELETED_SUCCESS);
  });

  it("enables delete button via auto-fill button", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });

    render(<DeleteVideoButton videoId={42} videoTitle="Epic Gaming Highlights" />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    const confirmButton = screen.getByRole("button", { name: "Delete Video" });
    expect(confirmButton).toBeDisabled();

    const autoFillBtn = screen.getByRole("button", { name: /auto-fill "delete"/i });
    fireEvent.click(autoFillBtn);

    expect(confirmButton).not.toBeDisabled();
    const input = screen.getByPlaceholderText(/Type "delete" to confirm/i) as HTMLInputElement;
    expect(input.value).toBe("delete");
  });

  it("accepts typing the video title for confirmation", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });
    (deleteVideo as jest.Mock).mockResolvedValue("Deleted");

    render(<DeleteVideoButton videoId={42} videoTitle="Epic Gaming Highlights" />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    const confirmButton = screen.getByRole("button", { name: "Delete Video" });
    const input = screen.getByPlaceholderText(/Type "delete" to confirm/i);

    // Type matching title
    fireEvent.change(input, { target: { value: "Epic Gaming Highlights" } });
    expect(confirmButton).not.toBeDisabled();
  });

  it("submits deletion when pressing Enter in input with 'delete'", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { userId: "user-123" },
      token: "token-abc",
    });
    (deleteVideo as jest.Mock).mockResolvedValue("Deleted");

    render(<DeleteVideoButton videoId={42} videoTitle="My Drone Video" />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));

    const input = screen.getByPlaceholderText(/Type "delete" to confirm/i);

    // Type delete and hit Enter
    fireEvent.change(input, { target: { value: "delete" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(deleteVideo).toHaveBeenCalledWith("user-123", 42, "token-abc");
    });
  });

  it("shows error toast if user is unauthenticated", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      token: null,
    });

    render(<DeleteVideoButton videoId={42} />);

    fireEvent.click(screen.getByRole("button", { name: /delete video/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Video" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(MESSAGES.DELETED_ERROR);
    });
    expect(deleteVideo).not.toHaveBeenCalled();
  });
});
