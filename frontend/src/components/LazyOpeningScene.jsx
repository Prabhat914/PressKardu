import { Suspense, lazy } from "react";

const OpeningScene = lazy(() => import("./OpeningScene"));

function LazyOpeningScene({ fast = false }) {
  return (
    <Suspense fallback={<div className="opening-scene opening-scene--loading" aria-hidden="true" />}>
      <OpeningScene fast={fast} />
    </Suspense>
  );
}

export default LazyOpeningScene;
