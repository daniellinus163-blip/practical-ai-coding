"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  markAllStaffNotificationsReadAction,
  markStaffNotificationReadAction,
} from "@/app/staff/notifications/actions";
import {
  notificationHref,
  type StaffNotificationRow,
} from "@/crm/staff-notification-types";
import { formatNotificationWhen, notificationCategoryLabel } from "@/components/staff/staff-notification-format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  items: StaffNotificationRow[];
  compact?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  showMarkAll?: boolean;
};

export function StaffNotificationList({
  items,
  compact = false,
  emptyTitle = "No notifications",
  emptyBody = "You are caught up. New alerts will appear here in real time.",
  showMarkAll = true,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasUnread = items.some((item) => !item.read_at);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--line)] px-4 py-8 text-center">
        <p className="font-medium text-[var(--ink)]">{emptyTitle}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showMarkAll && hasUnread ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await markAllStaffNotificationsReadAction();
                router.refresh();
              });
            }}
          >
            Mark all as read
          </Button>
        </div>
      ) : null}
      <ul className={cn("divide-y divide-[var(--line)]", compact ? "max-h-[22rem] overflow-y-auto" : "")}>
        {items.map((item) => {
          const href = notificationHref(item);
          const unread = !item.read_at;
          return (
            <li key={item.id} className={cn("py-3", unread ? "bg-[var(--bg-2)]/60" : "")}>
              <div className="flex flex-col gap-1 px-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
                    {notificationCategoryLabel(item)}
                  </span>
                  {unread ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden />
                  ) : null}
                  <span className="ml-auto text-xs text-[var(--muted)]">{formatNotificationWhen(item.created_at)}</span>
                </div>
                <Link href={href} className="font-medium text-[var(--ink)] underline-offset-2 hover:underline">
                  {item.title}
                </Link>
                <p className={cn("text-sm text-[var(--muted)]", compact ? "line-clamp-2" : "")}>{item.message}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  <Link href={href} className="underline">
                    Open
                  </Link>
                  {unread ? (
                    <button
                      type="button"
                      className="underline disabled:opacity-50"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setBusyId(item.id);
                        startTransition(async () => {
                          const fd = new FormData();
                          fd.set("id", item.id);
                          await markStaffNotificationReadAction({ error: null, success: null }, fd);
                          setBusyId(null);
                          router.refresh();
                        });
                      }}
                    >
                      Mark as read
                    </button>
                  ) : (
                    <span className="text-[var(--muted)]">Read</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
