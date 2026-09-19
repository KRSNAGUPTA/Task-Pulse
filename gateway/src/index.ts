export interface Env {
	AUTH_SERVICE_URL: string;
	TASK_SERVICE_URL: string;
}

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
	'Access-Control-Max-Age': '86400',
};

// Which upstream service handles which public path prefix.
const ROUTES: { prefix: string; service: keyof Env }[] = [
	{ prefix: '/api/auth', service: 'AUTH_SERVICE_URL' },
	{ prefix: '/api/task', service: 'TASK_SERVICE_URL' },
	{ prefix: '/.well-known', service: 'AUTH_SERVICE_URL' }, // JWKS lives on the auth service, no /api prefix
];

const jsonResponse = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
	});

const matchRoute = (pathname: string) =>
	ROUTES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

async function proxyRequest(req: Request, targetUrl: string): Promise<Response> {
	const proxyReq = new Request(targetUrl, {
		method: req.method,
		headers: req.headers,
		body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
		redirect: 'follow',
	});

	const res = await fetch(proxyReq);

	const resHeaders = new Headers(res.headers);
	resHeaders.set('Access-Control-Allow-Origin', '*');

	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers: resHeaders,
	});
}

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);

		if (req.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const route = matchRoute(url.pathname);
		if (!route) {
			return jsonResponse(
				{
					error:
						'Task Pulse API Gateway is working! Please add the service prefix (/api/auth, /api/task) or use /.well-known/jwks.json. Refer to the OpenAPI doc for more reference.',
				},
				404,
			);
		}

		const baseUrl = (env[route.service] || '').replace(/\/+$/, '');
		if (!baseUrl) {
			return jsonResponse({ message: `${route.service} is not configured!` }, 500);
		}

		const targetUrl = `${baseUrl}${url.pathname}${url.search}`;

		try {
			return await proxyRequest(req, targetUrl);
		} catch (err: any) {
			console.error('API Gateway Error', err?.message || err);
			return jsonResponse({ error: 'Gateway Proxy Failure', details: err?.message }, 502);
		}
	},
} satisfies ExportedHandler<Env>;