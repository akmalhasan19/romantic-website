"use client";

import React, { useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import { Upload, Trash2, ImageIcon, Pencil, Calendar, MessageSquare, X, Check } from "lucide-react";
import { Card, Spinner, Button } from "@/components/ui";
import { useGalleryStore, type GalleryImage } from "@/store/gallery-store";

interface CloudinarySignatureResponse {
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  cloud_name: string;
}

export function ImageManager() {
  const clients = useGalleryStore((s) => s.clients);
  const client = useGalleryStore((s) => s.client);
  const selectedClientId = useGalleryStore((s) => s.selectedClientId);
  const setSelectedClient = useGalleryStore((s) => s.setSelectedClient);
  const images = useGalleryStore((s) => s.images);
  const addImage = useGalleryStore((s) => s.addImage);
  const deleteImage = useGalleryStore((s) => s.deleteImage);
  const updateImageCaption = useGalleryStore((s) => s.updateImageCaption);

  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit Caption Modal State
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [captionInput, setCaptionInput] = useState("");
  const [memoryDateInput, setMemoryDateInput] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      if (!selectedClientId) {
        setError("Pilih client terlebih dahulu sebelum upload foto");
        e.target.value = "";
        return;
      }

      setUploading(true);
      setError(null);

      try {
        // Get signed params from our API
        const sigRes = await fetch("/api/admin/cloudinary-signature", {
          method: "POST",
        });
        if (!sigRes.ok) throw new Error("Failed to get upload signature");
        const sig = (await sigRes.json()) as CloudinarySignatureResponse;

        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file as Blob);
          formData.append("api_key", sig.api_key);
          formData.append("timestamp", String(sig.timestamp));
          formData.append("signature", sig.signature);
          formData.append("folder", sig.folder);

          const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
            { method: "POST", body: formData }
          );
          if (!uploadRes.ok) throw new Error("Cloudinary upload failed");

          const uploadData = await uploadRes.json();

          await addImage({
            client_id: selectedClientId,
            url: uploadData.secure_url,
            public_id: uploadData.public_id,
            width: uploadData.width,
            height: uploadData.height,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
        // Reset the input so same file can be re-selected
        e.target.value = "";
      }
    },
    [addImage, selectedClientId]
  );

  const handleDelete = useCallback(
    async (img: GalleryImage) => {
      if (!window.confirm("Delete this image?")) return;
      setDeletingId(img.id);
      setError(null);
      try {
        await deleteImage(img.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [deleteImage]
  );

  const handleOpenEdit = useCallback((img: GalleryImage) => {
    setEditingImage(img);
    setCaptionInput(img.caption || "");
    setMemoryDateInput(img.memory_date || "");
    setCaptionError(null);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingImage(null);
    setCaptionInput("");
    setMemoryDateInput("");
    setCaptionError(null);
  }, []);

  const handleSaveCaption = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!editingImage) return;

    setSavingCaption(true);
    setCaptionError(null);

    try {
      await updateImageCaption(editingImage.id, {
        caption: captionInput.trim() || null,
        memory_date: memoryDateInput.trim() || null,
      });
      handleCloseEdit();
    } catch (err) {
      setCaptionError(err instanceof Error ? err.message : "Failed to update memory details");
    } finally {
      setSavingCaption(false);
    }
  }, [captionInput, editingImage, handleCloseEdit, memoryDateInput, updateImageCaption]);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">
            Image Manager
          </h2>
          <span className="text-sm text-muted">({images.length})</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedClientId ?? ""}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            {clients.length === 0 ? (
              <option value="">Belum ada client</option>
            ) : (
              clients.map((clientOption) => (
                <option key={clientOption.id} value={clientOption.id}>
                  {clientOption.name} (/{clientOption.slug})
                </option>
              ))
            )}
          </select>

          <label className="relative">
            <span
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-soft ${
                uploading || !selectedClientId ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Images"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading || !selectedClientId}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted">
        {client
          ? `Foto yang ditampilkan dan di-upload sekarang terhubung ke client ${client.name} (/${client.slug}).`
          : "Buat atau pilih client terlebih dahulu untuk mulai upload foto."}
      </p>

      {error && (
        <p className="mb-3 text-sm text-red-400">{error}</p>
      )}

      {uploading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Uploading to Cloudinary...
        </div>
      )}

      {images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted">
          <ImageIcon className="h-10 w-10 opacity-40" />
          <p className="text-sm">
            {client
              ? `Belum ada foto untuk ${client.name}. Upload beberapa gambar.`
              : "Belum ada client yang dipilih."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface-light shadow-sm transition-all hover:border-accent/40"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption || ""}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Action buttons overlay */}
                <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleOpenEdit(img)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-[#f0c8a0] transition-colors hover:bg-accent hover:text-black"
                    title="Edit cerita / caption kenangan"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(img)}
                    disabled={deletingId === img.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    title="Delete image"
                  >
                    {deletingId === img.id ? (
                      <Spinner className="h-3.5 w-3.5 border-white border-t-transparent" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Has caption indicator icon */}
                {img.caption && (
                  <div
                    className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-accent backdrop-blur-sm shadow"
                    title="Memiliki cerita kenangan"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Bottom Caption & Date Info */}
              <div className="flex flex-col justify-between p-2.5 text-xs bg-surface border-t border-border/60">
                {img.caption ? (
                  <p className="line-clamp-2 text-foreground font-serif italic" title={img.caption}>
                    &ldquo;{img.caption}&rdquo;
                  </p>
                ) : (
                  <button
                    onClick={() => handleOpenEdit(img)}
                    className="text-left text-muted hover:text-accent italic truncate transition-colors"
                  >
                    + Tambah cerita momen...
                  </button>
                )}

                {img.memory_date && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                    <Calendar className="h-3 w-3 text-accent" />
                    <span>{img.memory_date}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Memory Caption Modal */}
      {editingImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingCaption) {
              handleCloseEdit();
            }
          }}
        >
          <div className="relative flex flex-col gap-4 max-w-md w-full rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                <h3 className="text-base font-semibold text-foreground">
                  Edit Cerita Kenangan
                </h3>
              </div>
              <button
                onClick={handleCloseEdit}
                disabled={savingCaption}
                className="rounded-lg p-1 text-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Photo thumbnail */}
            <div className="flex items-center gap-3 rounded-xl bg-surface-light p-2.5 border border-border/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editingImage.url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted truncate">
                  Public ID: {editingImage.public_id}
                </p>
                <p className="text-xs text-accent mt-0.5">
                  Foto kenangan untuk {client?.name ?? "client"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCaption} className="flex flex-col gap-4">
              {/* Memory Date */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground">
                  Tanggal Kenangan (Opsional)
                </label>
                <input
                  type="date"
                  value={memoryDateInput}
                  onChange={(e) => setMemoryDateInput(e.target.value)}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>

              {/* Caption */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Cerita / Catatan Kenangan
                  </label>
                  <span className="text-[11px] text-muted">
                    {captionInput.length}/500
                  </span>
                </div>
                <textarea
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Contoh: Momen pertama kali kita nonton konser berdua di tengah hujan..."
                  maxLength={500}
                  rows={3}
                  className="rounded-lg border border-border bg-surface p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 resize-none font-serif italic"
                />
              </div>

              {captionError && (
                <p className="text-xs text-red-400">{captionError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  disabled={savingCaption}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  loading={savingCaption}
                  icon={<Check className="h-4 w-4" />}
                >
                  {savingCaption ? "Menyimpan..." : "Simpan Cerita"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
