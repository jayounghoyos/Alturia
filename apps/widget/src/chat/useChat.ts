import type { BotConfig, BotFeature, ChatResponse } from "@alturia/shared";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { isSessionConflict, type ApiClient } from "../api/client";
import {
  readStorage,
  storageKey,
  writeStorage,
  type SessionStore,
} from "../embed/storage";
import { chatReducer, initialChatState, type NewMsg } from "../engine/reducer";
import type { Option } from "../engine/types";
import {
  backToMenu,
  handleQrPayload,
  mainMenuOptions,
  runAction,
  startFeature,
  submitText,
  type ChatContext,
} from "../features";
import { useAdvisorReplies } from "../hooks/useAdvisorReplies";
import { es } from "../i18n/es";

/**
 * Conversation state plus the ChatContext the feature modules act through.
 * The view (ChatWidget) only renders state and forwards clicks and text.
 */
export function useChat({
  api,
  config,
  session,
  botKey,
  open,
}: {
  api: ApiClient;
  config: BotConfig;
  session: SessionStore;
  botKey: string | undefined;
  open: boolean;
}) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  // State drives the advisor polling; the ref gives async flows the latest id.
  const [currentSession, setCurrentSession] = useState(() => session.get());
  const sessionId = useRef(currentSession);
  const handoffKey = storageKey("handoff", botKey);
  // Persisted so a reload while a human has the case keeps listening.
  const [awaitingAdvisor, setAwaitingAdvisor] = useState(
    () => readStorage(handoffKey) === "1",
  );

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const setAdvisor = useCallback(
    (waiting: boolean) => {
      setAwaitingAdvisor(waiting);
      writeStorage(handoffKey, waiting ? "1" : null);
    },
    [handoffKey],
  );

  const ctx = useMemo<ChatContext>(() => {
    const push = (...messages: NewMsg[]) =>
      dispatch({ type: "push", messages });
    const say = (...texts: string[]) =>
      push(
        ...texts.map((text) => ({
          kind: "text" as const,
          from: "bot" as const,
          text,
        })),
      );

    const showMenu = () => {
      dispatch({ type: "step", step: { kind: "idle" } });
      say(es.menu.prompt);
      push({
        kind: "options",
        options: mainMenuOptions(configRef.current.features, es),
      });
    };

    const handleResponse = (res: ChatResponse) => {
      if (res.awaitingHuman) {
        setAdvisor(true);
        return;
      }
      say(res.reply);
      // A normal bot answer means no advisor holds the case any more.
      setAdvisor(res.escalationOffered);
    };

    const context: ChatContext = {
      api,
      get config() {
        return configRef.current;
      },
      t: es,
      has: (feature: BotFeature) =>
        configRef.current.features.includes(feature),
      sessionId: () => sessionId.current,
      say,
      echo: (text) => push({ kind: "text", from: "user", text }),
      push,
      setStep: (step) => dispatch({ type: "step", step }),
      busy: async (task) => {
        dispatch({ type: "sending", sending: true });
        try {
          return await task();
        } finally {
          dispatch({ type: "sending", sending: false });
        }
      },
      showMenu,
      offerMore: (options: Option[] = []) => {
        say(es.menu.more);
        push({ kind: "options", options: [...options, backToMenu(es)] });
      },
      ask: async (text) => {
        context.echo(text);
        await context.busy(async () => {
          try {
            handleResponse(await api.sendChatMessage(sessionId.current, text));
          } catch (error) {
            if (!isSessionConflict(error)) {
              say(es.chat.error);
              return;
            }
            // The stored id belongs to another bot: start a fresh session.
            sessionId.current = session.reset();
            setCurrentSession(sessionId.current);
            try {
              handleResponse(
                await api.sendChatMessage(sessionId.current, text),
              );
            } catch {
              say(es.chat.error);
            }
          }
        });
      },
      awaitAdvisor: () => setAdvisor(true),
    };
    return context;
  }, [api, session, setAdvisor]);

  // Greeting and menu once per mount (guarded for StrictMode's double effect).
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    ctx.say(config.greeting);
    ctx.showMenu();
  }, [ctx, config.greeting]);

  useAdvisorReplies({
    api,
    sessionId: currentSession,
    active: awaitingAdvisor,
    open,
    onReplies: useCallback(
      (replies) =>
        ctx.push(
          ...replies.map((m) => ({
            kind: "text" as const,
            from: "advisor" as const,
            text: m.content,
          })),
        ),
      [ctx],
    ),
  });

  return {
    state,
    choose(messageId: string, index: number, option: Option) {
      dispatch({ type: "choose", id: messageId, index });
      void runAction(ctx, option.action, state.step);
    },
    send(text: string) {
      const trimmed = text.trim();
      if (!trimmed || state.sending) return;
      void submitText(ctx, state.step, trimmed);
    },
    removeMessage(id: string) {
      dispatch({ type: "remove", id });
    },
    qrDecoded(messageId: string, payload: string) {
      dispatch({ type: "remove", id: messageId });
      void handleQrPayload(ctx, payload);
    },
    qrFallback(messageId: string) {
      dispatch({ type: "remove", id: messageId });
      void startFeature(ctx, "CERTIFICATES");
    },
    scheduleRetraining() {
      void runAction(ctx, { type: "booking.retraining" }, state.step);
    },
    canFallBackToId: config.features.includes("CERTIFICATES"),
  };
}
