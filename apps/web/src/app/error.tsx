"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container">
      <section className="card">
        <h1>Virhe tapahtui</h1>
        <p>Jokin meni pieleen. Yrita uudelleen tai palaa takaisin.</p>
        <div className="notice error">{error.message}</div>
        <button className="btn btn-primary" type="button" onClick={() => reset()}>
          Yrita uudelleen
        </button>
      </section>
    </div>
  );
}
