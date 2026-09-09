import "./globals.css";
import AuthStatus from "@/components/AuthStatus";
import { AuthProvider } from "@/lib/AuthContext";

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
        <AuthProvider>
          <header className="site-header">
            <div />
            <AuthStatus />
          </header>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
