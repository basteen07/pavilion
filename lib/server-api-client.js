import { headers } from 'next/headers';

// Base URL handling for Server Components
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

export async function serverApiCall(endpoint, options = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Forward necessary headers like Cookie (for auth) if available
  const headersList = headers();
  const cookie = headersList.get('cookie');

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(cookie && { Cookie: cookie }),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Server components fetch cache options
    cache: options.cache || 'no-store', // Default to no-store for dynamic data, unless specified
  };

  try {
    const res = await fetch(url, config);

    if (!res.ok) {
        // Safe error handling for 404s or other non-200s if needed by caller
        // Some callers might want null on 404
        if (res.status === 404) return null;
        
        const errorData = await res.json().catch(() => ({}));
        console.error(`Sever API Error [${res.status}] ${url}:`, errorData);
        throw new Error(errorData.error || `API request failed: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Server API Fetch Failed: ${url}`, error);
    // Return null or rethrow depending on strategy. 
    // For page rendering, often null is safer to handle "not found" vs 500
    return null;
  }
}
