"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Column,
  Grid,
  Heading,
  Input,
  Row,
  Select,
  Spinner,
  Text,
  Textarea,
} from "@once-ui-system/core";
import {
  AdminPageHeader,
  AdminShell,
  ConfirmDialog,
  SectionCard,
} from "../admin-ui";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { iconLibrary } from "@/resources/icons";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import { useAdminToast } from "@/lib/adminToast";

type IconName = keyof typeof iconLibrary;

type Person = {
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  location: string;
  languages?: string[];
};

type SocialRow = {
  name: string;
  icon: string;
  link: string;
  essential?: boolean;
};

type BasePage = {
  path: string;
  label: string;
  title: string;
  description: string;
  image?: string;
};

type Home = BasePage & { headline?: string; subline?: string; featured?: unknown };
type About = BasePage & {
  tableOfContent: { display: boolean; subItems: boolean };
  avatar: { display: boolean };
  calendar: { display: boolean; link: string };
  intro: { display: boolean; title: string; description: string };
  work: { display: boolean; title: string; experiences: unknown[] };
  studies: { display: boolean; title: string; institutions: unknown[] };
  technical: { display: boolean; title: string; skills: unknown[] };
};
type Newsletter = { display: boolean; title: string; description: string };
type GalleryMeta = BasePage & { images?: unknown[] };

type FullConfig = {
  person: Person;
  social: SocialRow[];
  home: Home;
  blog: BasePage;
  about: About;
  newsletter: Newsletter;
  gallery: GalleryMeta;
  email: string | null;
};

const ICON_OPTIONS = Object.keys(iconLibrary).map((name) => ({
  label: name,
  value: name,
}));

const DEFAULT_PERSON: Person = {
  firstName: "",
  lastName: "",
  name: "",
  role: "",
  avatar: "",
  email: "",
  location: "Asia/Kolkata",
  languages: [],
};

const DEFAULT_BASE: BasePage = {
  path: "/",
  label: "",
  title: "",
  description: "",
};

const DEFAULT_ABOUT: About = {
  ...DEFAULT_BASE,
  path: "/about",
  tableOfContent: { display: true, subItems: false },
  avatar: { display: true },
  calendar: { display: false, link: "" },
  intro: { display: true, title: "Hi,", description: "" },
  work: { display: false, title: "Work", experiences: [] },
  studies: { display: false, title: "Studies", institutions: [] },
  technical: { display: false, title: "Technical", skills: [] },
};

const DEFAULT_NEWSLETTER: Newsletter = {
  display: false,
  title: "Newsletter",
  description: "",
};

