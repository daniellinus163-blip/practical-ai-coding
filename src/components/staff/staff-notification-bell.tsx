"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffNotificationList } from "@/components/staff/staff-notification-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffNotificationRow } from "@/crm/staff-notification-types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initialUnread: number;
  initialItems: StaffNotificationRow[];
};

const RECENT_LIMIT = 12;

export function StaffNotificationBell({ userId, initialUnread, initialItems }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<"connecting" | "connected" | "offline">("connecting");
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async () => {
    const client = createBrowserSupabaseClient();
    if (!client) return;
    setLoading(true);
    const { data, error } = await client
      .from("staff_notifications")
      .select(
        "id, recipient_user_id, notification_type, category, title, message, lead_id, inquiry_id, activity_id, automation_event_id, href, read_at, created_at",
      )
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RECENT_LIMIT);
    if (!error && data) {
      setItems(data as StaffNotificationRow[]);
      setUnread(data.filter((row) => !row.read_at).length);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setUnread(initialUnread);
    setItems(initialItems);
  }, [initialUnread, initialItems]);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    if (!client) {
      setLive("offline");
      return;
    }

    const channel = client
      .channel(`staff-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as StaffNotificationRow;
          setItems((prev) => [row, ...prev.filter((p) => p.id !== row.id)].slice(0, RECENT_LIMIT));
          if (!row.read_at) setUnread((count) => count + 1);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "staff_notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as StaffNotificationRow;
          setItems((prev) => prev.map((p) => (p.id === row.id ? row : p)));
          setUnread((prev) => {
            const wasUnread = !(payload.old as StaffNotificationRow | undefined)?.read_at;
            const isUnread = !row.read_at;
            if (wasUnread && !isUnread) return Math.max(0, prev - 1);
            if (!wasUnread && isUnread) return prev + 1;
            return prev;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLive("offline");
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [userId, router]);

  useEffect(() => {
    if (!open) return;
    void refreshList();
    function onDocClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, refreshList]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--bg)]",
          "hover:bg-[var(--bg-2)]",
        )}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4 text-[var(--ink)]" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--ink)]">Notifications</p>
            <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              {live === "connected" ? "Live" : live === "connecting" ? "Connecting…" : "Offline"}
            </span>
          </div>
          {loading ? (
            <NotificationDropdownSkeleton />
          ) : (
            <StaffNotificationList items={items} compact showMarkAll />
          )}
          <p className="mt-3 border-t border-[var(--line)] pt-2 text-center text-xs">
            <Link href="/staff/notifications" className="underline" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
            {" · "}
            <Link href="/staff/notifications/settings" className="underline" onClick={() => setOpen(false)}>
              Settings
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function NotificationDropdownSkeleton() {
  return (
    <div className="space-y-3 px-1 py-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}
