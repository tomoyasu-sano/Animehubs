import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetActiveAnnouncement = vi.fn();
vi.mock("@/lib/db/announcement-queries", () => ({
  getActiveAnnouncement: () => mockGetActiveAnnouncement(),
}));

describe("GET /api/announcements/active", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なバナーがある場合、announcement を返す", async () => {
    const announcement = { messageEn: "New items!", messageSv: "Nya varor!" };
    mockGetActiveAnnouncement.mockResolvedValue(announcement);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ announcement });
  });

  it("有効なバナーがない場合、null を返す", async () => {
    mockGetActiveAnnouncement.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ announcement: null });
  });
});
