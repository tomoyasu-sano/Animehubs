/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import RecommendedSkeleton from "./RecommendedSkeleton";

describe("RecommendedSkeleton", () => {
  it("4つのスケルトンカードが表示される", () => {
    const { container } = render(<RecommendedSkeleton />);

    const skeletonCards = container.querySelectorAll(".aspect-square.animate-pulse");
    expect(skeletonCards).toHaveLength(4);
  });

  it("セクション区切り線が表示される", () => {
    const { container } = render(<RecommendedSkeleton />);

    const section = container.firstChild as HTMLElement;
    expect(section.className).toContain("border-t");
    expect(section.className).toContain("border-border");
  });
});
