export interface Env {
	AUTH_SERVICE_URL: string;
	TASK_SERVICE_URL: string;
	CORS_ORIGIN?: string | string[];
	MY_RATE_LIMITTER: {
		limit: (options: { key: string }) => Promise<{ success: boolean }>;
	};
}

const ROUTES: { prefix: string; service: keyof Env }[] = [
	{ prefix: '/api/auth', service: 'AUTH_SERVICE_URL' },
	{ prefix: '/api/task', service: 'TASK_SERVICE_URL' },
	{ prefix: '/.well-known', service: 'AUTH_SERVICE_URL' },
];

function getAllowedOrigins(env: Env): string[] {
	if (!env.CORS_ORIGIN) return ['*'];
	if (Array.isArray(env.CORS_ORIGIN)) return env.CORS_ORIGIN;
	try {
		const parsed = JSON.parse(env.CORS_ORIGIN);
		if (Array.isArray(parsed)) return parsed;
	} catch {
		return env.CORS_ORIGIN.split(',').map((o) => o.trim());
	}
	return ['*'];
}

function getCorsHeaders(requestOrigin: string | null, allowedOrigins: string[]): Record<string, string> {
	let matchedOrigin = '*';
	if (allowedOrigins.includes('*')) {
		matchedOrigin = '*';
	} else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
		matchedOrigin = requestOrigin;
	} else if (allowedOrigins.length > 0) {
		matchedOrigin = allowedOrigins[0];
	}

	return {
		'Access-Control-Allow-Origin': matchedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	};
}

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string>): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...headers },
	});

const matchRoute = (pathname: string) =>
	ROUTES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

async function proxyRequest(req: Request, targetUrl: string, corsHeaders: Record<string, string>): Promise<Response> {
	const proxyReq = new Request(targetUrl, {
		method: req.method,
		headers: req.headers,
		body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
		redirect: 'follow',
	});

	const res = await fetch(proxyReq);
	const resHeaders = new Headers(res.headers);

	Object.entries(corsHeaders).forEach(([key, value]) => {
		resHeaders.set(key, value);
	});

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: resHeaders,
	});
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);
		const requestOrigin = req.headers.get('Origin');
		const allowedOrigins = getAllowedOrigins(env);
		const corsHeaders = getCorsHeaders(requestOrigin, allowedOrigins);

		if (req.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		const clientIp = req.headers.get('cf-connecting-ip') || '127.0.0.1';
		const { success } = await env.MY_RATE_LIMITTER.limit({ key: clientIp });

		if (!success) {
			return jsonResponse(
				{
					error: 'Too Many Requests',
					message: 'Rate limit exceeded. Please try again later.',
				},
				429,
				corsHeaders
			);
		}

		const route = matchRoute(url.pathname);
		if (!route) {
			return jsonResponse(
				{
					error:
						'Task Pulse API Gateway is working! Please add the service prefix (/api/auth, /api/task) or use /.well-known/jwks.json.',
				},
				404,
				corsHeaders
			);
		}

		const baseUrl = ((env[route.service] as string) || '').replace(/\/+$/, '');
		if (!baseUrl) {
			return jsonResponse({ message: `${route.service} is not configured!` }, 500, corsHeaders);
		}

		const targetUrl = `${baseUrl}${url.pathname}${url.search}`;

		try {
			return await proxyRequest(req, targetUrl, corsHeaders);
		} catch (err: any) {
			console.error('API Gateway Error', err?.message || err);
			return jsonResponse({ error: 'Gateway Proxy Failure', details: err?.message }, 502, corsHeaders);
		}
	},
} satisfies ExportedHandler<Env>;