"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDocument } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

export function DocumentUpload({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const path = `${patientId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("patient-documents").upload(path, file);
    if (uploadError) {
      setPending(false);
      setError(uploadError.message);
      return;
    }
    const result = await saveDocument({
      patientId,
      filename: file.name,
      storagePath: path,
      mimeType: file.type,
      sizeBytes: file.size
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    input.value = "";
    router.refresh();
  }

  return (
    <form className="upload-row" onSubmit={onSubmit}>
      {error ? <div className="error">{error}</div> : null}
      <input name="file" type="file" />
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