export default function SettingsPage() {
  const { addToast } = useAdminToast();
  const [full, setFull] = useState<FullConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [person, setPerson] = useState<Person>(DEFAULT_PERSON);
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [social, setSocial] = useState<SocialRow[]>([]);
  const [home, setHome] = useState<Home>({ ...DEFAULT_BASE });
  const [blog, setBlog] = useState<BasePage>({ ...DEFAULT_BASE });
  const [about, setAbout] = useState<About>(DEFAULT_ABOUT);
  const [newsletter, setNewsletter] = useState<Newsletter>(DEFAULT_NEWSLETTER);
  const [gallery, setGallery] = useState<GalleryMeta>({ ...DEFAULT_BASE });

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Nested-array mutators (work.experiences, studies.institutions, technical.skills)
  const setInstitutions = (next: { name: string; description: string }[]) =>
    setAbout((prev) => ({ ...prev, studies: { ...prev.studies, institutions: next } }));
  const setSkills = (
    next: { title: string; description: string; tags?: { name: string; icon?: string }[] }[],
  ) => setAbout((prev) => ({ ...prev, technical: { ...prev.technical, skills: next } }));
  const setExperiences = (
    next: {
      company: string;
      role: string;
      timeframe: string;
      achievements: string[];
      images?: { src: string; alt: string; width: number | string; height: number | string }[];
    }[],
  ) => setAbout((prev) => ({ ...prev, work: { ...prev.work, experiences: next } }));

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        addToast("error", err.error || "Failed to load settings.");
        return;
      }
      const data: FullConfig = await res.json();
      setFull(data);
      setPerson({ ...DEFAULT_PERSON, ...data.person });
      setSenderEmail(data.email ?? "");
      setSocial(Array.isArray(data.social) ? data.social : []);
      setHome({ ...DEFAULT_BASE, ...data.home });
      setBlog({ ...DEFAULT_BASE, ...data.blog });
      setAbout({ ...DEFAULT_ABOUT, ...data.about });
      setNewsletter({ ...DEFAULT_NEWSLETTER, ...data.newsletter });
      setGallery({ ...DEFAULT_BASE, ...data.gallery });
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  const saveSection = async (name: string, patch: Partial<FullConfig>) => {
    if (!full) {
      addToast("error", "Configuration not loaded yet.");
      return;
    }
    const payload: FullConfig = {
      ...full,
      person,
      social,
      home,
      blog,
      about,
      newsletter,
      gallery,
      email: senderEmail || null,
      ...patch,
    };
    setSavingSection(name);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setFull(payload);
        addToast("success", `${name} saved.`);
      } else {
        const err = await res.json().catch(() => ({}));
        addToast("error", err.error || `Failed to save ${name}.`);
      }
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Network error.");
    } finally {
      setSavingSection(null);
    }
  };

  const addSocial = () =>
    setSocial((rows) => [...rows, { name: "", icon: "globe", link: "", essential: false }]);

  const updateSocial = (index: number, patch: Partial<SocialRow>) =>
    setSocial((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const removeSocial = (index: number) =>
    setSocial((rows) => rows.filter((_, i) => i !== index));

  const languagesCsv = useMemo(
    () => (person.languages ?? []).join(", "),
    [person.languages],
  );

  if (loading) {
    return (
      <AdminShell>
        <AdminPageHeader title="Site Configuration" />
        <Row gap="12" vertical="center">
          <Spinner size="s" />
          <Text variant="body-default-s" onBackground="neutral-weak">
            Loading configuration…
          </Text>
        </Row>
      </AdminShell>
    );
  }

  if (!full) {
    return (
      <AdminShell>
        <AdminPageHeader
          title="Site Configuration"
          subtitle="Failed to load configuration."
          actions={<Button label="Retry" onClick={load} />}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Site Configuration"
        subtitle="Labeled editor for the public site copy. Each section saves independently."
        actions={
          <Button
            variant="tertiary"
            label="Reload from database"
            onClick={() => {
              load();
              addToast("success", "Reloaded from database.");
            }}
          />
        }
      />

      <SectionCard
        title="Identity"
        description="Displayed on About, footer, and RSS feed."
        footer={
          <Button
            label={savingSection === "Identity" ? "Saving…" : "Save Identity"}
            loading={savingSection === "Identity"}
            onClick={() => saveSection("Identity", { person })}
          />
        }
      >
        <Grid columns="2" m={{ columns: "1" }} gap="16">
          <Input
            id="person-name"
            label="Display name"
            value={person.name}
            onChange={(e) => setPerson({ ...person, name: e.target.value })}
          />
          <Input
            id="person-role"
            label="Role"
            value={person.role}
            onChange={(e) => setPerson({ ...person, role: e.target.value })}
          />
          <Input
            id="person-email"
            label="Contact email"
            type="email"
            value={person.email}
            onChange={(e) => setPerson({ ...person, email: e.target.value })}
            description="Used by the RSS feed author field."
          />
          <Input
            id="person-location"
            label="Time zone (IANA)"
            value={person.location}
            placeholder="Asia/Kolkata"
            onChange={(e) => setPerson({ ...person, location: e.target.value })}
            description="Shown next to the site name (e.g. in the meta bar)."
          />
          <Input
            id="person-languages"
            label="Languages"
            value={languagesCsv}
            placeholder="English, Hindi, Nepali"
            onChange={(e) =>
              setPerson({
                ...person,
                languages: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            description="Comma-separated. Rendered on the About page."
          />
        </Grid>

        <Column gap="8" fillWidth>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Avatar
          </Text>
          <ImageUploader
            onUploadSuccess={(url) => setPerson({ ...person, avatar: normalizeImageUrl(url) })}
          />
          <Input
            id="person-avatar-url"
            value={person.avatar}
            placeholder="/images/…  or https://…"
            onChange={(e) =>
              setPerson({ ...person, avatar: normalizeImageUrl(e.target.value) })
            }
          />
        </Column>
      </SectionCard>

      <SectionCard
        title="Broadcast sender"
        description="From-address used when sending newsletter emails via Resend."
        footer={
          <Button
            label={savingSection === "Sender" ? "Saving…" : "Save Sender"}
            loading={savingSection === "Sender"}
            onClick={() => saveSection("Sender", { email: senderEmail || null })}
          />
        }
      >
        <Input
          id="sender-email"
          label="Sender email"
          type="email"
          value={senderEmail}
          placeholder="hello@yourdomain.com"
          onChange={(e) => setSenderEmail(e.target.value)}
          description="Must be a domain verified in Resend."
        />
      </SectionCard>

      <SectionCard
        title="Social links"
        description="Rendered in the footer; the “essential” flag also surfaces them on the About page."
        footer={
          <>
            <Button variant="secondary" label="+ Add link" onClick={addSocial} />
            <Button
              label={savingSection === "Social" ? "Saving…" : "Save Social"}
              loading={savingSection === "Social"}
              onClick={() => saveSection("Social", { social })}
            />
          </>
        }
      >
        {social.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            No social links yet. Click “+ Add link” to create one.
          </Text>
        ) : (
          <Column gap="12" fillWidth>
            {social.map((row, i) => (
              <Row key={i} gap="12" wrap vertical="end" fillWidth>
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <Input
                    id={`social-name-${i}`}
                    label="Name"
                    value={row.name}
                    placeholder="GitHub"
                    onChange={(e) => updateSocial(i, { name: e.target.value })}
                  />
                </div>
                <div style={{ flex: "0 0 180px", minWidth: 0 }}>
                  <Select
                    id={`social-icon-${i}`}
                    label="Icon"
                    value={row.icon}
                    options={ICON_OPTIONS}
                    onSelect={(v) => updateSocial(i, { icon: v as IconName })}
                  />
                </div>
                <div style={{ flex: "2 1 260px", minWidth: 0 }}>
                  <Input
                    id={`social-link-${i}`}
                    label="URL"
                    type="url"
                    value={row.link}
                    placeholder="https://…"
                    onChange={(e) => updateSocial(i, { link: e.target.value })}
                  />
                </div>
                <div style={{ flex: "0 0 auto", paddingBottom: 6 }}>
                  <Checkbox
                    id={`social-essential-${i}`}
                    label="Essential"
                    isChecked={!!row.essential}
                    onToggle={() => updateSocial(i, { essential: !row.essential })}
                  />
                </div>
                <div style={{ flex: "0 0 auto", paddingBottom: 6 }}>
                  <Button variant="tertiary" label="Remove" onClick={() => removeSocial(i)} />
                </div>
              </Row>
            ))}
          </Column>
        )}
      </SectionCard>

      <PageSeoCard
        name="Home page"
        value={home}
        onChange={setHome}
        saving={savingSection === "Home"}
        onSave={() => saveSection("Home", { home })}
        headline={home.headline ?? ""}
        subline={home.subline ?? ""}
        onHeadlineChange={(v) => setHome({ ...home, headline: v })}
        onSublineChange={(v) => setHome({ ...home, subline: v })}
        includeImage
      />

      <PageSeoCard
        name="Blog page"
        value={blog}
        onChange={setBlog}
        saving={savingSection === "Blog"}
        onSave={() => saveSection("Blog", { blog })}
      />

      <SectionCard
        title="About page"
        description="Copy + section toggles + structured editors for experiences, institutions, and skills."
        footer={
          <>
            <Button
              variant="tertiary"
              label="Clear nested arrays"
              onClick={() => setConfirmReset(true)}
            />
            <Button
              label={savingSection === "About" ? "Saving…" : "Save About"}
              loading={savingSection === "About"}
              onClick={() => saveSection("About", { about })}
            />
          </>
        }
      >
        <Grid columns="2" m={{ columns: "1" }} gap="16">
          <Input
            id="about-title"
            label="Title"
            value={about.title}
            onChange={(e) => setAbout({ ...about, title: e.target.value })}
          />
          <Input
            id="about-path"
            label="Path"
            value={about.path}
            onChange={(e) => setAbout({ ...about, path: e.target.value })}
          />
        </Grid>
        <Textarea
          id="about-description"
          label="Meta description"
          value={about.description}
          lines={3}
          onChange={(e) => setAbout({ ...about, description: e.target.value })}
        />
        <Row gap="16" wrap>
          <Checkbox
            id="about-toc"
            label="Table of contents"
            isChecked={about.tableOfContent.display}
            onToggle={() =>
              setAbout({
                ...about,
                tableOfContent: {
                  ...about.tableOfContent,
                  display: !about.tableOfContent.display,
                },
              })
            }
          />
          <Checkbox
            id="about-toc-sub"
            label="TOC sub-items"
            isChecked={about.tableOfContent.subItems}
            onToggle={() =>
              setAbout({
                ...about,
                tableOfContent: {
                  ...about.tableOfContent,
                  subItems: !about.tableOfContent.subItems,
                },
              })
            }
          />
          <Checkbox
            id="about-avatar"
            label="Show avatar"
            isChecked={about.avatar.display}
            onToggle={() =>
              setAbout({ ...about, avatar: { ...about.avatar, display: !about.avatar.display } })
            }
          />
          <Checkbox
            id="about-calendar"
            label="Calendar link"
            isChecked={about.calendar.display}
            onToggle={() =>
              setAbout({
                ...about,
                calendar: { ...about.calendar, display: !about.calendar.display },
              })
            }
          />
        </Row>
        <Grid columns="2" m={{ columns: "1" }} gap="16">
          <Input
            id="about-calendar-link"
            label="Calendar URL"
            type="url"
            value={about.calendar.link}
            onChange={(e) =>
              setAbout({ ...about, calendar: { ...about.calendar, link: e.target.value } })
            }
          />
          <Input
            id="about-intro-title"
            label="Intro title"
            value={about.intro.title}
            onChange={(e) =>
              setAbout({ ...about, intro: { ...about.intro, title: e.target.value } })
            }
          />
        </Grid>
        <Textarea
          id="about-intro-desc"
          label="Intro body"
          value={String(about.intro.description ?? "")}
          lines={4}
          onChange={(e) =>
            setAbout({ ...about, intro: { ...about.intro, description: e.target.value } })
          }
        />
        <InstitutionsRepeater
          items={about.studies.institutions as InstitutionRow[]}
          onChange={setInstitutions}
        />
        <SkillsRepeater
          items={about.technical.skills as SkillRow[]}
          onChange={setSkills}
        />
        <ExperiencesRepeater
          items={about.work.experiences as ExperienceRow[]}
          onChange={setExperiences}
        />
      </SectionCard>

      <SectionCard
        title="Newsletter block"
        description="The Mailchimp call-to-action shown at the bottom of the blog index."
        footer={
          <Button
            label={savingSection === "Newsletter" ? "Saving…" : "Save Newsletter"}
            loading={savingSection === "Newsletter"}
            onClick={() => saveSection("Newsletter", { newsletter })}
          />
        }
      >
        <Checkbox
          id="newsletter-display"
          label="Show newsletter block"
          isChecked={newsletter.display}
          onToggle={() => setNewsletter({ ...newsletter, display: !newsletter.display })}
        />
        <Input
          id="newsletter-title"
          label="Title"
          value={newsletter.title}
          onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
        />
        <Textarea
          id="newsletter-description"
          label="Description"
          value={String(newsletter.description ?? "")}
          lines={3}
          onChange={(e) => setNewsletter({ ...newsletter, description: e.target.value })}
        />
      </SectionCard>

      <SectionCard
        title="Gallery page metadata"
        description="Titles / SEO only. To manage gallery images themselves, use the dedicated Gallery page."
        footer={
          <Button
            label={savingSection === "Gallery" ? "Saving…" : "Save Gallery"}
            loading={savingSection === "Gallery"}
            onClick={() => saveSection("Gallery", { gallery })}
          />
        }
      >
        <Grid columns="2" m={{ columns: "1" }} gap="16">
          <Input
            id="gallery-title"
            label="Title"
            value={gallery.title}
            onChange={(e) => setGallery({ ...gallery, title: e.target.value })}
          />
          <Input
            id="gallery-path"
            label="Path"
            value={gallery.path}
            onChange={(e) => setGallery({ ...gallery, path: e.target.value })}
          />
        </Grid>
        <Textarea
          id="gallery-description"
          label="Description"
          value={gallery.description}
          lines={3}
          onChange={(e) => setGallery({ ...gallery, description: e.target.value })}
        />
      </SectionCard>

      <ConfirmDialog
        open={confirmReset}
        title="Clear About nested arrays?"
        message="This empties the experiences, institutions, and skills arrays in local state. Not saved until you click “Save About”."
        confirmLabel="Clear locally"
        cancelLabel="Cancel"
        danger={false}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setAbout((a) => ({
            ...a,
            work: { ...a.work, experiences: [] },
            studies: { ...a.studies, institutions: [] },
            technical: { ...a.technical, skills: [] },
          }));
          setConfirmReset(false);
          addToast("success", "About arrays cleared (unsaved).");
        }}
      />

      <div style={{ paddingBottom: 24 }} />
    </AdminShell>
  );
}

function PageSeoCard({
  name,
  value,
  onChange,
  onSave,
  saving,
  includeImage,
  headline,
  subline,
  onHeadlineChange,
  onSublineChange,
}: {
  name: string;
  value: BasePage;
  onChange: (next: BasePage) => void;
  onSave: () => void;
  saving: boolean;
  includeImage?: boolean;
  headline?: string;
  subline?: string;
  onHeadlineChange?: (v: string) => void;
  onSublineChange?: (v: string) => void;
}) {
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  return (
    <SectionCard
      title={name}
      description="Metadata + canonical path. The title and description drive SEO / OpenGraph tags."
      footer={
        <Button
          label={saving ? "Saving…" : `Save ${name}`}
          loading={saving}
          onClick={onSave}
        />
      }
    >
      <Grid columns="2" m={{ columns: "1" }} gap="16">
        <Input
          id={`${slug}-title`}
          label="Title"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
        <Input
          id={`${slug}-path`}
          label="Path"
          value={value.path}
          onChange={(e) => onChange({ ...value, path: e.target.value })}
        />
      </Grid>
      <Textarea
        id={`${slug}-description`}
        label="Meta description"
        value={value.description}
        lines={3}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
      />
      {onHeadlineChange ? (
        <Input
          id={`${slug}-headline`}
          label="Hero headline (public home page)"
          placeholder="Leave empty to fall back to the title"
          value={headline ?? ""}
          onChange={(e) => onHeadlineChange(e.target.value)}
        />
      ) : null}
      {onSublineChange ? (
        <Textarea
          id={`${slug}-subline`}
          label="Hero subline (public home page)"
          placeholder="Leave empty to fall back to the meta description"
          value={subline ?? ""}
          lines={2}
          onChange={(e) => onSublineChange(e.target.value)}
        />
      ) : null}
      {includeImage ? (
        <Column gap="8" fillWidth>
          <Heading variant="label-default-s">Open Graph image</Heading>
          <ImageUploader
            onUploadSuccess={(url) => onChange({ ...value, image: normalizeImageUrl(url) })}
          />
          <Input
            id={`${slug}-image`}
            value={value.image ?? ""}
            placeholder="/images/…  or https://…"
            onChange={(e) => onChange({ ...value, image: normalizeImageUrl(e.target.value) })}
          />
        </Column>
      ) : null}
    </SectionCard>
  );
}

type InstitutionRow = { name: string; description: string };
type SkillTagRow = { name: string; icon?: string };
type SkillRow = {
  title: string;
  description: string;
  tags?: SkillTagRow[];
};
type ExperienceImageRow = {
  src: string;
  alt: string;
  width: number | string;
  height: number | string;
};
type ExperienceRow = {
  company: string;
  role: string;
  timeframe: string;
  achievements: string[];
  images?: ExperienceImageRow[];
};

function RepeaterShell({
  title,
  hint,
  onAdd,
  count,
  children,
}: {
  title: string;
  hint: string;
  onAdd: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Column gap="12" fillWidth paddingTop="16" borderTop="neutral-alpha-weak">
      <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
        <Column gap="2">
          <Heading variant="label-default-m">{title}</Heading>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {hint}
          </Text>
        </Column>
        <Row gap="8" vertical="center">
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {count === 0 ? "None" : `${count} item${count === 1 ? "" : "s"}`}
          </Text>
          <Button size="s" variant="secondary" label="+ Add" onClick={onAdd} />
        </Row>
      </Row>
      {children}
    </Column>
  );
}

function RowShell({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <Column
      gap="12"
      fillWidth
      padding="16"
      radius="m"
      background="surface"
      border="neutral-alpha-weak"
    >
      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s" onBackground="neutral-weak">
          {label}
        </Text>
        <Button size="s" variant="tertiary" label="Remove" onClick={onRemove} />
      </Row>
      {children}
    </Column>
  );
}

function InstitutionsRepeater({
  items,
  onChange,
}: {
  items: InstitutionRow[];
  onChange: (next: InstitutionRow[]) => void;
}) {
  const safe = Array.isArray(items) ? items : [];
  const update = (i: number, patch: Partial<InstitutionRow>) =>
    onChange(safe.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <RepeaterShell
      title="Studies · institutions"
      hint="Rendered on /about under the Studies heading."
      count={safe.length}
      onAdd={() => onChange([...safe, { name: "", description: "" }])}
    >
      {safe.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          No institutions yet. Click “+ Add”.
        </Text>
      ) : (
        <Column gap="12" fillWidth>
          {safe.map((row, i) => (
            <RowShell key={i} label={`Institution ${i + 1}`} onRemove={() => onChange(safe.filter((_, idx) => idx !== i))}>
              <Input
                id={`study-name-${i}`}
                label="Name"
                placeholder="University / School"
                value={row.name ?? ""}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <Textarea
                id={`study-desc-${i}`}
                label="Description"
                placeholder="Degree, focus, years…"
                value={row.description ?? ""}
                lines={2}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </RowShell>
          ))}
        </Column>
      )}
    </RepeaterShell>
  );
}

function SkillsRepeater({
  items,
  onChange,
}: {
  items: SkillRow[];
  onChange: (next: SkillRow[]) => void;
}) {
  const safe = Array.isArray(items) ? items : [];
  const update = (i: number, patch: Partial<SkillRow>) =>
    onChange(safe.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateTag = (i: number, j: number, patch: Partial<SkillTagRow>) => {
    const tags = (safe[i].tags || []).map((t, idx) => (idx === j ? { ...t, ...patch } : t));
    update(i, { tags });
  };
  return (
    <RepeaterShell
      title="Technical skills"
      hint="Rendered on /about under the Technical skills heading. Optional tags render as chips."
      count={safe.length}
      onAdd={() => onChange([...safe, { title: "", description: "", tags: [] }])}
    >
      {safe.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          No skills yet. Click “+ Add”.
        </Text>
      ) : (
        <Column gap="12" fillWidth>
          {safe.map((row, i) => (
            <RowShell key={i} label={`Skill ${i + 1}`} onRemove={() => onChange(safe.filter((_, idx) => idx !== i))}>
              <Input
                id={`skill-title-${i}`}
                label="Title"
                placeholder="Reverse engineering"
                value={row.title ?? ""}
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <Textarea
                id={`skill-desc-${i}`}
                label="Description"
                value={row.description ?? ""}
                lines={2}
                onChange={(e) => update(i, { description: e.target.value })}
              />
              <Column gap="8" fillWidth>
                <Row fillWidth horizontal="between" vertical="center" gap="8">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Tags ({(row.tags || []).length})
                  </Text>
                  <Button
                    size="s"
                    variant="tertiary"
                    label="+ Add tag"
                    onClick={() =>
                      update(i, { tags: [...(row.tags || []), { name: "", icon: "book" }] })
                    }
                  />
                </Row>
                {(row.tags || []).map((t, j) => (
                  <Row key={j} gap="8" wrap vertical="end" fillWidth>
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <Input
                        id={`skill-tag-name-${i}-${j}`}
                        label="Name"
                        placeholder="JavaScript"
                        value={t.name ?? ""}
                        onChange={(e) => updateTag(i, j, { name: e.target.value })}
                      />
                    </div>
                    <div style={{ flex: "0 0 180px", minWidth: 0 }}>
                      <Select
                        id={`skill-tag-icon-${i}-${j}`}
                        label="Icon"
                        value={t.icon || "book"}
                        options={ICON_OPTIONS}
                        onSelect={(v) => updateTag(i, j, { icon: v as IconName })}
                      />
                    </div>
                    <div style={{ flex: "0 0 auto", paddingBottom: 6 }}>
                      <Button
                        size="s"
                        variant="tertiary"
                        label="Remove"
                        onClick={() =>
                          update(i, { tags: (row.tags || []).filter((_, idx) => idx !== j) })
                        }
                      />
                    </div>
                  </Row>
                ))}
              </Column>
            </RowShell>
          ))}
        </Column>
      )}
    </RepeaterShell>
  );
}

function ExperiencesRepeater({
  items,
  onChange,
}: {
  items: ExperienceRow[];
  onChange: (next: ExperienceRow[]) => void;
}) {
  const safe = Array.isArray(items) ? items : [];
  const update = (i: number, patch: Partial<ExperienceRow>) =>
    onChange(safe.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateImage = (i: number, j: number, patch: Partial<ExperienceImageRow>) => {
    const images = (safe[i].images || []).map((im, idx) => (idx === j ? { ...im, ...patch } : im));
    update(i, { images });
  };
  return (
    <RepeaterShell
      title="Work experiences"
      hint="Rendered on /about under the Work Experience heading. Achievements = one per line."
      count={safe.length}
      onAdd={() =>
        onChange([
          ...safe,
          { company: "", role: "", timeframe: "", achievements: [], images: [] },
        ])
      }
    >
      {safe.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          No experiences yet. Click “+ Add”.
        </Text>
      ) : (
        <Column gap="12" fillWidth>
          {safe.map((row, i) => {
            const achText = (row.achievements || []).join("\n");
            return (
              <RowShell
                key={i}
                label={`Experience ${i + 1}`}
                onRemove={() => onChange(safe.filter((_, idx) => idx !== i))}
              >
                <Grid columns="3" m={{ columns: "1" }} gap="12">
                  <Input
                    id={`exp-company-${i}`}
                    label="Company"
                    value={row.company ?? ""}
                    onChange={(e) => update(i, { company: e.target.value })}
                  />
                  <Input
                    id={`exp-role-${i}`}
                    label="Role"
                    value={row.role ?? ""}
                    onChange={(e) => update(i, { role: e.target.value })}
                  />
                  <Input
                    id={`exp-timeframe-${i}`}
                    label="Timeframe"
                    placeholder="Jan 2022 – Present"
                    value={row.timeframe ?? ""}
                    onChange={(e) => update(i, { timeframe: e.target.value })}
                  />
                </Grid>
                <Textarea
                  id={`exp-ach-${i}`}
                  label="Achievements (one per line)"
                  lines={4}
                  value={achText}
                  placeholder={"Shipped X\nLed team of Y\nReduced Z by 30%"}
                  onChange={(e) =>
                    update(i, {
                      achievements: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <Column gap="8" fillWidth>
                  <Row fillWidth horizontal="between" vertical="center" gap="8">
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Images ({(row.images || []).length})
                    </Text>
                    <Button
                      size="s"
                      variant="tertiary"
                      label="+ Add image"
                      onClick={() =>
                        update(i, {
                          images: [
                            ...(row.images || []),
                            { src: "", alt: "", width: 600, height: 400 },
                          ],
                        })
                      }
                    />
                  </Row>
                  {(row.images || []).map((im, j) => (
                    <Row key={j} gap="8" wrap vertical="end" fillWidth>
                      <div style={{ flex: "2 1 240px", minWidth: 0 }}>
                        <Input
                          id={`exp-img-src-${i}-${j}`}
                          label="Src"
                          placeholder="/images/… or https://…"
                          value={im.src ?? ""}
                          onChange={(e) => updateImage(i, j, { src: normalizeImageUrl(e.target.value) })}
                        />
                      </div>
                      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                        <Input
                          id={`exp-img-alt-${i}-${j}`}
                          label="Alt"
                          value={im.alt ?? ""}
                          onChange={(e) => updateImage(i, j, { alt: e.target.value })}
                        />
                      </div>
                      <div style={{ flex: "0 0 90px", minWidth: 0 }}>
                        <Input
                          id={`exp-img-w-${i}-${j}`}
                          label="W"
                          value={String(im.width ?? "")}
                          onChange={(e) => updateImage(i, j, { width: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div style={{ flex: "0 0 90px", minWidth: 0 }}>
                        <Input
                          id={`exp-img-h-${i}-${j}`}
                          label="H"
                          value={String(im.height ?? "")}
                          onChange={(e) => updateImage(i, j, { height: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div style={{ flex: "0 0 auto", paddingBottom: 6 }}>
                        <Button
                          size="s"
                          variant="tertiary"
                          label="Remove"
                          onClick={() =>
                            update(i, { images: (row.images || []).filter((_, idx) => idx !== j) })
                          }
                        />
                      </div>
                    </Row>
                  ))}
                </Column>
              </RowShell>
            );
          })}
        </Column>
      )}
    </RepeaterShell>
  );
}
