/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import "$std/dotenv/load.ts";

import { Builder } from "$fresh/dev.ts";
import config from "./fresh.config.ts";

const builder = new Builder({});

if (Deno.args.includes("build")) {
  await builder.build(config);
} else {
  await builder.listen("./main.ts", config, {});
}
