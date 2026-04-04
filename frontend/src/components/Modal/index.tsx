import React from "react";
import ReactDOM from "react-dom";
import Header from "../Header";
import { X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  name: string;
  size?: "sm" | "md" | "lg";
  maxHeight?: string;
};

const SIZE_CLASSES = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

const Modal = ({ children, isOpen, onClose, name, size = "md", maxHeight = "90vh" }: Props) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-gray-600 bg-opacity-50 p-4">
      <div
        className={`flex w-full ${SIZE_CLASSES[size]} flex-col rounded-lg bg-white shadow-lg dark:bg-dark-secondary`}
        style={{ maxHeight }}
      >
        <div className="flex-shrink-0 p-4 pb-0">
          <Header
            name={name}
            buttonComponent={
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-zinc-950 hover:bg-amber-300"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            }
            isSmallText
          />
        </div>
        <div className="overflow-y-auto p-4 pt-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
