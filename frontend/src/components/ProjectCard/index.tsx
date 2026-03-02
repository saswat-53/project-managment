import { Project } from "@/state/api";
import React from "react";

type Props = {
  project: Project;
};

const ProjectCard = ({ project }: Props) => {
  return (
    <div className="rounded border p-4 shadow">
      <h3 className="font-semibold">{project.name}</h3>
      <p className="text-sm text-gray-600">{project.description}</p>
      <p className="mt-1 text-xs text-gray-400">Status: {project.status}</p>
    </div>
  );
};

export default ProjectCard;
