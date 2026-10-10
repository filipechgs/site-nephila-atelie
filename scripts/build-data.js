#!/usr/bin/env node
"use strict";

const { buildData } = require("./catalog");

try {
  const result = buildData();
  console.log("js/data.js gerado — " + result.categories + " categorias, " + result.products + " peças.");
  result.warnings.forEach((warning) => console.warn("Aviso: " + warning));
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
