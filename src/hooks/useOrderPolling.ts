import { useEffect, useRef, useState } from "react";
import { api } from "../lib/apiClient";
import type { Order } from "../lib/types";

const POLL_MS = 2000;
const TIMEOUT_MS = 60_000;

const TERMINAL_PAYMENT = new Set(["paid", "failed", "refunded", "cancelled"]);
const TERMINAL_ORDER = new Set([
  "paid",
  "failed",
  "refunded",
  "cancelled",
  "checkout_failed",
  "cancelled",
]);

export type OrderPollState = "idle" | "processing" | "confirmed" | "failed" | "timeout";

function isTerminal(order: Order): boolean {
  const payment = order.payment_status || order.status;
  const orderStatus = order.order_status || order.status;
  return TERMINAL_PAYMENT.has(payment) || TERMINAL_ORDER.has(orderStatus);
}

function isPaid(order: Order): boolean {
  return order.payment_status === "paid" || order.status === "paid";
}

export function useOrderPolling(sessionId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [state, setState] = useState<OrderPollState>("idle");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setState("idle");
      return;
    }

    setState("processing");
    setError("");
    setOrder(null);

    let stopped = false;
    const started = Date.now();

    const poll = async () => {
      if (stopped || !mounted.current) return;

      try {
        const o = await api.getOrderBySession(sessionId);
        if (stopped || !mounted.current) return;

        setOrder(o);

        if (isPaid(o)) {
          setState("confirmed");
          stopped = true;
          return;
        }

        if (isTerminal(o)) {
          setState("failed");
          stopped = true;
          return;
        }

        if (Date.now() - started >= TIMEOUT_MS) {
          setState("timeout");
          stopped = true;
          return;
        }

        window.setTimeout(poll, POLL_MS);
      } catch (e) {
        if (stopped || !mounted.current) return;
        setError(e instanceof Error ? e.message : "Could not load order");
        if (Date.now() - started >= TIMEOUT_MS) {
          setState("timeout");
          stopped = true;
        } else {
          window.setTimeout(poll, POLL_MS);
        }
      }
    };

    poll();

    return () => {
      stopped = true;
    };
  }, [sessionId]);

  const retry = () => {
    if (!sessionId) return;
    setState("processing");
    setError("");
    const started = Date.now();
    let stopped = false;

    const poll = async () => {
      if (stopped || !mounted.current) return;
      try {
        const o = await api.getOrderBySession(sessionId);
        if (stopped || !mounted.current) return;
        setOrder(o);
        if (isPaid(o)) {
          setState("confirmed");
          return;
        }
        if (isTerminal(o)) {
          setState("failed");
          return;
        }
        if (Date.now() - started >= TIMEOUT_MS) {
          setState("timeout");
          return;
        }
        window.setTimeout(poll, POLL_MS);
      } catch (e) {
        if (stopped || !mounted.current) return;
        setError(e instanceof Error ? e.message : "Could not load order");
        window.setTimeout(poll, POLL_MS);
      }
    };

    poll();
    return () => {
      stopped = true;
    };
  };

  return { order, error, state, retry };
}
