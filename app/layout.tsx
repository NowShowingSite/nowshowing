import "./globals.css";
import AuthStatus from "@/components/AuthStatus";

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
          <div />
          <AuthStatus />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
