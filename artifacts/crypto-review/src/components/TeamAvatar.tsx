import { useState } from "react";
import type { WriterPersona } from "@/lib/writerPersonas";

interface TeamAvatarProps {
  persona: Pick<WriterPersona, "name" | "initials" | "avatarBg" | "image">;
  className?: string;
  initialsClassName?: string;
  priority?: boolean;
}

function publicAssetUrl(path: string): string {
  const normalized = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${normalized}`;
}

export default function TeamAvatar({
  persona,
  className = "h-14 w-14",
  initialsClassName = "text-base",
  priority = false,
}: TeamAvatarProps) {
  const [failed, setFailed] = useState(false);
  const commonClasses = `${className} rounded-full border border-slate-700`;

  if (persona.image && !failed) {
    return (
      <img
        src={publicAssetUrl(persona.image)}
        alt={`${persona.name} headshot`}
        className={`${commonClasses} object-cover`}
        width={480}
        height={480}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${persona.avatarBg} ${commonClasses} flex shrink-0 items-center justify-center shadow-inner`}
      role="img"
      aria-label={`${persona.name} initials`}
    >
      <span className={`font-bold tracking-wide text-white ${initialsClassName}`}>
        {persona.initials}
      </span>
    </div>
  );
}