import { UnsubscribeConfirm } from "@/components/UnsubscribeConfirm";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";
import pageStyles from "@/styles/page-shell.module.scss";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const email = await verifyUnsubscribeToken(t);

  return (
    <div className={pageStyles.shell}>
      <div className={`${pageStyles.page} ${pageStyles.narrow}`}>
        <header className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Unsubscribe</h1>
          </div>
        </header>
        <UnsubscribeConfirm email={email ?? undefined} token={t} />
      </div>
    </div>
  );
}
