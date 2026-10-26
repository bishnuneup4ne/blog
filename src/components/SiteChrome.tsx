"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Column, Flex } from "@once-ui-system/core";
import { Footer, Header, RouteGuard, Providers } from "@/components";
import { ConfigProvider, type SiteConfig } from "@/components/ConfigProvider";
import { LiveEditProvider } from "@/components/admin/LiveEdit";
import { SiteMotion } from "@/components/motion/SiteMotion";
type SiteChromeProps = {
  config: SiteConfig;
  children: React.ReactNode;
};

/** Public site shell — minimal wrapper on /admin/* but still provides LayoutProvider. */
export function SiteChrome({ config, children }: SiteChromeProps) {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <ConfigProvider config={config}>
        <Providers>{children}</Providers>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider config={config}>
      <LiveEditProvider>
        <Providers>
          <SiteMotion />
          <Column
            background="page"
            fillWidth
            style={{ minHeight: "100vh" }}
            margin="0"
            padding="0"
            horizontal="center"
            suppressHydrationWarning
          >
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            <Flex
              as="main"
              zIndex={0}
              fillWidth
              horizontal="center"
              flex={1}
              className="site-content"
              suppressHydrationWarning
            >
              <RouteGuard>{children}</RouteGuard>
            </Flex>
            <Footer />
          </Column>
        </Providers>
      </LiveEditProvider>
    </ConfigProvider>
  );
}
