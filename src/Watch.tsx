import { useEffect } from "react";

const SOCKET_URL = "http://178.18.242.203:5000";

export default function Watch() {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const deviceId = localStorage.getItem("deviceId");

      if (!deviceId) return;

      fetch(`${SOCKET_URL}/api/end_watch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          duration,
        }),
      });
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black">
      <iframe
        src="https://dorawatch.one/home/"
        className="w-full h-full"
      />
    </div>
  );
}
