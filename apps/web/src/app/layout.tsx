import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Стоматология «Фея»',
  description:
    'Частная стоматологическая практика ИП Родионовой Ю.В. — расписание и запись на приём.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
