"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Column, Row, Text } from "@once-ui-system/core";
import {
  LayoutDashboard,
  Video,
  Tag,
  Image,
  Mail,
  Settings,
  Trash2,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CONTENT_LINKS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/categories", label: "Categories", icon: Tag },
];

const SITE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/gallery", label: "Gallery", icon: Image },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/trash", label: "Trash", icon: Trash2 },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className={`admin-nav-link ${active ? "active" : ""}`}>
      <Row gap="12" vertical="center" fillWidth>
        <span className="admin-nav-icon">
          <Icon size={16} />
        </span>
        <Text variant="body-default-s">{label}</Text>
      </Row>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <button
        className="admin-hamburger"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={closeSidebar}
      />

      <Column
        as="aside"
        className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}
        background="page"
        border="neutral-alpha-weak"
        padding="20"
        gap="24"
      >
        <Row gap="12" vertical="center">
          <span className="admin-logo-badge">B</span>
          <Column gap="0">
            <Text variant="body-strong-m">bishnuneup4ne</Text>
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Admin Console
            </Text>
          </Column>
        </Row>

        <Column as="nav" className="admin-nav" gap="4" fillWidth>
          <Text variant="label-default-xs" onBackground="neutral-weak" paddingX="8" marginBottom="4">
            Content
          </Text>
          {CONTENT_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isActive(pathname, link.href, link.exact)}
              onClick={closeSidebar}
            />
          ))}

          <Text
            variant="label-default-xs"
            onBackground="neutral-weak"
            paddingX="8"
            marginTop="16"
            marginBottom="4"
          >
            Site
          </Text>
          {SITE_LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              active={isActive(pathname, link.href)}
              onClick={closeSidebar}
            />
          ))}
        </Column>

        <Column className="admin-sidebar-footer" gap="4" fillWidth>
          <Link href="/blogs" target="_blank" rel="noreferrer" className="admin-nav-link">
            <Row gap="12" vertical="center" fillWidth>
              <span className="admin-nav-icon">
                <ExternalLink size={16} />
              </span>
              <Text variant="body-default-s">View site</Text>
            </Row>
          </Link>
          <button type="button" className="admin-nav-link admin-logout-btn" onClick={handleLogout}>
            <Row gap="12" vertical="center" fillWidth>
              <span className="admin-nav-icon">
                <LogOut size={16} />
              </span>
              <Text variant="body-default-s">Logout</Text>
            </Row>
          </button>
        </Column>
      </Column>
    </>
  );
}
