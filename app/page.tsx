"use client";

import dynamic from "next/dynamic";

const OrbitalScene = dynamic(
  () => import("@/components/orbital-scene").then((mod) => mod.OrbitalScene),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-black" />
  }
);

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <OrbitalScene />
    </main>
  );
}
