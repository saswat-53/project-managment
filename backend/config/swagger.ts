import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Project Management API",
      version: "1.0.0",
      description: "RESTful API for Project Management System",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description: "JWT stored in cookie",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            username: {
              type: "string",
              example: "johndoe",
            },
            email: {
              type: "string",
              example: "john@example.com",
            },
            fullName: {
              type: "string",
              example: "John Doe",
            },
            isEmailVerified: {
              type: "boolean",
              example: true,
            },
          },
        },
        Workspace: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            name: {
              type: "string",
              example: "My Workspace",
            },
            description: {
              type: "string",
              example: "Workspace description",
            },
            owner: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: {
                    type: "string",
                    example: "60d0fe4f5311236168a109ca",
                  },
                  role: {
                    type: "string",
                    enum: ["admin", "member"],
                    example: "member",
                  },
                },
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Project: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            name: {
              type: "string",
              example: "My Project",
            },
            description: {
              type: "string",
              example: "Project description",
            },
            workspace: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: {
                    type: "string",
                    example: "60d0fe4f5311236168a109ca",
                  },
                  role: {
                    type: "string",
                    enum: ["admin", "member"],
                    example: "member",
                  },
                },
              },
            },
            status: {
              type: "string",
              enum: ["active", "archived", "completed"],
              example: "active",
            },
            startDate: {
              type: "string",
              format: "date-time",
            },
            endDate: {
              type: "string",
              format: "date-time",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Task: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            title: {
              type: "string",
              example: "Complete the feature",
            },
            description: {
              type: "string",
              example: "Task description",
            },
            project: {
              type: "string",
              example: "60d0fe4f5311236168a109ca",
            },
            assignedTo: {
              type: "array",
              items: {
                type: "string",
                example: "60d0fe4f5311236168a109ca",
              },
            },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "in_review", "completed"],
              example: "todo",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              example: "medium",
            },
            dueDate: {
              type: "string",
              format: "date-time",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.ts", "./routes/*.js"], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
