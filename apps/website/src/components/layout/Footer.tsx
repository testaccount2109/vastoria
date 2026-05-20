import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-vast-border bg-vast-bg-elevated/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-medium text-vast-fg">Vastoria</p>
          <p className="mt-1 text-sm text-vast-fg-muted">
            Native Windows AI IDE · vastoria.online
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-vast-fg-muted">
          <Link href="/downloads" className="hover:text-vast-fg">
            Downloads
          </Link>
          <Link href="/changelog" className="hover:text-vast-fg">
            Changelog
          </Link>
          <Link href="/docs" className="hover:text-vast-fg">
            Documentation
          </Link>
        </div>
        <p className="text-xs text-vast-fg-muted/80">
          Built for Windows 11 and Windows 10.
        </p>
      </div>
    </footer>
  );
}
