"use client";

import { useEffect, useState } from "react";
import { site } from "@/data/site";
import { ghost } from "@/lib/ghost";

// Batch 18: the terminal 404 gets one more line from the second visit on: "this page doesn't exist. requisitions.exe
// does." requisitions.exe links to the store only once its real address is set (a placeholder stays plain text).
export default function GhostNotFoundLine() {
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(ghost.allows("not-found")); }, []);
  if (!shown) return null;
  return (
    <p className="ghost-line">
      this page doesn&apos;t exist. {site.shopIsPlaceholder ? "requisitions.exe" : <a href={site.shopUrl}>requisitions.exe</a>} does.
    </p>
  );
}
