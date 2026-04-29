import { describe, it, expect, beforeEach } from "vitest";
import { mockStore } from "@/services/_mockStore";
import * as chatService from "@/services/chat.service";
describe("chat.service (mock mode)", () => {
    beforeEach(() => {
        mockStore.messages = [];
        mockStore.servers = [...mockStore.servers];
    });
    it("sendMessage appends a message and listMessages returns it", async () => {
        const sent = await chatService.sendMessage("ch-test", "hello world");
        expect(sent.content).toBe("hello world");
        expect(sent.channelId).toBe("ch-test");
        const list = await chatService.listMessages("ch-test");
        expect(list).toHaveLength(1);
        expect(list[0].id).toBe(sent.id);
    });
    it("addReaction toggles a reaction for the current user", async () => {
        const m = await chatService.sendMessage("ch-test", "react me");
        await chatService.addReaction(m.id, "🔥");
        let stored = mockStore.messages.find(x => x.id === m.id);
        expect(stored.reactions?.[0]).toMatchObject({ emoji: "🔥", userIds: [mockStore.selfId] });
        await chatService.addReaction(m.id, "🔥");
        stored = mockStore.messages.find(x => x.id === m.id);
        expect(stored.reactions ?? []).toHaveLength(0);
    });
});
