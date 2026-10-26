"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Column, Heading, Input, Row, Text } from "@once-ui-system/core";
import { ShieldCheck } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      let message = "Invalid password. Access denied.";
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch {
        // keep the default message
      }
      setError(message);
      setLoading(false);
    }
  };

  return (
    <Column fill center padding="24" style={{ minHeight: "100vh" }}>
      <Column
        as="form"
        onSubmit={handleLogin}
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="32"
        gap="24"
        style={{ width: "min(400px, 100%)" }}
      >
        <Column center gap="12">
          <Row
            center
            background="brand-alpha-medium"
            radius="l"
            style={{ width: 48, height: 48, color: "var(--brand-on-background-strong)" }}
          >
            <ShieldCheck size={24} />
          </Row>
          <Column center gap="4">
            <Heading variant="display-strong-s">Admin Panel</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Secure access required to continue
            </Text>
          </Column>
        </Column>

        <Input
          id="password"
          type="password"
          label="Password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(error)}
          errorMessage={error || undefined}
          required
        />

        <Button
          type="submit"
          fillWidth
          loading={loading}
          label={loading ? "Authenticating..." : "Access Dashboard"}
        />
      </Column>
    </Column>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Column fill center style={{ minHeight: "100vh" }} />}>
      <LoginForm />
    </Suspense>
  );
}
