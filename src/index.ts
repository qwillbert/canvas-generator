import { env, stringWidth } from "bun";
import type { DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES } from "react";
import { Project, ScriptTarget } from "ts-morph";
import type { IndexKind } from "typescript";
import type {
  SwaggerEndpoint,
  SwaggerInterface,
  SwaggerResponse,
  SwaggerType,
} from "./types";
import { mapPropertyType } from "./utils";

const API_URL =
  env.API_URL ?? "https://canvas.instructure.com/doc/api/api-docs.json";

const cacheEnabled = true;

console.time("Total time");
console.time("Fetching endpoints");

const models = new Map<SwaggerType, SwaggerInterface>();

const endpointCacheFile = Bun.file("./cache/endpoints.json");

let swaggerResponse: SwaggerResponse;

if (await endpointCacheFile.exists()) {
  swaggerResponse = (await endpointCacheFile.json()) as SwaggerResponse;
} else {
  console.log("Fetching endpoints from API...");
  const routesRequest = await fetch(API_URL);

  swaggerResponse = (await routesRequest.json()) as SwaggerResponse;

  Bun.write(
    Bun.file("./cache/endpoints.json"),
    JSON.stringify(swaggerResponse, null, 2)
  );
}

const endpoints: SwaggerEndpoint[] = [];

for (const api of swaggerResponse.apis) {
  let endpoint: SwaggerEndpoint;

  let cacheFile = Bun.file("./cache/" + api.path.split("/").slice(1).join("_"));

  if (await cacheFile.exists()) {
    endpoint = (await cacheFile.json()) as SwaggerEndpoint;
  } else {
    const endpointRequest = await fetch(
      API_URL.split("/").slice(0, -1).join("/") + api.path
    );

    endpoint = (await endpointRequest.json()) as SwaggerEndpoint;

    if (cacheEnabled) {
      await Bun.write(cacheFile, JSON.stringify(endpoint, null, 2));
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  endpoints.push(endpoint);

  for (const modelKey in endpoint.models) {
    models.set(modelKey, endpoint.models[modelKey]!);
  }
}

console.log(`Found ${models.size} models`);
console.timeEnd("Fetching endpoints");

console.time("Generating types");

let output = `// auto generated file - don't edit\n\n`;

let i = 0;

for (const [modelName, model] of models) {
  i++;

  if (model.description) output += `/** ${model.description} */\n`;
  output += `export interface ${modelName.replaceAll("::", "")} {\n`;

  if (!model.properties) {
    output += "}\n\n";
    console.timeEnd(`Generating ${modelName}`);
    continue;
  }

  for (const [propertyName, property] of Object.entries(model.properties)) {
    const refExists = property.$ref && models.has(property.$ref);

    let propertyType =
      (refExists ? property.$ref?.replaceAll("::", "") : null) ??
      mapPropertyType(property);

    if (property.description) output += `  /** ${property.description} */\n`;
    output += `  "${propertyName}"${
      model.required?.includes(propertyName) ? "" : "?"
    }: ${propertyType};\n`;
  }

  output += `}\n\n`;
}

console.timeEnd("Generating types");

// console.time("Generating sdk functions");

// for (const endpoint of endpoints) {
//   for (const api of endpoint.apis) {
//     if (api.operations.length === 0) continue;

//     for (const operation of api.operations) {
//       if (operation.method !== "GET") continue;

//       const toCamelCase = operation.nickname
//         .replace(/_([a-z])/g, (g) => g[1].toUpperCase())
//         .replace(/^([A-Z])/, (g) => g[0].toLowerCase());

//       let returnType = "any"; // default to any

//       if (operation.type && models.has(operation.type)) {
//         returnType = operation.type.replaceAll("::", "");
//       }

//       if (operation.type === "array" && operation.response_fields) {
//         if (operation.items?.$ref && models.has(operation.items.$ref)) {
//           returnType = operation.items.$ref.replaceAll("::", "") + "[]";
//         } else if (operation.items?.type && models.has(operation.items.type)) {
//           returnType = operation.items.type.replaceAll("::", "") + "[]";
//         } else {
//           returnType = "any[]";

//           console.warn(
//             "could not find model for array item in " + operation.nickname
//           );
//         }
//       }

//       function getParamType(param: (typeof operation.parameters)[0]): string {
//         if (param.enum) {
//           return `"` + param.enum.join(`" | "`) + `"`;
//         } else if (param.$ref && models.has(param.$ref)) {
//           return param.$ref.replaceAll("::", "");
//         } else if (param.type && models.has(param.type)) {
//           return param.type.replaceAll("::", "");
//         } else if (param.type) {
//           return mapPropertyType(param as any);
//         }

//         return "any";
//       }

//       const pathInterfaceData = operation.parameters
//         .filter((param) => param.paramType === "path")
//         .map((param) => {
//           return `  /** ${param.description} */\n  ${param.name}${
//             param.required ? "" : "?"
//           }: ${getParamType(param)};`;
//         })
//         .join("\n");

//       const queryInterfaceData = operation.parameters
//         .filter((param) => param.paramType === "query")
//         .map((param) => {
//           return `  /** ${param.description} */\n  ${param.name}${
//             param.required ? "" : "?"
//           }: ${getParamType(param)};`;
//         })
//         .join("\n");

//       // let interfaceData = `path?: {\n${pathInterfaceData}\n};\nquery?: {\n${queryInterfaceData}\n};`;
//       let interfaceData = "";

//       if (pathInterfaceData.length > 0)
//         interfaceData += `path: {\n${pathInterfaceData}\n};\n`;
//       if (queryInterfaceData.length > 0)
//         interfaceData += `query: {\n${queryInterfaceData}\n};\n`;

//       output += `\n\nexport interface ${toCamelCase}Params {\n${interfaceData}\n}`;

//       output += `\n\nexport async function ${toCamelCase}(params: ${toCamelCase}Params): Promise<${returnType}> {}`;
//     }
//   }
// }

// console.timeEnd("Generating sdk functions");

console.time("Saving types");

await Bun.write(Bun.file("./dist/canvas-types.ts"), output);

console.timeEnd("Saving types");
console.timeEnd("Total time");
