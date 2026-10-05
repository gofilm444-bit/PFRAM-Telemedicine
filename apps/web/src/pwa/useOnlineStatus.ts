import { useEffect, useState } from "react";

let _isOnlineState = typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
  ? navigator.onLine
  : true;

const _listeners = new Set<(online: boolean) => void>();

export function _setOnlineForTesting(online: boolean) {
  _isOnlineState = online;
  for (const listener of _listeners) {
    listener(online);
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => _isOnlineState);

  useEffect(() => {
    const handleOnline = () => {
      _isOnlineState = true;
      setIsOnline(true);
    };
    const handleOffline = () => {
      _isOnlineState = false;
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const listener = (val: boolean) => setIsOnline(val);
    _listeners.add(listener);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      _listeners.delete(listener);
    };
  }, []);

  return isOnline;
}
