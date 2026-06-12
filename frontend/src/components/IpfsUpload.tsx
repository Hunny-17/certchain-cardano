import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

interface IpfsUploadProps {
  onUpload: (ipfsHash: string) => void;
  onClear: () => void;
  currentHash?: string;
}

export default function IpfsUpload({ onUpload, onClear, currentHash }: IpfsUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/ipfs/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      onUpload(data.ipfs_hash);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Uploaded state ──────────────────────────────────────────────
  if (currentHash) {
    return (
      <div className="border-2 border-black bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/50 mb-1">
            ✓ Uploaded to IPFS
          </div>
          <code className="block font-mono text-xs text-black/70 truncate">
            ipfs://{currentHash}
          </code>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={`https://gateway.pinata.cloud/ipfs/${currentHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-black px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-colors"
          >
            Preview ↗
          </a>
          <button
            type="button"
            onClick={() => { onClear(); if (inputRef.current) inputRef.current.value = ""; }}
            className="border border-black px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-colors"
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  // ── Upload area ─────────────────────────────────────────────────
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed border-black p-8 text-center transition-colors ${
          uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-black/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg"
          className="hidden"
          onChange={handleInputChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50">
            ⟳ Uploading to IPFS...
          </div>
        ) : (
          <>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/50 mb-2">
              ↑ Drop PDF or image here
            </div>
            <div className="font-mono text-[9px] text-black/30 uppercase tracking-[0.15em]">
              PDF · PNG · JPG · Max 10 MB · Optional
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 font-mono text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
