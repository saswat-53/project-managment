import { User } from "@/state/api";
import Image from "next/image";
import React from "react";

type Props = {
  user: User;
};

const UserCard = ({ user }: Props) => {
  return (
    <div className="flex items-center rounded border p-4 shadow">
      {user.avatarUrl && (
        <Image
          src={user.avatarUrl}
          alt={user.name}
          width={32}
          height={32}
          className="rounded-full"
          unoptimized
        />
      )}
      <div className="ml-3">
        <h3 className="font-semibold">{user.name}</h3>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
    </div>
  );
};

export default UserCard;
