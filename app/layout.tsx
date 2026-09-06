import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Now Showing",
  description: "Ratings from people whose opinions actually matter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="site-logo">
            Now Showing
          </Link>
          <Link href="/login" className="login-link">
            Login
          </Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
