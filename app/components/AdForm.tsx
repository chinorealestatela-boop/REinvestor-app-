"use client";

import { useRef, useState } from "react";

export interface AdFormData {
  description: string;
  location: string;
  dailyBudget: number;
  ageMin: number;
  ageMax: number;
  publishImmediately: boolean;
  imageFile: File | null;
}

interface AdFormProps {
  onSubmit: (data: AdFormData) => void;
  loading: boolean;
  initialData?: Partial<AdFormData>;
}

export default function AdForm({ onSubmit, loading, initialData }: AdFormProps) {
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [dailyBudget, setDailyBudget] = useState(initialData?.dailyBudget ?? 10);
  const [ageMin, setAgeMin] = useState(initialData?.ageMin ?? 25);
  const [ageMax, setAgeMax] = useState(initialData?.ageMax ?? 55);
  const [publishImmediately, setPublishImmediately] = useState(
    initialData?.publishImmediately ?? false
  );
  const [imageFile, setImageFile] = useState<File | null>(initialData?.imageFile ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageChange(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    onSubmit({
      description,
      location,
      dailyBudget,
      ageMin,
      ageMax,
      publishImmediately,
      imageFile,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="screen-enter space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">Create Facebook Ad</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Fill in the brief. AI handles the copy and targeting.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Product / Service Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          placeholder="e.g. I help estate agents get more buyers through targeted digital marketing"
          className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Target Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          placeholder="e.g. Dublin, Ireland"
          className="w-full rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        />
      </div>

      {/* Budget + Age range */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Daily Budget (€)
          </label>
          <input
            type="number"
            value={dailyBudget}
            onChange={(e) => setDailyBudget(Number(e.target.value))}
            required
            min={1}
            step={1}
            className="w-full rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Age Min
          </label>
          <input
            type="number"
            value={ageMin}
            onChange={(e) => setAgeMin(Number(e.target.value))}
            required
            min={18}
            max={65}
            className="w-full rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Age Max
          </label>
          <input
            type="number"
            value={ageMax}
            onChange={(e) => setAgeMax(Number(e.target.value))}
            required
            min={18}
            max={65}
            className="w-full rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Ad Image</label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className="relative rounded-lg cursor-pointer transition-colors overflow-hidden"
          style={{
            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
            background: dragOver ? "rgba(59,130,246,0.05)" : "var(--surface)",
          }}
        >
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-cover"
              />
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <span className="text-sm text-white font-medium">Click to change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <svg
                className="w-8 h-8"
                style={{ color: "var(--muted)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                Drop image here or click to upload
              </span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                JPG, PNG — 1080×1080px recommended
              </span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageChange(file);
          }}
        />
      </div>

      {/* Publish toggle */}
      <div
        className="flex items-center justify-between rounded-lg px-4 py-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-sm font-medium text-gray-300">Publish immediately</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Off = saved as draft (PAUSED)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {publishImmediately && (
            <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
              This will spend real money
            </span>
          )}
          <button
            type="button"
            onClick={() => setPublishImmediately(!publishImmediately)}
            className={`toggle-track ${publishImmediately ? "on" : ""}`}
            aria-label="Toggle publish immediately"
          >
            <div className="toggle-thumb" />
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !imageFile}
        className="w-full rounded-lg py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: loading || !imageFile ? "var(--border)" : "var(--accent)" }}
        onMouseEnter={(e) => {
          if (!loading && imageFile)
            (e.target as HTMLButtonElement).style.background = "var(--accent-hover)";
        }}
        onMouseLeave={(e) => {
          if (!loading && imageFile)
            (e.target as HTMLButtonElement).style.background = "var(--accent)";
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Ad Copy...
          </span>
        ) : (
          "Generate Ad"
        )}
      </button>
    </form>
  );
}
