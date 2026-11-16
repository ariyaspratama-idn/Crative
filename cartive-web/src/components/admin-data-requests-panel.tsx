"use client";

import { useCallback, useEffect, useState } from "react";

type DataRequest = {
  id: string;
  type: "ACCESS" | "RECTIFICATION" | "ERASURE";
  status: "PENDING" | "IN_REVIEW";
  details: string | null;
  createdAt: string;
  memberWa: string;
};
type ApiResponse<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
};

const requestLabels: Record<DataRequest["type"], string> = {
  ACCESS: "Akses data",
  RECTIFICATION: "Perbaikan data",
  ERASURE: "Penghapusan data",
};

async function readResponse<T>(response: Response) {
  const body = (await response.json()) as ApiResponse<T>;
  if (!response.ok || body.error || body.data === null) {
    throw new Error(body.error?.message ?? "Permintaan belum dapat diproses.");
  }
  return body.data;
}

export default function AdminDataRequestsPanel() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const currentRequests = await readResponse<DataRequest[]>(
        await fetch("/api/v1/admin/data-requests", { cache: "no-store" }),
      );
      setRequests(currentRequests);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Permintaan data belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRequests);
  }, [loadRequests]);

  async function beginReview(id: string) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      await readResponse(
        await fetch("/api/v1/admin/data-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }),
      );
      setNotice("Permintaan dipindahkan ke status sedang ditinjau.");
      await loadRequests();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Status permintaan belum dapat diperbarui.");
    } finally {
      setBusyId("");
    }
  }

  async function closeRequest(request: DataRequest, status: "COMPLETED" | "DECLINED") {
    const resolution = notes[request.id]?.trim();
    if (!resolution) {
      setError("Catatan tindak lanjut wajib diisi.");
      return;
    }

    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      await readResponse(
        await fetch(`/api/v1/admin/data-requests/${encodeURIComponent(request.id)}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, resolution }),
        }),
      );
      setNotice(
        status === "COMPLETED" && request.type === "ERASURE"
          ? "Permintaan selesai. Nomor anggota telah dianonimkan dan seluruh sesi dinonaktifkan."
          : status === "COMPLETED"
            ? "Tindak lanjut ditandai selesai. Pastikan catatan sudah mencakup tindakan yang benar-benar dilakukan."
            : "Permintaan ditutup dengan alasan yang dicatat.",
      );
      setNotes((current) => ({ ...current, [request.id]: "" }));
      await loadRequests();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Permintaan belum dapat ditutup.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="admin-data-requests" id="permintaan-data">
      <div className="admin-data-requests-heading">
        <div>
          <p className="admin-eyebrow">HAK DATA PELANGGAN</p>
          <h2>Permintaan profil</h2>
          <p className="admin-description">
            Menyelesaikan permintaan penghapusan akan menganonimkan nomor anggota dan menonaktifkan
            sesi. Riwayat pesanan dan ledger tetap dipertahankan untuk integritas transaksi.
          </p>
        </div>
        <button className="admin-button admin-button-refresh" type="button" onClick={() => void loadRequests()} disabled={loading}>
          Muat ulang
        </button>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? (
        <p className="admin-empty">Memuat permintaan data…</p>
      ) : requests.length === 0 ? (
        <p className="admin-empty">Tidak ada permintaan data yang menunggu.</p>
      ) : (
        <div className="admin-data-request-list">
          {requests.map((request) => (
            <article className="admin-data-request-card" key={request.id}>
              <div className="admin-data-request-heading">
                <div>
                  <p className="admin-eyebrow">{requestLabels[request.type]}</p>
                  <h3>WhatsApp {request.memberWa}</h3>
                </div>
                <span className="admin-claim-count">{request.status === "PENDING" ? "Menunggu" : "Sedang ditinjau"}</span>
              </div>
              <p className="admin-claim-meta">
                Diajukan {new Date(request.createdAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Jakarta",
                })}
              </p>
              {request.details && <p className="admin-data-request-details">{request.details}</p>}
              {request.status === "PENDING" ? (
                <button className="admin-button admin-button-refresh" type="button" onClick={() => void beginReview(request.id)} disabled={busyId === request.id}>
                  {busyId === request.id ? "Memperbarui…" : "Mulai tinjau"}
                </button>
              ) : (
                <form className="admin-data-request-form">
                  <label className="admin-field">
                    Catatan tindak lanjut
                    <textarea
                      maxLength={500}
                      required
                      rows={2}
                      value={notes[request.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    />
                  </label>
                  <div className="admin-claim-actions">
                    <button className="admin-button admin-button-reject" type="button" disabled={busyId === request.id} onClick={() => void closeRequest(request, "DECLINED")}>
                      Tidak dapat dipenuhi
                    </button>
                    <button className="admin-button admin-button-approve" type="button" disabled={busyId === request.id} onClick={() => void closeRequest(request, "COMPLETED")}>
                      Tandai tindak lanjut selesai
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
