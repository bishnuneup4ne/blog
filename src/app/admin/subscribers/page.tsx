"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Column,
  Grid,
  Heading,
  Input,
  Row,
  Table,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { AdminPageHeader, AdminShell, ConfirmDialog } from "../admin-ui";
import { useAdminToast } from "@/lib/adminToast";

interface Subscriber {
  id: string;
  email: string;
  status: string;
  subscribed_at: string;
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useAdminToast();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscribers");
      if (res.ok) setSubscribers(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSendEmail = async () => {
    if (!subject || !message) {
      addToast("error", "Please provide both a subject and a message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message || "Email sent successfully!");
        setSubject("");
        setMessage("");
      } else {
        addToast("error", data.error || "Failed to send email.");
      }
    } catch {
      addToast("error", "Network error while sending.");
    }
    setSending(false);
  };

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  const handleSendTest = async () => {
    if (!subject || !message) {
      addToast("error", "Please provide both a subject and a message.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, test: true }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", data.message || "Test email sent!");
      } else {
        addToast("error", data.error || "Failed to send test email.");
      }
    } catch {
      addToast("error", "Network error while sending.");
    }
    setSending(false);
  };

  const handleUnsubscribe = async (email: string) => {
    try {
      const res = await fetch("/api/admin/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", `Unsubscribed ${email}`);
        fetchSubscribers();
      } else {
        addToast("error", data.error || "Failed to unsubscribe.");
      }
    } catch {
      addToast("error", "Network error.");
    }
  };

  const handleDelete = (email: string) => {
    setPendingDelete(email);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const email = pendingDelete;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/subscribers?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        addToast("success", `Deleted ${email}`);
        setPendingDelete(null);
        fetchSubscribers();
      } else {
        addToast("error", data.error || "Failed to delete.");
      }
    } catch {
      addToast("error", "Network error.");
    } finally {
      setDeleting(false);
    }
  };

  const headers = [
    { key: "email", content: "Email" },
    { key: "status", content: "Status" },
    { key: "date", content: "Date" },
    { key: "actions", content: "Actions", align: "right" as const },
  ];

  const rows = subscribers.map((sub) => [
    <Text key="e" variant="code-default-s" truncate>{sub.email}</Text>,
    <Badge
      key="s"
      paddingX="12"
      paddingY="4"
      radius="full"
      background={sub.status === "active" ? "success-alpha-weak" : "neutral-alpha-weak"}
      border={sub.status === "active" ? "success-alpha-strong" : "neutral-alpha-weak"}
      onBackground={sub.status === "active" ? "success-strong" : "neutral-medium"}
    >
      <Text variant="label-default-s">{sub.status}</Text>
    </Badge>,
    <Text key="d" variant="body-default-s" onBackground="neutral-weak">
      {new Date(sub.subscribed_at).toLocaleDateString()}
    </Text>,
    <Row key="a" gap="8" vertical="center" fillWidth horizontal="end">
      {sub.status === "active" ? (
        <Button size="s" variant="tertiary" label="Unsubscribe" onClick={() => handleUnsubscribe(sub.email)} />
      ) : null}
      <Button size="s" variant="danger" label="Delete" onClick={() => handleDelete(sub.email)} />
    </Row>,
  ]);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Subscribers & Mailing"
        subtitle="Manage your newsletter subscribers and send them updates."
      />

      <Grid columns="2" m={{ columns: "1" }} gap="20">
        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="16">
          <Column gap="4">
            <Heading variant="heading-strong-m">Mailing List</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {loading ? "Loading…" : `${activeCount} active subscribers`}
            </Text>
          </Column>
          <Table
            data={{ headers, rows }}
            loading={loading}
            hoverable
            emptyState={
              <Column padding="24" fillWidth>
                <Text variant="body-default-s" onBackground="neutral-weak">No subscribers yet.</Text>
              </Column>
            }
          />
        </Column>

        <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="16">
          <Column gap="4">
            <Heading variant="heading-strong-m">Send Email Broadcast</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Draft an email to all active subscribers.
            </Text>
          </Column>

          <Input
            id="subject"
            label="Subject"
            placeholder="e.g. New Blog Post Published!"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            id="message"
            label="Message (HTML supported)"
            placeholder="<p>Hello world!</p>"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            lines={10}
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
          />

          <Row gap="8" wrap>
            <Button variant="secondary" loading={sending} label={sending ? "Sending…" : "Send Test Email"} onClick={handleSendTest} />
            <Button
              disabled={sending || activeCount === 0}
              loading={sending}
              label={sending ? "Sending…" : `Send to ${activeCount} subscribers`}
              onClick={handleSendEmail}
            />
          </Row>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Test sends a preview to your sender address (configured under Settings → Email) so you can
            verify the template and API key before a real broadcast.
          </Text>
        </Column>
      </Grid>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete subscriber?"
        message={
          pendingDelete
            ? `Permanently remove ${pendingDelete} from the mailing list? They will need to re-subscribe to receive future broadcasts.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </AdminShell>
  );
}
