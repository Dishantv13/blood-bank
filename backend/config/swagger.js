import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "RaktSarthi API Documentation",
      version: "1.0.0",
      description:
        "The complete API specification for the Real-Time Blood Management System (RTBMS).",
      contact: {
        name: "API Support",
        email: "support@raktsarthi.com",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "V1 API Server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "bb_user_at",
          description: "JWT access token stored in httpOnly cookie",
        },
        csrfToken: {
          type: "apiKey",
          in: "header",
          name: "x-csrf-token",
          description: "CSRF token required for state-changing operations",
        },
      },
    },
    security: [
      {
        cookieAuth: [],
        csrfToken: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./models/*.js", "./docs/*.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
