import Link from "next/link";
import pageStyles from "@/styles/page-shell.module.scss";

export default function NotFound() {
  return (
    <div className={pageStyles.shell}>
      <div className={`${pageStyles.page} ${pageStyles.narrow}`}>
        <header className={pageStyles.pageHeader}>
          <div>
            <h1 className={pageStyles.pageTitle}>Page Not Found</h1>
          </div>
        </header>
        <Link href="/" className={pageStyles.textLink}>
          ← Back to all posts
        </Link>
      </div>
    </div>
  );
}
