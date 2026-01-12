import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export type AgentConfig = {
  allowedPaths: {
    backend: string[];
    ui: string[];
    debug: string[];
  };
  gateCommands: string[];
  git: {
    baseBranch: string;
    remote: string;
    branchPrefix: string;
  };
  openai: {
    model: string;
    maxIterations: number;
  };
};

export function getRepoRootFromGit(): string {
  const out = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf-8" }).trim();
  return out;
}

export function loadAgentConfig(): { config: AgentConfig; repoRoot: string; configPath: string } {
  const repoRoot = getRepoRootFromGit();
  const configPath = path.join(repoRoot, "apps/api/agent.config.json");

  const raw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw) as AgentConfig;

  return { config, repoRoot, configPath };
}

export function resolveGateCommands(config: AgentConfig, mission0GateCandidates: string[]): string[] {
  const cmds = config.gateCommands ?? [];
  if (cmds.length === 1 && cmds[0] === "AUTO_FROM_MISSION0") return mission0GateCandidates;
  return cmds;
}

export function resolveModel(config: AgentConfig): string {
  const placeholder = "FROM_ENV_OPENAI_MODEL";

  const envModel = process.env.OPENAI_MODEL?.trim();
  if (envModel && envModel !== placeholder) return envModel;

  const configModel = config.openai.model?.trim();
  if (configModel && configModel !== placeholder) return configModel;

  // KISS: toimiva fallback, jos config/env on placeholder.
  return "gpt-4.1-mini";
}
