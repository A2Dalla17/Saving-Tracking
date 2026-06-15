"use client";

import { cn } from "@/lib/utils";
import type { Member } from "@/types";

const sizeClasses = {
  sm: "h-10 w-10 text-base rounded-xl",
  md: "h-16 w-16 text-2xl rounded-2xl",
  lg: "h-24 w-24 text-3xl rounded-2xl",
};

interface MemberAvatarProps {
  member: Pick<Member, "name" | "avatarUrl">;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function MemberAvatar({ member, size = "md", className }: MemberAvatarProps) {
  const sizeClass = sizeClasses[size];

  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatarUrl}
        alt={member.name}
        className={cn(sizeClass, "object-cover shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "brand-gradient flex items-center justify-center text-white font-bold shrink-0 bg-brand",
        className
      )}
    >
      {member.name.charAt(0)}
    </div>
  );
}
