import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { resolveApiBaseUrl, resolveRealtimeSettings } from "../config/runtime";

window.Pusher = Pusher;
// Verbose Pusher logging only in development (or when explicitly enabled).
try {
  Pusher.logToConsole =
    import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === "true";
} catch {
  // ignore
}

const API_BASE_URL = resolveApiBaseUrl();
const {
  host: resolvedReverbHost,
  scheme: reverbScheme,
  port: reverbPort,
} = resolveRealtimeSettings();
const useTls = reverbScheme === "https";
const transportModes = useTls ? ["wss"] : ["ws"];
const appKey = import.meta.env.VITE_REVERB_APP_KEY || "ydxpycz90avrcgumitzo";

// Debug: surface computed API and reverb defaults for troubleshooting
try {
  // eslint-disable-next-line no-console
  console.info("[echo debug] API_BASE_URL ->", API_BASE_URL);
  // eslint-disable-next-line no-console
  console.info(
    "[echo debug] realtime host ->",
    resolvedReverbHost,
    "scheme ->",
    reverbScheme,
    "port ->",
    reverbPort,
    "key ->",
    appKey
  );
} catch (e) {}
const buildAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? `Bearer ${token}` : "";
};

const applyAuthHeader = (echoInstance, headerValue) => {
  if (!echoInstance) return;

  if (echoInstance.options?.auth?.headers) {
    if (headerValue) {
      echoInstance.options.auth.headers.Authorization = headerValue;
    } else {
      delete echoInstance.options.auth.headers.Authorization;
    }
  }

  if (echoInstance.connector?.pusher?.config?.auth?.headers) {
    if (headerValue) {
      echoInstance.connector.pusher.config.auth.headers.Authorization =
        headerValue;
    } else {
      delete echoInstance.connector.pusher.config.auth.headers.Authorization;
    }
  }

  if (echoInstance.connector?.options?.auth?.headers) {
    if (headerValue) {
      echoInstance.connector.options.auth.headers.Authorization = headerValue;
    } else {
      delete echoInstance.connector.options.auth.headers.Authorization;
    }
  }
};

const echo = new Echo({
  broadcaster: "pusher",
  key: appKey,
  cluster: "mt1",
  wsHost: resolvedReverbHost,
  wsPort: reverbPort,
  wssPort: reverbPort,
  forceTLS: useTls,
  encrypted: useTls,
  disableStats: true,
  enabledTransports: ["ws", "wss"],
  authEndpoint: `${API_BASE_URL}/api/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: buildAuthHeader(),
      Accept: "application/json",
    },
  },
  // Force auth for presence/private channels in case Echo defaults are skipped
  authorizer: (channel, options) => {
    return {
      authorize: (socketId, callback) => {
        // Debug: announce when attempting to auth
        // eslint-disable-next-line no-console
        console.info("[echo debug] authorizer start", {
          channel: channel.name,
          socketId,
          api: API_BASE_URL,
        });

        fetch(`${API_BASE_URL}/api/broadcasting/auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: buildAuthHeader(),
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              const text = await response.text();
              // eslint-disable-next-line no-console
              console.error(
                "[echo debug] Broadcast auth failed",
                response.status,
                text
              );
              return callback(true, {
                message: `Auth failed ${response.status}`,
              });
            }
            const data = await response.json();
            // eslint-disable-next-line no-console
            console.info("[echo debug] Broadcast auth success", data);
            callback(false, data);
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error("[echo debug] Broadcast auth request error", error);
            callback(true, error);
          });
      },
    };
  },
});

// Ensure the runtime instance always reflects the latest token
applyAuthHeader(echo, echo.options?.auth?.headers?.Authorization);

// Debug: bind to underlying Pusher/Reverb connection events (state, connected, error)
try {
  const pusher = echo.connector?.pusher;
  if (pusher && pusher.connection) {
    // eslint-disable-next-line no-console
    console.info("[echo debug] binding pusher connection events");
    pusher.connection.bind("state_change", (states) => {
      // eslint-disable-next-line no-console
      console.info(
        "[echo debug] pusher state_change",
        states.previous,
        "->",
        states.current
      );
    });
    pusher.connection.bind("connected", () => {
      // eslint-disable-next-line no-console
      console.info(
        "[echo debug] pusher connected, socket_id ->",
        pusher.connection.socket_id
      );
    });
    pusher.connection.bind("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("[echo debug] pusher connection error", err);
    });
  } else {
    // eslint-disable-next-line no-console
    console.debug("[echo debug] pusher connector not available at init");
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("[echo debug] error binding pusher events", e);
}

