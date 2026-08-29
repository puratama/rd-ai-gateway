"use client";

import { useRef, useState } from "react";
import { Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImageUploadFieldProps {
  label: string;
  hint?: string;
  value: string;
  /** Sent as `type` to the upload endpoint. */
  uploadType?: string;
  placeholder?: string;
  onChange: (v: string) => void;
  /** Upload endpoint. Defaults to the admin settings uploader. */
  endpoint?: string;
  accept?: string;
}

export function ImageUploadField({
  label,
  hint,
  value,
  uploadType = "image",
  placeholder,
  onChange,
  endpoint = "/api/admin/settings/upload",
  accept,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (file: File) => {
    if (uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }
    const fd = new FormData();
    fd.append("type", uploadType);
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");
      onChange(data.url);
      toast.success(`${label} berhasil diupload`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={cn(
          "mt-2 flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="max-h-16 max-w-full object-contain" />
        ) : (
          <>
            <Image className="h-5 w-5 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">
              {uploading ? "Mengupload..." : "Klik atau seret file ke sini"}
            </span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept ?? "image/*"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (inputRef.current) inputRef.current.value = "";
          if (file) upload(file);
        }}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-9 bg-background"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}
