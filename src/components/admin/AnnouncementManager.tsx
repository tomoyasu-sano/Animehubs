"use client";

import { useEffect, useState, useCallback } from "react";

interface AnnouncementState {
  id?: string;
  messageEn: string;
  messageSv: string;
  active: boolean;
}

export default function AnnouncementManager() {
  const [announcement, setAnnouncement] = useState<AnnouncementState>({
    messageEn: "",
    messageSv: "",
    active: false,
  });
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [announcementRes, subscribersRes] = await Promise.all([
        fetch("/api/announcements/active"),
        fetch("/api/admin/newsletter/subscribers"),
      ]);

      if (announcementRes.ok) {
        const data = (await announcementRes.json()) as {
          announcement: { id: string; messageEn: string; messageSv: string } | null;
        };
        if (data.announcement) {
          setAnnouncement({
            id: data.announcement.id,
            messageEn: data.announcement.messageEn,
            messageSv: data.announcement.messageSv,
            active: true,
          });
        } else {
          setAnnouncement((prev) => ({ ...prev, active: false }));
        }
      }

      if (subscribersRes.ok) {
        const data = (await subscribersRes.json()) as { count: number };
        setSubscriberCount(data.count);
      }
    } catch {
      console.error("Failed to fetch announcement data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: announcement.id,
          messageEn: announcement.messageEn,
          messageSv: announcement.messageSv,
          active: announcement.active,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMessage({ type: "error", text: data.error || "Failed to save" });
        return;
      }

      setMessage({ type: "success", text: "Saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "Failed to save announcement" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Announcement Banner</h2>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Announcement Banner</h2>

      <div className="space-y-4">
        {/* Active トグル */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Display:</label>
          <button
            type="button"
            onClick={() =>
              setAnnouncement((prev) => ({ ...prev, active: !prev.active }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              announcement.active ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                announcement.active ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-gray-500">
            {announcement.active ? "ON" : "OFF"}
          </span>
        </div>

        {/* English Message (ONの時のみ表示) */}
        {announcement.active && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            English Message
          </label>
          <input
            type="text"
            value={announcement.messageEn}
            onChange={(e) =>
              setAnnouncement((prev) => ({ ...prev, messageEn: e.target.value }))
            }
            maxLength={500}
            placeholder="New items arriving June 15!"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">{announcement.messageEn.length}/500</p>
        </div>
        )}

        {/* Swedish Message (ONの時のみ表示) */}
        {announcement.active && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Swedish Message
          </label>
          <input
            type="text"
            value={announcement.messageSv}
            onChange={(e) =>
              setAnnouncement((prev) => ({ ...prev, messageSv: e.target.value }))
            }
            maxLength={500}
            placeholder="Nya varor kommer 15 juni!"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">{announcement.messageSv.length}/500</p>
        </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || (announcement.active && (!announcement.messageEn || !announcement.messageSv))}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          {message && (
            <span
              className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
            >
              {message.text}
            </span>
          )}
        </div>

        {/* Subscriber Count */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">
            Newsletter subscribers: <span className="font-semibold text-gray-900">{subscriberCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
