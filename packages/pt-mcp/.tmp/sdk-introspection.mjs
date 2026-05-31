
import { McpServer } from "@modelcontextprotocol/server";
import * as serverPkg from "@modelcontextprotocol/server";
import * as nodePkg from "@modelcontextprotocol/node";

function safeValue(value) {
  if (typeof value === "function") return "[function]";
  if (typeof value === "symbol") return String(value);
  if (value === undefined) return "[undefined]";
  return value;
}

function dump(title, value) {
  console.log("");
  console.log("## " + title);
  console.log("");
  console.log("```json");
  console.log(JSON.stringify(value, null, 2));
  console.log("```");
}

const server = new McpServer({
  name: "introspection",
  version: "0.0.0",
});

const proto = Object.getPrototypeOf(server);
const protoNames = Object.getOwnPropertyNames(proto).sort();
const instanceNames = Object.keys(server).sort();

dump("server package exports", Object.keys(serverPkg).sort());
dump("node package exports", Object.keys(nodePkg).sort());
dump("McpServer prototype names", protoNames);
dump("McpServer instance keys", instanceNames);

dump("known method availability", {
  registerTool: typeof server.registerTool,
  tool: typeof server.tool,
  registerPrompt: typeof server.registerPrompt,
  prompt: typeof server.prompt,
  registerResource: typeof server.registerResource,
  resource: typeof server.resource,
  setRequestHandler: typeof server.setRequestHandler,
  connect: typeof server.connect,
});

dump("all function-like prototype entries", protoNames
  .map((name) => ({ name, type: typeof server[name] }))
  .filter((item) => item.type === "function"));

const possibleInnerKeys = ["server", "_server", "_serverInstance", "_protocolServer"];
const innerCandidates = Object.fromEntries(
  possibleInnerKeys.map((key) => [key, {
    exists: server[key] !== undefined,
    type: typeof server[key],
  }])
);

dump("inner candidate keys", innerCandidates);

for (const key of possibleInnerKeys) {
  const inner = server[key];
  if (!inner || typeof inner !== "object") continue;

  dump("inner server shape: " + key, {
    keys: Object.keys(inner).sort(),
    proto: Object.getOwnPropertyNames(Object.getPrototypeOf(inner)).sort(),
    setRequestHandler: typeof inner.setRequestHandler,
    registerCapabilities: typeof inner.registerCapabilities,
    connect: typeof inner.connect,
  });
}

dump("own descriptors", Object.fromEntries(
  Object.entries(Object.getOwnPropertyDescriptors(server)).map(([key, desc]) => [
    key,
    {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      writable: "writable" in desc ? desc.writable : undefined,
      valueType: "value" in desc ? typeof desc.value : undefined,
      get: typeof desc.get,
      set: typeof desc.set,
    },
  ])
));

console.log("");
console.log("## direct method smoke");
console.log("");
console.log("```text");
for (const method of ["registerTool", "tool", "registerPrompt", "prompt", "registerResource", "resource", "setRequestHandler"]) {
  console.log(method + ": " + typeof server[method]);
}
console.log("```");
