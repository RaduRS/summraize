import axios from "axios";

// Types for LMS platforms
export type LMSPlatform = "canvas" | "blackboard" | "moodle" | "brightspace";

interface LMSCredentials {
  apiKey?: string;
  domain: string;
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

interface DevEnvironment {
  domain: string;
  testToken: string;
}

// Development/Test environments
const DEV_ENVIRONMENTS = {
  canvas: {
    domain: "canvas.beta.instructure.com",
    // You can generate this token in your Canvas Beta account
    testToken: "TEST_TOKEN",
  } as DevEnvironment,
  moodle: {
    domain: "sandbox.moodledemo.net",
    // Moodle demo site token
    testToken: "TEST_TOKEN",
  } as DevEnvironment,
  // Mock responses for development
  mockResponses: {
    courses: [
      {
        id: 1,
        name: "Test Course 101",
        course_code: "TEST101",
        start_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        name: "Demo Mathematics",
        course_code: "MATH101",
        start_at: "2024-01-01T00:00:00Z",
      },
    ],
  },
};

// Canvas LMS API
export async function connectCanvasLMS(
  credentials: LMSCredentials,
  isDevelopment = true
) {
  if (isDevelopment && !credentials.token) {
    // Return mock data only if no real token is provided
    console.log("Using Canvas development environment with mock data");
    return {
      success: true,
      data: DEV_ENVIRONMENTS.mockResponses.courses,
    };
  }

  // Use the provided domain or default to Canvas beta for testing
  const domain = credentials.domain || "canvas.beta.instructure.com";

  try {
    console.log("Testing Canvas connection...");

    // First, test the connection by getting the user profile
    const userResponse = await fetch("/api/canvas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain,
        token: credentials.token,
        endpoint: "/users/self",
      }),
    });

    if (!userResponse.ok) {
      const error = await userResponse.json();
      throw new Error(error.error || "Failed to connect to Canvas");
    }

    const userData = await userResponse.json();
    console.log("Connected as:", userData.data.name);

    // Then get the courses
    const coursesResponse = await fetch("/api/canvas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain,
        token: credentials.token,
        endpoint: "/courses",
        params: {
          enrollment_type: "teacher",
          state: ["available", "completed"],
          include: ["term"],
          per_page: 10,
        },
      }),
    });

    if (!coursesResponse.ok) {
      const error = await coursesResponse.json();
      throw new Error(error.error || "Failed to fetch courses");
    }

    const coursesData = await coursesResponse.json();

    return {
      success: true,
      data: {
        user: userData.data,
        courses: coursesData.data,
      },
    };
  } catch (error: any) {
    console.error("Canvas LMS connection error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to connect to Canvas LMS",
    };
  }
}

// Moodle API with development support
export async function connectMoodle(
  credentials: LMSCredentials,
  isDevelopment = true
) {
  if (isDevelopment) {
    // Return mock data for development
    console.log("Using Moodle development environment");
    return {
      success: true,
      data: {
        sitename: "Test Moodle Site",
        username: "testuser",
        courses: DEV_ENVIRONMENTS.mockResponses.courses,
      },
    };
  }

  const api = axios.create({
    baseURL: `https://${credentials.domain}/webservice/rest/server.php`,
    params: {
      wstoken: credentials.token,
      moodlewsrestformat: "json",
    },
  });

  try {
    const response = await api.get("", {
      params: {
        wsfunction: "core_webservice_get_site_info",
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Moodle connection error:", error);
    return {
      success: false,
      error: "Failed to connect to Moodle",
    };
  }
}

// Mock implementations for development testing
export async function connectBlackboard(
  credentials: LMSCredentials,
  isDevelopment = true
) {
  if (isDevelopment) {
    console.log("Using Blackboard mock environment");
    return {
      success: true,
      data: {
        access_token: "mock_token",
        courses: DEV_ENVIRONMENTS.mockResponses.courses,
      },
    };
  }

  const { domain, clientId, clientSecret } = credentials;
  const api = axios.create({
    baseURL: `https://${domain}/learn/api/public/v1`,
  });

  try {
    // Get OAuth token
    const tokenResponse = await api.post("/oauth2/token", {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const { access_token } = tokenResponse.data;

    // Test the connection
    const response = await api.get("/courses", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Blackboard connection error:", error);
    return {
      success: false,
      error: "Failed to connect to Blackboard",
    };
  }
}

export async function connectBrightspace(
  credentials: LMSCredentials,
  isDevelopment = true
) {
  if (isDevelopment) {
    console.log("Using Brightspace mock environment");
    return {
      success: true,
      data: {
        access_token: "mock_token",
        courses: DEV_ENVIRONMENTS.mockResponses.courses,
      },
    };
  }

  const { domain, clientId, clientSecret } = credentials;
  const api = axios.create({
    baseURL: `https://${domain}/d2l/api/`,
  });

  try {
    // Get OAuth token
    const tokenResponse = await api.post("/token", {
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const { access_token } = tokenResponse.data;

    // Test the connection
    const response = await api.get("/lp/1.0/courses/", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("Brightspace connection error:", error);
    return {
      success: false,
      error: "Failed to connect to Brightspace",
    };
  }
}

// Updated test function with development mode
export async function testLMSConnection(
  platform: LMSPlatform,
  credentials: LMSCredentials,
  isDevelopment = true
) {
  switch (platform) {
    case "canvas":
      return connectCanvasLMS(credentials, isDevelopment);
    case "blackboard":
      return connectBlackboard(credentials, isDevelopment);
    case "moodle":
      return connectMoodle(credentials, isDevelopment);
    case "brightspace":
      return connectBrightspace(credentials, isDevelopment);
    default:
      return {
        success: false,
        error: "Unsupported LMS platform",
      };
  }
}
