import { Outlet } from "react-router-dom";

/** Route wrapper for /responder/*; each page renders its own <Layout> frame. */
export default function ResponderLayout() {
  return <Outlet />;
}
