#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SCRIPTS_DIR = path.join(ROOT, "scripts");

const syntaxCheckFiles = [
  "script.js",
  "fii-dii-chart.js"
];

function listBuildScripts() {
  return fs
    .readdirSync(SCRIPTS_DIR)
    .filter((name) => /^build-.*\.js$/i.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => path.join(SCRIPTS_DIR, name));
}

function runNodeScript(filePath) {
  const relativePath = path.relative(ROOT, filePath) || path.basename(filePath);
  console.log(">");
  console.log("> Running:", relativePath);
  execFileSync(process.execPath, [filePath], {
    cwd: ROOT,
    stdio: "inherit"
  });
}

function runSyntaxCheck(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  console.log(">");
  console.log("> Checking:", relativePath);
  execFileSync(process.execPath, ["--check", filePath], {
    cwd: ROOT,
    stdio: "inherit"
  });
}

function main() {
  const buildScripts = listBuildScripts();

  if (!buildScripts.length) {
    console.warn("No build scripts found in scripts/.");
  }

  buildScripts.forEach(runNodeScript);
  syntaxCheckFiles
    .map((name) => path.join(ROOT, name))
    .filter((filePath) => fs.existsSync(filePath))
    .forEach(runSyntaxCheck);

  console.log(">");
  console.log("> Pre-commit prep complete.");
}

main();
