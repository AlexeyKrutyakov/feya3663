import Link from 'next/link';

// Stub home page: the real one is a 3D scene (docs/12-home-3d-scene.md).
// Plain links below double as the no-WebGL / keyboard fallback navigation.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-semibold">Стоматология «Фея»</h1>
      <p className="text-sm opacity-70">
        Каркас главной страницы. 3D-сцена с феей появится здесь (docs/12).
      </p>
      <nav aria-label="Основная навигация" className="flex gap-6">
        <Link href="/schedule" className="underline">
          Расписание
        </Link>
        <Link href="/about" className="underline">
          Обо мне
        </Link>
      </nav>
    </main>
  );
}
