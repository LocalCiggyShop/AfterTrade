import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData } from "./types";
import { createSeed } from "./lib/seed";
import { loadData, saveData } from "./lib/storage";

interface JournalContext {
  data: AppData;
  update: (fn: (data: AppData) => AppData) => void;
  account: string;
  setAccount: (id: string) => void;
  notify: (message: string) => void;
  saveError: string;
  saving: boolean;
}
const Context = createContext<JournalContext | null>(null);
export const useJournal = () => {
  const value = useContext(Context);
  if (!value) throw new Error("Journal provider missing");
  return value;
};
export function JournalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null),
    [account, setAccount] = useState("all"),
    [toast, setToast] = useState(""),
    [saveError, setSaveError] = useState(""),
    [saving, setSaving] = useState(false);
  const writeQueue = useRef(Promise.resolve()),
    failedLoad = useRef(false);
  useEffect(() => {
    let active = true;
    loadData()
      .then((saved) => {
        if (active) setData(saved ?? createSeed());
      })
      .catch(() => {
        if (active) {
          failedLoad.current = true;
          setSaveError(
            "Browser storage is unavailable. Changes will not persist. Export a backup before leaving.",
          );
          setData(createSeed());
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!data || failedLoad.current) return;
    setSaving(true);
    const timer = setTimeout(() => {
      writeQueue.current = writeQueue.current
        .catch(() => {})
        .then(() => saveData(data))
        .then(() => {
          setSaveError("");
          setSaving(false);
        })
        .catch(() => {
          setSaveError(
            "Your latest changes could not be saved. Export a backup before closing this tab.",
          );
          setSaving(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [data]);
  useEffect(() => {
    if (!saving) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    addEventListener("beforeunload", handler);
    return () => removeEventListener("beforeunload", handler);
  }, [saving]);
  useEffect(() => {
    if (data) {
      document.documentElement.dataset.theme = data.settings.theme;
      document.documentElement.style.colorScheme =
        data.settings.theme === "light" ? "light" : "dark";
    }
  }, [data?.settings.theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  if (!data)
    return (
      <div className="app-loading">
        <div className="loading-mark">A</div>
        <span>Opening your journal…</span>
      </div>
    );
  return (
    <Context.Provider
      value={{
        data,
        update: (fn) => {
          setSaving(true);
          setData((d) => fn(d!));
        },
        account,
        setAccount,
        notify: setToast,
        saveError,
        saving,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="status-dot" />
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
