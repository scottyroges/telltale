"use client";

import { useState } from "react";

export function SmokeButton() {
  const [clicked, setClicked] = useState(false);

  return (
    <button onClick={() => setClicked(true)}>
      {clicked ? "Clicked!" : "Click me"}
    </button>
  );
}
