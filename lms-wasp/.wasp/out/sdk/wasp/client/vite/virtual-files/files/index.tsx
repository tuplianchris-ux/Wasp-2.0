// @ts-nocheck
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { getWaspApp } from "wasp/client/app";
import { routesMapping } from "/@wasp/routes.tsx"

import RootWrapper_ext from './src/RootWrapper'



const app = getWaspApp({
  rootElement: <RootWrapper_ext />,
  routesMapping: routesMapping,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{app}</React.StrictMode>,
);
