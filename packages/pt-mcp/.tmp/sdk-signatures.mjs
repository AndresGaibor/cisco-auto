
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";

function dump(title, value) {
  console.log("");
  console.log("## " + title);
  console.log("");
  console.log("```text");
  console.log(value);
  console.log("```");
}

const server = new McpServer({ name: "signature-check", version: "0.0.0" });

dump("registerPrompt.length", String(server.registerPrompt.length));
dump("registerResource.length", String(server.registerResource.length));
dump("ResourceTemplate type", typeof ResourceTemplate);
dump("ResourceTemplate.length", typeof ResourceTemplate === "function" ? String(ResourceTemplate.length) : "n/a");

dump("registerPrompt source", String(server.registerPrompt).slice(0, 4000));
dump("registerResource source", String(server.registerResource).slice(0, 5000));
dump("_createRegisteredPrompt source", String(server._createRegisteredPrompt).slice(0, 5000));
dump("_createRegisteredResource source", String(server._createRegisteredResource).slice(0, 5000));
dump("_createRegisteredResourceTemplate source", String(server._createRegisteredResourceTemplate).slice(0, 5000));

try {
  server.registerPrompt(
    "pt.test_prompt",
    {
      title: "PT Test Prompt",
      description: "Temporary prompt signature smoke test.",
      argsSchema: {},
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "test",
          },
        },
      ],
    }),
  );

  dump("registerPrompt smoke", "ok");
  dump("registered prompts keys", JSON.stringify([...server._registeredPrompts.keys?.() ?? Object.keys(server._registeredPrompts)], null, 2));
} catch (error) {
  dump("registerPrompt smoke", String(error?.stack ?? error));
}

try {
  server.registerResource(
    "pt.test_resource",
    "pt://guide/test",
    {
      title: "PT Test Resource",
      description: "Temporary resource signature smoke test.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [
        {
          uri: "pt://guide/test",
          mimeType: "text/markdown",
          text: "# test",
        },
      ],
    }),
  );

  dump("registerResource smoke", "ok");
  dump("registered resources keys", JSON.stringify([...server._registeredResources.keys?.() ?? Object.keys(server._registeredResources)], null, 2));
} catch (error) {
  dump("registerResource smoke", String(error?.stack ?? error));
}
