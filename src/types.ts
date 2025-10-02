export interface SwaggerResponse {
  apiVersion: string;
  swaggerVersion: string;
  apis: {
    path: string;
    description: string;
  }[];
}

export type SwaggerType = string;

export type SwaggerPrimitiveType =
  | "string"
  | "boolean"
  | "integer"
  | "array"
  | "datetime";

export interface SwaggerInterface {
  id: string;
  description: string;
  required: string[];
  deprecated?: boolean;
  deprecation_description?: string;
  properties: Record<
    string,
    {
      description: string;
      example: string;
      type: SwaggerPrimitiveType | string;
      allowableValues?: {
        values: string[];
      };
      $ref?: SwaggerType;
      items?: {
        $ref?: SwaggerType;
        type?: SwaggerPrimitiveType;
      };
    }
  >;
}

export interface SwaggerEndpoint extends SwaggerResponse {
  apis: {
    path: string;
    description: string;

    operations: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      summary: string;
      notes: string;
      nickname: string;

      parameters: {
        paramType: "path" | "query" | "body";
        name: string;
        description: string;
        required: boolean;
        format?: string;
        deprecated?: boolean;
        enum?: string[];
        type: string;
        items?: {
          type?: string;
          $ref?: SwaggerType;
        };
      }[];

      response_fields: {
        // TODO: response fields
      }[];

      deprecated?: boolean;
      deprecation_description?: string;
      type: string;
      items?: {
        type?: string;
        $ref?: SwaggerType;
      };
    }[];
  }[];
  models: Record<SwaggerType, SwaggerInterface>;
}
