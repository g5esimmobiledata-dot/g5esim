import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let message = text || `${res.status}: ${res.statusText}`;
    try {
      const json = JSON.parse(text);
      message = json?.message || json?.error || message;
    } catch {
      const title = text.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
      const heading = text.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1];
      if (title || heading) {
        message = (title || heading || '').replace(/<[^>]*>/g, '').trim();
      } else if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        message = `${res.status}: ${res.statusText || 'Request failed'}`;
      }
    }
    throw new Error(message);
  }
}

// export async function apiRequest(
//   method: string,
//   url: string,
//   data?: unknown | undefined,
// ): Promise<Response> {
//   const res = await fetch(url, {
//     method,
//     headers: data ? { "Content-Type": "application/json" } : {},
//     body: data ? JSON.stringify(data) : undefined,
//     credentials: "include",
//   });

//   await throwIfResNotOk(res);
//   return res;
// }


export async function apiRequest(method: string, url: string, data?: any) {
  let options: any = {
    method,
    credentials: "include",
  };

  if (data instanceof FormData) {
    // Do NOT set Content-Type for FormData
    options.body = data;
  } else if (data) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  await throwIfResNotOk(res);
  return res;
}



type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query parameters if the last item is an object
    let url = queryKey[0] as string;
    const params = queryKey[1] as Record<string, any> | undefined;
    
    if (params && typeof params === "object") {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const json = await res.json();
    
    // Handle standardized API response format: {success, message, data}
    // If response has success=true and data field, extract the data
    if (json && typeof json === 'object' && json.success === true && 'data' in json) {
      return json.data;
    }
    
    return json;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
