// src/Dashboard.tsx
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface PointsData {
  device_id: string;
  total_points: number;
}

const SOCKET_URL = "http://178.18.242.203:5000"; // your Flask server

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);

  const goal = 5000; // points required for reward
  const reward = "$25";

  // ---------------- Android bridge or fallback ----------------
  useEffect(() => {
    try {
      const id = (window as any).Android.getDeviceId();
      const ph = (window as any).Android.getPhone();
      setDeviceId(id);
      setPhone(ph);
    } catch {
      console.log("No Android bridge, using fallback");
      setDeviceId("c7409d51c36e8998"); // test device ID
      setPhone("+254700000000");
    }
  }, []);

  // ---------------- Fetch initial points ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then((res) => res.json())
      .then((data) => {
        const deviceData = data.leaderboard.find((d: any) => d.device_id === deviceId);
        if (deviceData) setPoints(deviceData.points);
      })
      .catch((err) => console.log("Error fetching leaderboard:", err));
  }, [deviceId]);

  // ---------------- Socket.IO for live points ----------------
  useEffect(() => {
    if (!deviceId) return;

    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => console.log("Connected to Socket.IO"));

    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) setPoints(data.total_points);
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceId]);

  const remaining = Math.max(goal - points, 0);
  const progress = Math.min((points / goal) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-start py-12 px-4">
      <h1 className="text-4xl font-extrabold text-cyan-400 mb-8 drop-shadow-[0_0_10px_#00fff0]">
        📱 My Dashboard
      </h1>

      {/* Reward Card */}
      <div className="bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col space-y-4 border-2 border-cyan-500">
        <h2 className="text-xl text-gray-300 font-semibold">Get Money</h2>
        <p className="text-gray-400 text-sm">Great job!</p>
        <p className="text-gray-200 text-sm">
          Only <span className="font-bold text-cyan-300">{remaining.toLocaleString()}</span> left to get
        </p>

        {/* Neon progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mt-2">
          <div
            className="h-4 bg-cyan-400 transition-all duration-500"
            style={{ width: `${progress}%`, boxShadow: "0 0 10px #00fff0, 0 0 20px #00fff0" }}
          ></div>
        </div>

        <div className="bg-cyan-500 rounded-2xl p-4 flex justify-between items-center text-black font-bold shadow-md mt-2">
          <span className="text-lg">{reward}</span>
          <span>Visa</span>
        </div>

        <button className="bg-transparent border border-cyan-400 text-cyan-400 rounded-xl py-2 font-semibold hover:bg-cyan-400 hover:text-black transition-colors mt-2">
          Add withdrawal method
        </button>
      </div>

      {/* Points & Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 w-full max-w-3xl">
        <div className="bg-gray-800 rounded-3xl p-6 shadow-lg border border-cyan-500 text-center hover:scale-105 transition-transform">
          <h3 className="text-gray-300 mb-2">Points</h3>
          <p className="text-3xl font-extrabold text-cyan-400 drop-shadow-[0_0_10px_#00fff0]">{points}</p>
        </div>

        <div className="bg-gray-800 rounded-3xl p-6 shadow-lg border border-pink-500 text-center hover:scale-105 transition-transform">
          <h3 className="text-gray-300 mb-2">Phone</h3>
          <p className="text-pink-400 font-mono">{phone}</p>
        </div>

        <div className="bg-gray-800 rounded-3xl p-6 shadow-lg border border-green-500 text-center hover:scale-105 transition-transform">
          <h3 className="text-gray-300 mb-2">Device ID</h3>
          <p className="text-green-400 font-mono break-all">{deviceId}</p>
        </div>
      </div>
    </div>
  );
}