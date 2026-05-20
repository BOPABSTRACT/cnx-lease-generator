import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CNX Lease Generator',
  description: 'Generate CNX oil & gas lease documents from tracker spreadsheet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
