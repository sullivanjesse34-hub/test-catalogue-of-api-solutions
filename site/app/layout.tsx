import type {Metadata} from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Agency API Solutions Catalogue',
  description:
    'Browse solutions agencies can build on the Meta Marketing API — by category, with endpoints and build steps.',
};

// Applies a stored theme override before first paint to avoid a flash of the
// wrong theme. Static, developer-authored; no user input is interpolated.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{__html: themeInitScript}}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