// Reconnect when token changes
export const reconnectEcho = () => {
  const headerValue = buildAuthHeader();
  applyAuthHeader(echo, headerValue);
};

export const getEchoInstance = () => echo;

// ─── Shared, ref-counted channel subscriptions ───────────────────────────────
// Several components listen on the same channel (e.g. presence "incidents",
// private "chat.user.{id}"). Calling echo.leave(name) or
// channel.stopListening(event) without a callback from one consumer tears
// down every other consumer's listeners. subscribeChannel() keeps one
// subscription per channel, removes only the caller's handlers, and leaves
// the channel when the last subscriber unsubscribes.
const sharedChannels = new Map();

const openChannel = (name, type) => {
  if (type === "presence") return echo.join(name);
  if (type === "private") return echo.private(name);
  return echo.channel(name);
};

/**
 * @param {string} name   channel name without the private-/presence- prefix
 * @param {"public"|"private"|"presence"} type
 * @param {Record<string, Function>} listeners  { ".EventName": handler }
 * @param {{ onSubscribed?: Function, onError?: Function }} [options]
 * @returns {() => void} unsubscribe
 */
export const subscribeChannel = (name, type, listeners = {}, options = {}) => {
  const key = `${type}:${name}`;
  let entry = sharedChannels.get(key);

  if (!entry) {
    const channel = openChannel(name, type);
    entry = {
      channel,
      refs: 0,
      subscribed: false,
      failed: null,
      subscribedCbs: new Set(),
      errorCbs: new Set(),
    };
    const current = entry;
    try {
      channel.subscribed?.(() => {
        current.subscribed = true;
        current.failed = null;
        current.subscribedCbs.forEach((cb) => cb());
      });
      channel.error?.((error) => {
        current.failed = error || true;
        current.errorCbs.forEach((cb) => cb(error));
      });
    } catch {
      // older connectors may not support these hooks
    }
    sharedChannels.set(key, entry);
  }

  entry.refs += 1;

  const { onSubscribed, onError } = options;
  if (onSubscribed) {
    entry.subscribedCbs.add(onSubscribed);
    if (entry.subscribed) onSubscribed();
  }
  if (onError) {
    entry.errorCbs.add(onError);
    if (entry.failed) onError(entry.failed);
  }

  Object.entries(listeners).forEach(([event, handler]) => {
    entry.channel.listen(event, handler);
  });

  let released = false;
  const current = entry;
  return () => {
    if (released) return;
    released = true;

    Object.entries(listeners).forEach(([event, handler]) => {
      try {
        current.channel.stopListening(event, handler);
      } catch {
        // ignore
      }
    });
    if (onSubscribed) current.subscribedCbs.delete(onSubscribed);
    if (onError) current.errorCbs.delete(onError);

    current.refs -= 1;
    if (current.refs <= 0 && sharedChannels.get(key) === current) {
      sharedChannels.delete(key);
      try {
        echo.leave(name);
      } catch {
        // ignore
      }
    }
  };
};

/** Drop every shared subscription (used on logout). */
export const leaveAllSharedChannels = () => {
  sharedChannels.forEach((_entry, key) => {
    const name = key.slice(key.indexOf(":") + 1);
    try {
      echo.leave(name);
    } catch {
      // ignore
    }
  });
  sharedChannels.clear();
};

export default echo;

// Extra debug helper for manual inspection in console
export const debugEcho = () => {
  try {
    // eslint-disable-next-line no-console
    console.info("[echo debug] echo.options ->", echo.options || {});
    // eslint-disable-next-line no-console
    console.info("[echo debug] echo.connector ->", echo.connector || {});
    // eslint-disable-next-line no-console
    console.info(
      "[echo debug] pusher connection socket_id ->",
      echo.connector?.pusher?.connection?.socket_id
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[echo debug] debugEcho error", e);
  }
};

// Expose helpers for Ops/QA via DevTools without extra imports (dev only)
if (typeof window !== "undefined" && (import.meta.env.DEV || import.meta.env.VITE_REALTIME_DEBUG === "true")) {
  window.$echo = echo;
  window.debugEcho = debugEcho;
}
