"use client";

import { useEffect, useState, useCallback } from "react";

interface SendHistoryItem {
  id: string;
  subjectEn: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  sentBy: string;
  sentAt: string;
}

interface SendDetail {
  id: string;
  subjectEn: string;
  subjectSv: string;
  bodyEn: string;
  bodySv: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  sentBy: string;
  sentAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sending: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    partial_failure: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminNewsletterPage() {
  // フォーム状態
  const [subjectEn, setSubjectEn] = useState("");
  const [subjectSv, setSubjectSv] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodySv, setBodySv] = useState("");
  const [includeRecentProducts, setIncludeRecentProducts] = useState(false);
  const [recentProductsDays, setRecentProductsDays] = useState(7);

  // UI 状態
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 送信履歴
  const [sends, setSends] = useState<SendHistoryItem[]>([]);
  const [sendsTotal, setSendsTotal] = useState(0);
  const [sendsOffset, setSendsOffset] = useState(0);
  const [sendsLoading, setSendsLoading] = useState(true);

  // 詳細表示
  const [selectedSend, setSelectedSend] = useState<SendDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 確認ダイアログ
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/newsletter/subscribers");
      if (res.ok) {
        const data = (await res.json()) as { count: number };
        setSubscriberCount(data.count);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchSends = useCallback(async (offset = 0) => {
    setSendsLoading(true);
    try {
      const res = await fetch(`/api/admin/newsletter/sends?limit=20&offset=${offset}`);
      if (res.ok) {
        const data = (await res.json()) as { sends: SendHistoryItem[]; total: number };
        setSends(data.sends);
        setSendsTotal(data.total);
        setSendsOffset(offset);
      }
    } catch {
      /* ignore */
    } finally {
      setSendsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
    fetchSends();
  }, [fetchSubscribers, fetchSends]);

  const handleSend = async (testMode: boolean) => {
    if (testMode) {
      setTestSending(true);
    } else {
      setSending(true);
    }
    setFormMessage(null);

    try {
      const res = await fetch("/api/admin/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectEn,
          subjectSv,
          bodyEn,
          bodySv,
          includeRecentProducts,
          recentProductsDays,
          testMode,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; sent?: number; failed?: number };

      if (!res.ok) {
        setFormMessage({ type: "error", text: data.error || "Failed to send" });
        return;
      }

      if (testMode) {
        setFormMessage({ type: "success", text: "Test email sent to your inbox!" });
      } else {
        setFormMessage({
          type: "success",
          text: `Sent to ${data.sent ?? 0} subscribers${(data.failed ?? 0) > 0 ? ` (${data.failed} failed)` : ""}`,
        });
        fetchSends();
      }
    } catch {
      setFormMessage({ type: "error", text: "Failed to send newsletter" });
    } finally {
      setSending(false);
      setTestSending(false);
      setShowConfirm(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/newsletter/sends/${id}`);
      if (res.ok) {
        const data = (await res.json()) as SendDetail;
        setSelectedSend(data);
      }
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  };

  const isFormValid = subjectEn && subjectSv && bodyEn && bodySv;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>

      {/* 送信フォーム */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Send Newsletter</h2>

        <p className="mb-4 text-sm text-gray-500">
          Recipients: <span className="font-semibold text-gray-900">{subscriberCount}</span> subscribers
        </p>

        <div className="space-y-4">
          {/* Subject EN */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject (EN)</label>
            <input
              type="text"
              value={subjectEn}
              onChange={(e) => setSubjectEn(e.target.value)}
              maxLength={200}
              placeholder="New anime goods arrived!"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{subjectEn.length}/200</p>
          </div>

          {/* Subject SV */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject (SV)</label>
            <input
              type="text"
              value={subjectSv}
              onChange={(e) => setSubjectSv(e.target.value)}
              maxLength={200}
              placeholder="Nya anime-varor har anlänt!"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{subjectSv.length}/200</p>
          </div>

          {/* Body EN */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Body (EN)</label>
            <textarea
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              maxLength={10000}
              rows={4}
              placeholder="We just received a fresh batch of anime goods..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{bodyEn.length}/10000</p>
          </div>

          {/* Body SV */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Body (SV)</label>
            <textarea
              value={bodySv}
              onChange={(e) => setBodySv(e.target.value)}
              maxLength={10000}
              rows={4}
              placeholder="Vi har precis fått en ny omgång anime-varor..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{bodySv.length}/10000</p>
          </div>

          {/* Recent Products */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="includeProducts"
              checked={includeRecentProducts}
              onChange={(e) => setIncludeRecentProducts(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="includeProducts" className="text-sm text-gray-700">
              Include recently added products
            </label>
            {includeRecentProducts && (
              <select
                value={recentProductsDays}
                onChange={(e) => setRecentProductsDays(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                {[3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    Last {d} days
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => handleSend(true)}
              disabled={!isFormValid || testSending}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {testSending ? "Sending..." : "Test Send"}
            </button>

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!isFormValid || sending || subscriberCount === 0}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>

            {formMessage && (
              <span
                className={`text-sm ${formMessage.type === "success" ? "text-green-600" : "text-red-600"}`}
              >
                {formMessage.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Confirm Send</h3>
            <p className="mb-4 text-sm text-gray-600">
              Send newsletter to <span className="font-semibold">{subscriberCount}</span> subscribers?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSend(false)}
                disabled={sending}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 送信履歴 */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Send History</h2>

        {sendsLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : sends.length === 0 ? (
          <p className="text-sm text-gray-500">No newsletters sent yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Subject</th>
                    <th className="pb-3 pr-4 text-right">Sent</th>
                    <th className="pb-3 pr-4 text-right">Failed</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Sent By</th>
                  </tr>
                </thead>
                <tbody>
                  {sends.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleViewDetail(s.id)}
                      className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
                    >
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(s.sentAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {s.subjectEn.length > 50
                          ? `${s.subjectEn.substring(0, 50)}...`
                          : s.subjectEn}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-700">
                        {s.sentCount}/{s.recipientCount}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className={s.failedCount > 0 ? "font-medium text-red-600" : "text-gray-400"}>
                          {s.failedCount}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3 text-gray-500">{s.sentBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {sendsTotal > 20 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {sendsOffset + 1}-{Math.min(sendsOffset + 20, sendsTotal)} of {sendsTotal}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchSends(Math.max(0, sendsOffset - 20))}
                    disabled={sendsOffset === 0}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchSends(sendsOffset + 20)}
                    disabled={sendsOffset + 20 >= sendsTotal}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 送信��歴詳細モーダル */}
      {(selectedSend || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            {detailLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : selectedSend ? (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Send Details</h3>
                  <button
                    onClick={() => setSelectedSend(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    &times;
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex gap-4">
                    <StatusBadge status={selectedSend.status} />
                    <span className="text-gray-500">
                      {new Date(selectedSend.sentAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-xs text-gray-400">Recipients</p>
                      <p className="font-semibold text-gray-900">{selectedSend.recipientCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Sent</p>
                      <p className="font-semibold text-green-600">{selectedSend.sentCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Failed</p>
                      <p className={`font-semibold ${selectedSend.failedCount > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {selectedSend.failedCount}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400">Subject (EN)</p>
                    <p className="text-gray-900">{selectedSend.subjectEn}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400">Subject (SV)</p>
                    <p className="text-gray-900">{selectedSend.subjectSv}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400">Body (EN)</p>
                    <p className="whitespace-pre-line text-gray-700">{selectedSend.bodyEn}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400">Body (SV)</p>
                    <p className="whitespace-pre-line text-gray-700">{selectedSend.bodySv}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">
                      Sent by: {selectedSend.sentBy}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
