import type { AppData, Trade } from "../types.ts";

export function needsWelcome(data: AppData): boolean {
  if (typeof data.onboardingCompleted === "boolean")
    return !data.onboardingCompleted;
  // Show the new guide to existing demo visitors, without interrupting real journals.
  return data.demo && !data.trades.some((trade) => !trade.demo);
}

export function startPersonalJournal(data: AppData): AppData {
  if (!data.demo) return { ...data, onboardingCompleted: true };
  const demoIds = new Set(
    data.trades.filter((trade) => trade.demo).map((trade) => trade.id),
  );
  return {
    ...data,
    onboardingCompleted: true,
    demo: false,
    trades: data.trades.filter((trade) => !trade.demo),
    notes: data.notes
      .filter(
        (note) =>
          !note.demo &&
          !(note.demo === undefined && ["note-1", "note-2"].includes(note.id)),
      )
      .map((note) => ({
        ...note,
        tradeIds: note.tradeIds.filter((id) => !demoIds.has(id)),
      })),
    reviews: [],
    groups: data.groups.map((group) => ({
      ...group,
      tradeIds: group.tradeIds.filter((id) => !demoIds.has(id)),
    })),
    accounts: data.accounts.map((account) =>
      account.demo ||
      (account.id === "account-1" &&
        account.type === "Demo" &&
        account.balance === 25000)
        ? {
            ...account,
            demo: false,
            balance: 0,
            target: 0,
            maxDrawdown: 0,
            dailyDrawdown: 0,
            payouts: [],
          }
        : account,
    ),
    settings: {
      ...data.settings,
      name: data.settings.name === "Alex" ? "" : data.settings.name,
    },
  };
}

export function importIntoJournal(data: AppData, incoming: Trade[]) {
  const journal = startPersonalJournal(data);
  const existing = new Set(journal.trades.map((trade) => trade.id));
  const fresh = incoming
    .filter((trade) => {
      if (existing.has(trade.id)) return false;
      existing.add(trade.id);
      return true;
    })
    .map((trade) => ({ ...trade, demo: false }));
  return {
    data: { ...journal, trades: [...fresh, ...journal.trades] },
    imported: fresh.length,
    duplicates: incoming.length - fresh.length,
  };
}
