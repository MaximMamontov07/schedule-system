import './globals.css';

export const metadata = {
  title: 'Расписание колледжа',
  description: 'Система управления расписанием занятий',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}