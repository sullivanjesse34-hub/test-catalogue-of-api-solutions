export const metadata = {
  title: 'Pages pipeline test',
};

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center',
        background: '#f2f4f7', color: '#1b2024',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {children}
      </body>
    </html>
  );
}
