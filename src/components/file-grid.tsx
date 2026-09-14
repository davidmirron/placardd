export function FileGrid({ files }: { files: { id: string; url: string; mime: string; note: string }[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {files.map((f) => (
        <li key={f.id} className="overflow-hidden rounded-xl border bg-muted">
          {f.mime.startsWith("video/") ? (
            <video src={f.url} controls className="aspect-square w-full object-cover" />
          ) : (
            <a href={f.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.note || "Uploaded file"} className="aspect-square w-full object-cover" />
            </a>
          )}
          {f.note && <p className="px-2 py-1.5 text-xs text-muted-foreground">{f.note}</p>}
        </li>
      ))}
    </ul>
  );
}
