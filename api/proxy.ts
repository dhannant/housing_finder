import type { VercelRequest, VercelResponse } from "@vercel/node";

const fetch: any = (...args: any[]) => import("node-fetch").then((mod: any) => mod.default(...args));

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		// Extract the RapidAPI URL from query parameters
		const apiUrl = req.query.apiUrl;
		
		if (!apiUrl || typeof apiUrl !== "string") {
			return res.status(400).json({ error: "Missing apiUrl parameter" });
		}

		// Proxy the request to RapidAPI with authentication
		const response = await fetch(apiUrl, {
			headers: {
				"X-RapidAPI-Key": process.env.RAPIDAPI_KEY!,
				"X-RapidAPI-Host": "realty-us.p.rapidapi.com",
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			return res.status(response.status).json({ 
				error: "RapidAPI request failed", 
				details: errorText 
			});
		}

		// Return raw API response
		const data = await response.json();
		return res.status(200).json(data);
		
	} catch (error: any) {
		return res.status(500).json({
			error: "Internal server error",
			message: error?.message || "Unknown error",
			stack: process.env.NODE_ENV === "development" ? error?.stack : undefined
		});
	}
}
