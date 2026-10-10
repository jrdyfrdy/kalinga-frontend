import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal fake of laravel-echo: one channel object per name, recording
// listen/stopListening calls and leave().
const channels = new Map();
const leave = vi.fn((name) => channels.delete(name));

const makeChannel = () => {
  const handlers = new Map();
  return {
    handlers,
    listen: vi.fn((event, cb) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(cb);
    }),
    stopListening: vi.fn((event, cb) => {
      if (cb) handlers.get(event)?.delete(cb);
      else handlers.delete(event);
    }),
    subscribed: vi.fn(),
    error: vi.fn(),
    emit(event, payload) {
      handlers.get(event)?.forEach((cb) => cb(payload));
    },
  };
};

const getChannel = (name) => {
  if (!channels.has(name)) channels.set(name, makeChannel());
  return channels.get(name);
};

vi.mock("laravel-echo", () => ({
  default: vi.fn().mockImplementation(function Echo() {
    this.options = { auth: { headers: {} } };
    this.connector = {};
    this.join = getChannel;
    this.private = getChannel;
    this.channel = getChannel;
    this.leave = leave;
  }),
}));
vi.mock("pusher-js", () => ({ default: vi.fn() }));

const { subscribeChannel, leaveAllSharedChannels } = await import("../services/echo");

describe("subscribeChannel (shared, ref-counted Echo subscriptions)", () => {
  beforeEach(() => {
    leaveAllSharedChannels();
    channels.clear();
    leave.mockClear();
  });

  it("keeps the channel for other subscribers when one unsubscribes", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribeChannel("incidents", "presence", { ".IncidentUpdated": a });
    const offB = subscribeChannel("incidents", "presence", { ".IncidentUpdated": b });

    getChannel("incidents").emit(".IncidentUpdated", { id: 1 });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    offA();
    expect(leave).not.toHaveBeenCalled();

    getChannel("incidents").emit(".IncidentUpdated", { id: 2 });
    expect(a).toHaveBeenCalledTimes(1); // removed only A's handler
    expect(b).toHaveBeenCalledTimes(2);

    offB();
    expect(leave).toHaveBeenCalledWith("incidents");
  });

  it("removes only the caller's handler (passes the callback to stopListening)", () => {
    const handler = vi.fn();
    const off = subscribeChannel("chat.user.5", "private", { ".message.sent": handler });
    const channel = getChannel("chat.user.5");
    off();
    expect(channel.stopListening).toHaveBeenCalledWith(".message.sent", handler);
  });

  it("is idempotent when unsubscribe is called twice", () => {
    const off1 = subscribeChannel("blockades", "presence", { ".BlockadeCreated": vi.fn() });
    subscribeChannel("blockades", "presence", { ".BlockadeCreated": vi.fn() });
    off1();
    off1();
    expect(leave).not.toHaveBeenCalled();
  });
});
