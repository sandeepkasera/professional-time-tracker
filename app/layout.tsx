import './global.css'
// Update the path below to the correct location of your QueryClientProvider file
import { ReactQueryProvider } from "./query/ReactQueryProvider";


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <main className="flex-1 bg-gray-50">
            <ReactQueryProvider>
              {children}
             </ReactQueryProvider>
          </main>
        </div>
      </body>
    </html>
  );
}
