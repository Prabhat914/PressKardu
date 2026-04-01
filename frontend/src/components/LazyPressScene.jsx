import { Suspense, lazy } from "react";

const PressScene = lazy(() => import("./PressScene"));

function LazyPressScene() {
  return (
    <Suspense fallback={<div className="press-scene press-scene--loading" aria-hidden="true" />}>
      <PressScene />
    </Suspense>
  );
}

export default LazyPressScene;
