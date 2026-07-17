"use client";

import { toast } from "react-toastify";

export function notifySuccess(message) {
  toast.success(message);
}

export function notifyError(message) {
  toast.error(message || "Something went wrong.");
}

// A destructive-action confirmation rendered as a toast instead of the
// browser's native confirm() dialog.
export function confirmToast(message, onConfirm) {
  toast(
    ({ closeToast }) => (
      <div className="lumen-confirm-toast">
        <p style={{ margin: 0 }}>{message}</p>
        <div className="lumen-confirm-actions">
          <button
            className="lumen-confirm-yes"
            onClick={() => {
              onConfirm();
              closeToast();
            }}
          >
            Yes, delete
          </button>
          <button className="lumen-confirm-cancel" onClick={closeToast}>
            Cancel
          </button>
        </div>
      </div>
    ),
    { autoClose: false, closeOnClick: false }
  );
}
