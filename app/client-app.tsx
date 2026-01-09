"use client";

import { Provider } from "react-redux";
import { store } from "./redux-toolkit/store";
import { QueryProvider } from "@/lib/query-provider";
import { Toaster } from "sonner";

export default function ClientApp({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryProvider>{children}</QueryProvider>
      <Toaster />
    </Provider>
  );
}
