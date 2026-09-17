export interface Env {
	AUTH_SERVICE_URL: string
}


export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);
		const pathName = url.pathname;

		if (req.method == 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				}
			})
		}

		let targetBaseUrl = '';
		if (pathName.startsWith("/api/auth")) {
			targetBaseUrl = env.AUTH_SERVICE_URL;
		} else {
			return new Response(JSON.stringify({
				error: "Endpoint not found on Gateway"
			}), {
				status: 404,
				headers: { 'Content-Type': "application/json" }
			})
		}

		const targetUrl = `${targetBaseUrl}${pathName}${url.search}`

		const proxyReq = new Request(targetUrl, {
			method: req.method,
			headers: req.headers,
			body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
			redirect: 'follow'
		})

		try {
			const res = await fetch(proxyReq);

			const resHeaders = new Headers(res.headers);
			resHeaders.set('Access-Control-Allow-Origin', '*');

			return new Response(res.body, {
				status: res.status,
				statusText: res.statusText,
				headers: resHeaders
			})

		} catch (err: any) {
			console.error("API Gateway Error", err.message || err);
			return new Response(
				JSON.stringify({ error: 'Gateway Proxy Failure', details: err.message }),
				{ status: 502, headers: { 'Content-Type': 'application/json' } }
			);
		}
	}
} satisfies ExportedHandler<Env>;
