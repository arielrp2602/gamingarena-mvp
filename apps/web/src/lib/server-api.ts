import { cookies } from 'next/headers';

const API = process.env.API_URL ?? 'http://localhost:3001';

export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Cookie: `access_token=${token}` } : {}),
      ...options?.headers,
    },
    next: { revalidate: 0 }, // no cache por default
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${path}`);
  }

  return res.json() as Promise<T>;
}
