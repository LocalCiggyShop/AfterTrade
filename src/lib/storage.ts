import type { AppData } from "../types";
let database: Promise<IDBDatabase> | null = null;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("reviwer-journal", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("journal");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = null;
      reject(request.error);
    };
  }));
}
export async function loadData(): Promise<AppData | null> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database
      .transaction("journal")
      .objectStore("journal")
      .get("data");
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
export async function saveData(data: AppData) {
  const database = await db();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("journal", "readwrite");
    transaction.objectStore("journal").put(data, "data");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
export function download(
  content: string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
