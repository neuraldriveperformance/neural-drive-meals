import './globals.css';

export const metadata = {
  title: 'Neural Drive Performance - Meal Prep Engine',
  description: 'Performance and rehabilitation meal planning protocol',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}