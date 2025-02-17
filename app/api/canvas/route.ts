import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const {
      domain,
      token,
      endpoint,
      method = "GET",
      params = {},
    } = await request.json();

    const api = axios.create({
      baseURL: `https://${domain}/api/v1`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    let response;
    if (method === "GET") {
      response = await api.get(endpoint, { params });
    } else {
      response = await api.post(endpoint, params);
    }

    return NextResponse.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error("Canvas API error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        error:
          error.response?.data?.errors?.[0]?.message ||
          "Failed to connect to Canvas API",
      },
      { status: error.response?.status || 500 }
    );
  }
}
