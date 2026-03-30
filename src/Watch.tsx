import { useEffect } from "react";

const SOCKET_URL = "http://178.18.242.203:5000";

export default function Watch() {
  useEffect(() => {
    const deviceId = localStorage.getItem("deviceId");
    if (!deviceId) return;

    // ✅ Save start time
    localStorage.setItem("watch_start", Date.now().toString());

    // ✅ Open Dorawatch
    window.location.href = "https://dorawatch.one/home/";
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <p>🎬 Opening movie... Please wait</p>
    </div>
  );
}
