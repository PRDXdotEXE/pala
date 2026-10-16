import { Link, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface HealthResponse {
  status: string;
  db: string;
  ai: string;
  model: string;
  provider: string;
}

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Private AI Lead Assistant</h1>
      <p className="mt-2 text-gray-600">
        Phase 1 scaffolding — client, server, and local AI wired up.
      </p>

      <section className="mt-6 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Backend status</h2>
        {isLoading && <p className="mt-2 text-gray-500">Checking…</p>}
        {error && <p className="mt-2 text-red-600">Server unreachable</p>}
        {data && (
          <ul className="mt-2 space-y-1">
            <li>Status: {data.status}</li>
            <li>Database: {data.db}</li>
            <li>AI ({data.provider}): {data.ai}</li>
            <li>Model: {data.model}</li>
          </ul>
        )}
      </section>

      <nav className="mt-6 text-sm">
        <Link className="text-blue-600 underline" to="/">
          Home
        </Link>
      </nav>
    </main>
  );
}

function NotFound() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Not found</h1>
      <Link className="mt-2 inline-block text-blue-600 underline" to="/">
        Back home
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
