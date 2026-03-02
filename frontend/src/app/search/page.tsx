"use client";

import Header from "@/components/Header";
import React from "react";

// Search is not yet implemented in the backend.
const Search = () => {
  return (
    <div className="p-8">
      <Header name="Search" />
      <p className="text-gray-500">Search is coming soon.</p>
    </div>
  );
};

export default Search;
