import * as React from "react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminPanel from "./AdminPanel";

const mockIcons = [
  { id: "1", name: "Icon 1", mainCategory: "icon", subCategory: "food", tags: [] }
];

const mockCategories = [{ _id: "cat1", main: "icon", sub: "food" }];

const baseProps = {
  icons: mockIcons,
  setIcons: vi.fn(),
  adminName: "Admin",
  theme: "light" as const,
  onToggleTheme: vi.fn(),
  onLogout: vi.fn(),
  onNavigate: vi.fn(),
  isAdmin: true,
  apiBaseUrl: "http://localhost:4000",
  authToken: "token",
  categories: [{ main: "icon", subs: ["food"] }],
  rawCategories: mockCategories,
  categoriesLoading: false,
  categoriesError: "",
  onRefreshIcons: vi.fn(() => Promise.resolve()),
  onRefreshCategories: vi.fn(() => Promise.resolve())
};

let fetchMock: ReturnType<typeof vi.fn>;

const openCategoriesSection = () => {
  fireEvent.click(screen.getByText("Categories", { selector: ".menu-item span" }));
};

const openAddCategoryModal = () => {
  openCategoriesSection();
  const button = document.querySelector(
    ".content-header .btn.btn-primary"
  ) as HTMLButtonElement | null;
  if (button) {
    fireEvent.click(button);
  }
};

const clickModalSaveButton = () => {
  const button = document.querySelector(
    ".modal.active .btn-success"
  ) as HTMLButtonElement | null;
  if (button) {
    fireEvent.click(button);
  }
};

const waitForCategoriesLoaded = async () => {
  await waitFor(() => {
    expect(screen.queryByText("Loading categories...")).not.toBeInTheDocument();
  });
};

describe("AdminPanel category management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    window.confirm = vi.fn(() => true);
  });

  it("renders categories list", async () => {
    render(<AdminPanel {...baseProps} />);
    openCategoriesSection();
    await waitForCategoriesLoaded();
    expect(screen.getByText("food", { selector: "td" })).toBeInTheDocument();
  });

  it("validates empty category name on add", async () => {
    render(<AdminPanel {...baseProps} />);
    openAddCategoryModal();
    clickModalSaveButton();

    await waitFor(() => {
      expect(screen.getByText("Please enter sub category name")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prevents duplicate category creation", async () => {
    render(<AdminPanel {...baseProps} />);
    openAddCategoryModal();
    fireEvent.change(screen.getByPlaceholderText("e.g., Animals"), {
      target: { value: "food" }
    });
    clickModalSaveButton();

    await waitFor(() => {
      expect(screen.getByText("Category already exists")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("adds a category successfully", async () => {
    render(<AdminPanel {...baseProps} />);
    openAddCategoryModal();
    fireEvent.change(screen.getByPlaceholderText("e.g., Animals"), {
      target: { value: "Animals" }
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: "newcat", main: "icon", sub: "Animals" })
    } as Response);

    clickModalSaveButton();

    await waitFor(() => {
      expect(baseProps.onRefreshCategories).toHaveBeenCalled();
    });
  });

  it("edits an existing category", async () => {
    render(<AdminPanel {...baseProps} />);
    openCategoriesSection();
    await waitForCategoriesLoaded();
    fireEvent.click(screen.getByTestId("edit-category-cat1"));
    fireEvent.change(screen.getByPlaceholderText("e.g., Animals"), {
      target: { value: "updated-food" }
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _id: "cat1", main: "icon", sub: "updated-food" })
    } as Response);

    const saveButton = document.querySelector(
      ".modal.active .btn-success"
    ) as HTMLButtonElement | null;
    if (saveButton) {
      fireEvent.click(saveButton);
    }

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:4000/api/categories/cat1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ main: "icon", sub: "updated-food" })
        })
      );
    });
  });

  it("deletes a category with confirmation", async () => {
    render(<AdminPanel {...baseProps} />);
    openCategoriesSection();
    await waitForCategoriesLoaded();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Category deleted" })
    } as Response);

    fireEvent.click(screen.getByTestId("delete-category-cat1"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:4000/api/categories/cat1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("handles network failure during add", async () => {
    render(<AdminPanel {...baseProps} />);
    openAddCategoryModal();
    fireEvent.change(screen.getByPlaceholderText("e.g., Animals"), {
      target: { value: "Animals" }
    });

    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    clickModalSaveButton();

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
