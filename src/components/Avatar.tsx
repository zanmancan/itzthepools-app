"use client";

import * as React from "react";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  size?: number; // px
  className?: string;
  fallbackText?: string; // e.g. first letter of display name
};

export default function Avatar({
  src,
  alt = "avatar",
  size = 64,
  className = "",
  fallbackText = "?"
}: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showFallback = !src || errored;

  return (
    <div
      className={`rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-label="avatar"
    >
      {showFallback ? (
        <span className="text-neutral-300 font-semibold" style={{ fontSize: size * 0.45 }}>
          {fallbackText.slice(0, 1).toUpperCase()}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
