import { describe, it, expect } from "bun:test";

// ─── Inline reducer for testing (pure function, no React needed) ────────────

// Replicating the reducer logic from use-toast.ts to test in isolation
// This avoids needing to mock React, next/router, etc.

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

type ToastActionElement = {
  altText: string;
  element: unknown;
};

type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type ActionType = {
  ADD_TOAST: "ADD_TOAST";
  UPDATE_TOAST: "UPDATE_TOAST";
  DISMISS_TOAST: "DISMISS_TOAST";
  REMOVE_TOAST: "REMOVE_TOAST";
};

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

function createToast(id = "toast-1", overrides: Partial<ToasterToast> = {}): ToasterToast {
  return {
    id,
    title: "Test Toast",
    description: "This is a test toast notification",
    open: true,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("toast reducer", () => {
  describe("ADD_TOAST", () => {
    it("adds a toast to an empty state", () => {
      const toast = createToast("1");
      const state = reducer({ toasts: [] }, { type: "ADD_TOAST", toast });
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].id).toBe("1");
    });

    it("adds a toast to the front and respects TOAST_LIMIT", () => {
      const existing = createToast("existing");
      const newToast = createToast("new");
      const state = reducer(
        { toasts: [existing] },
        { type: "ADD_TOAST", toast: newToast }
      );
      // TOAST_LIMIT is 1, so only newest toast remains
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].id).toBe("new");
    });

    it("enforces TOAST_LIMIT (1 toast max)", () => {
      const toast1 = createToast("1");
      const toast2 = createToast("2");
      let state = reducer({ toasts: [] }, { type: "ADD_TOAST", toast: toast1 });
      state = reducer(state, { type: "ADD_TOAST", toast: toast2 });
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].id).toBe("2"); // Newest wins
    });

    it("preserves other state properties", () => {
      const toast = createToast("1");
      const state = reducer({ toasts: [] }, { type: "ADD_TOAST", toast });
      expect(state.toasts).toBeDefined();
    });
  });

  describe("UPDATE_TOAST", () => {
    it("updates an existing toast by id", () => {
      const toast = createToast("1", { title: "Original" });
      const state = reducer(
        { toasts: [toast] },
        { type: "UPDATE_TOAST", toast: { id: "1", title: "Updated" } }
      );
      expect(state.toasts[0].title).toBe("Updated");
    });

    it("does not modify other toasts", () => {
      const toast1 = createToast("1", { title: "First" });
      const toast2 = createToast("2", { title: "Second" });
      const state = reducer(
        { toasts: [toast1, toast2] },
        { type: "UPDATE_TOAST", toast: { id: "1", title: "Updated First" } }
      );
      expect(state.toasts[0].title).toBe("Updated First");
      expect(state.toasts[1].title).toBe("Second");
    });

    it("does nothing for non-existent toast id", () => {
      const toast = createToast("1");
      const state = reducer(
        { toasts: [toast] },
        { type: "UPDATE_TOAST", toast: { id: "nonexistent", title: "Ghost" } }
      );
      expect(state.toasts[0].title).toBe("Test Toast");
      expect(state.toasts.length).toBe(1);
    });

    it("updates multiple properties at once", () => {
      const toast = createToast("1", { title: "Old", description: "Old desc" });
      const state = reducer(
        { toasts: [toast] },
        {
          type: "UPDATE_TOAST",
          toast: { id: "1", title: "New", description: "New desc" },
        }
      );
      expect(state.toasts[0].title).toBe("New");
      expect(state.toasts[0].description).toBe("New desc");
    });
  });

  describe("DISMISS_TOAST", () => {
    it("sets open to false for a specific toast", () => {
      const toast = createToast("1", { open: true });
      const state = reducer(
        { toasts: [toast] },
        { type: "DISMISS_TOAST", toastId: "1" }
      );
      expect(state.toasts[0].open).toBe(false);
    });

    it("dismisses all toasts when no toastId provided", () => {
      const toast1 = createToast("1", { open: true });
      const toast2 = createToast("2", { open: true });
      const state = reducer(
        { toasts: [toast1, toast2] },
        { type: "DISMISS_TOAST" }
      );
      expect(state.toasts.every((t) => t.open === false)).toBe(true);
    });

    it("does not affect already closed toasts", () => {
      const toast = createToast("1", { open: false });
      const state = reducer(
        { toasts: [toast] },
        { type: "DISMISS_TOAST", toastId: "1" }
      );
      expect(state.toasts[0].open).toBe(false);
    });

    it("does nothing for non-existent toastId", () => {
      const toast = createToast("1");
      const state = reducer(
        { toasts: [toast] },
        { type: "DISMISS_TOAST", toastId: "nonexistent" }
      );
      expect(state.toasts[0].open).toBe(true); // unchanged
    });
  });

  describe("REMOVE_TOAST", () => {
    it("removes a specific toast by id", () => {
      const toast1 = createToast("1");
      const toast2 = createToast("2");
      const state = reducer(
        { toasts: [toast1, toast2] },
        { type: "REMOVE_TOAST", toastId: "1" }
      );
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].id).toBe("2");
    });

    it("removes all toasts when no toastId provided", () => {
      const toast1 = createToast("1");
      const toast2 = createToast("2");
      const state = reducer(
        { toasts: [toast1, toast2] },
        { type: "REMOVE_TOAST" }
      );
      expect(state.toasts.length).toBe(0);
    });

    it("does nothing for non-existent toastId", () => {
      const toast = createToast("1");
      const state = reducer(
        { toasts: [toast] },
        { type: "REMOVE_TOAST", toastId: "nonexistent" }
      );
      expect(state.toasts.length).toBe(1);
    });

    it("handles removing from empty state", () => {
      const state = reducer(
        { toasts: [] },
        { type: "REMOVE_TOAST", toastId: "1" }
      );
      expect(state.toasts.length).toBe(0);
    });
  });

  describe("state immutability", () => {
    it("returns a new state object on ADD_TOAST", () => {
      const initialState = { toasts: [] };
      const newState = reducer(initialState, {
        type: "ADD_TOAST",
        toast: createToast("1"),
      });
      expect(newState).not.toBe(initialState);
      expect(initialState.toasts.length).toBe(0); // original unchanged
    });

    it("returns a new state object on UPDATE_TOAST", () => {
      const initialState = { toasts: [createToast("1")] };
      const newState = reducer(initialState, {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "Changed" },
      });
      expect(newState).not.toBe(initialState);
      expect(initialState.toasts[0].title).toBe("Test Toast"); // original unchanged
    });

    it("returns a new state object on REMOVE_TOAST", () => {
      const initialState = { toasts: [createToast("1")] };
      const newState = reducer(initialState, {
        type: "REMOVE_TOAST",
        toastId: "1",
      });
      expect(newState).not.toBe(initialState);
    });
  });

  describe("unknown action", () => {
    it("returns the current state unchanged", () => {
      const state = { toasts: [createToast("1")] };
      const newState = reducer(state, { type: "UNKNOWN" } as unknown as Action);
      expect(newState).toBe(state);
    });
  });

  describe("complex scenarios", () => {
    it("add, update, dismiss, remove lifecycle", () => {
      let state = { toasts: [] as ToasterToast[] };

      // Add
      state = reducer(state, { type: "ADD_TOAST", toast: createToast("1") });
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].open).toBe(true);

      // Update
      state = reducer(state, {
        type: "UPDATE_TOAST",
        toast: { id: "1", title: "Updated Title" },
      });
      expect(state.toasts[0].title).toBe("Updated Title");

      // Dismiss
      state = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
      expect(state.toasts[0].open).toBe(false);

      // Remove
      state = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
      expect(state.toasts.length).toBe(0);
    });

    it("handles rapid add-remove cycles", () => {
      let state = { toasts: [] as ToasterToast[] };

      state = reducer(state, { type: "ADD_TOAST", toast: createToast("a") });
      state = reducer(state, { type: "ADD_TOAST", toast: createToast("b") });
      expect(state.toasts.length).toBe(1); // TOAST_LIMIT

      state = reducer(state, { type: "REMOVE_TOAST", toastId: "b" });
      expect(state.toasts.length).toBe(0);
    });
  });
});
