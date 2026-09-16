import * as React from "react";
import { Dialog as HeadlessDialog, Transition } from "@headlessui/react";

export function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Transition appear show={open} as={React.Fragment}>
      <HeadlessDialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <HeadlessDialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          {/* Trick to center modal */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>

          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-xl p-6 my-8 overflow-hidden text-left align-middle bg-white rounded-lg shadow-xl transition-all">
              {title && (
                <HeadlessDialog.Title className="text-lg font-medium text-gray-900 mb-4">
                  {title}
                </HeadlessDialog.Title>
              )}
              {children}
            </div>
          </Transition.Child>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}
