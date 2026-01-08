import { describe, expect, test } from "@/test";
import type { A2AExecuteParams } from "./a2a-executor";

describe("A2A Executor Trust Propagation", () => {
  describe("delegation depth limit", () => {
    test("should throw error when delegation depth exceeds maximum", async ({
      makeAgent,
      makeOrganization,
    }) => {
      const organization = await makeOrganization();
      const agent = await makeAgent({ name: "Test Agent" });

      const { PromptModel } = await import("@/models");
      const prompt = await PromptModel.create(organization.id, {
        name: "Test Prompt",
        agentId: agent.id,
      });

      const { executeA2AMessage } = await import("./a2a-executor");

      // Create a delegation chain that exceeds the maximum (5)
      const params: A2AExecuteParams = {
        promptId: prompt.id,
        message: "Test message",
        organizationId: organization.id,
        userId: "test-user",
        delegationChain: ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"],
      };

      await expect(executeA2AMessage(params)).rejects.toThrow(
        "Maximum delegation depth (5) exceeded",
      );
    });
  });

  describe("A2AExecuteParams interface", () => {
    test("should accept parentContextIsUntrusted parameter", () => {
      const params: A2AExecuteParams = {
        promptId: "test-prompt-id",
        message: "Test message",
        organizationId: "test-org",
        userId: "test-user",
        parentContextIsUntrusted: true,
      };

      expect(params.parentContextIsUntrusted).toBe(true);
    });

    test("should accept delegationChain parameter", () => {
      const params: A2AExecuteParams = {
        promptId: "test-prompt-id",
        message: "Test message",
        organizationId: "test-org",
        userId: "test-user",
        delegationChain: ["agent-1", "agent-2"],
      };

      expect(params.delegationChain).toEqual(["agent-1", "agent-2"]);
    });
  });
});
