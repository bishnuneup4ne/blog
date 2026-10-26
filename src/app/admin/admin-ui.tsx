"use client";

import { type ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  Column,
  Dialog,
  Heading,
  Row,
  Text,
} from "@once-ui-system/core";
import { AdminSidebar } from "./AdminSidebar";

export function StatusBadge({ status }: { status?: string }) {
  const published = status === "Published";
  return (
    <Badge
      paddingX="12"
      paddingY="4"
      radius="full"
      background={published ? "success-alpha-weak" : "neutral-alpha-weak"}
      border={published ? "success-alpha-strong" : "neutral-alpha-weak"}
      onBackground={published ? "success-strong" : "neutral-medium"}
    >
      <Text variant="label-default-s">{status || "Draft"}</Text>
    </Badge>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <Row className="admin-shell" fill>
      <AdminSidebar />
      <Column as="main" className="admin-main" fill gap="24">
        {children}
      </Column>
    </Row>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
      <Column gap="4">
        <Heading variant="display-strong-s">{title}</Heading>
        {subtitle ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {subtitle}
          </Text>
        ) : null}
      </Column>
      {actions ? (
        <Row gap="8" wrap vertical="center">
          {actions}
        </Row>
      ) : null}
    </Row>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "var(--brand-background-strong)",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <Column background="surface" border="neutral-alpha-weak" radius="l" padding="20" gap="12">
      <Row gap="12" vertical="center">
        {icon ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: accent,
            }}
          >
            {icon}
          </span>
        ) : null}
        <Heading variant="display-strong-m">{value}</Heading>
      </Row>
      <Text variant="label-default-s" onBackground="neutral-weak">
        {label}
      </Text>
    </Column>
  );
}

export function QuickCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <Card
      href={href}
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      padding="20"
      gap="12"
      vertical="center"
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          color: "var(--brand-background-strong)",
        }}
      >
        {icon}
      </span>
      <Column gap="2">
        <Text variant="body-strong-m">{title}</Text>
        {subtitle ? (
          <Text variant="label-default-s" onBackground="neutral-weak">
            {subtitle}
          </Text>
        ) : null}
      </Column>
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <Column
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      padding="40"
      center
      gap="12"
      fillWidth
    >
      {icon ? (
        <span style={{ display: "inline-flex", color: "var(--neutral-on-background-weak)" }}>
          {icon}
        </span>
      ) : null}
      <Heading variant="heading-strong-m">{title}</Heading>
      {message ? (
        <Text variant="body-default-s" onBackground="neutral-weak" align="center">
          {message}
        </Text>
      ) : null}
      {action ? <Row marginTop="8">{action}</Row> : null}
    </Column>
  );
}

export function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="20" fillWidth>
      {title ? (
        <Column gap="4">
          <Heading variant="heading-strong-m">{title}</Heading>
          {description ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          ) : null}
        </Column>
      ) : null}
      {children}
      {footer ? <Row fillWidth horizontal="end" gap="8">{footer}</Row> : null}
    </Column>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={title}
      description={message}
      footer={
        <Row fillWidth horizontal="end" gap="8">
          <Button variant="tertiary" label={cancelLabel} onClick={onClose} />
          <Button
            variant={danger ? "danger" : "primary"}
            label={confirmLabel}
            loading={loading}
            onClick={onConfirm}
          />
        </Row>
      }
    />
  );
}
