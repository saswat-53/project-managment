"use client";

import Header from "@/components/Header";
import React from "react";

type Props = {
  priority: string;
};

// Priority filtering is not yet implemented in the backend.
const ReusablePriorityPage = ({ priority }: Props) => {
  return (
    <div className="m-5 p-4">
      <Header name={`Priority: ${priority}`} />
      <p className="text-gray-500">
        Priority-based task filtering is coming soon.
      </p>
    </div>
  );
};

export default ReusablePriorityPage;
