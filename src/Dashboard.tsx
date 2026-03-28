// src/Dashboard.tsx
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";

interface PointsData {
  device_id: string;
  total_points: number;
}

const SOCKET_URL = "http://178.18.242.203:5000";
const APP_LINK = "https://yourapp.com/download";

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>("");
  const [points, setPoints] = useState<number>(0);

  const [boostUrl, setBoostUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"home" | "referrals" | "account">("home");

  // ---------------- Android bridge ----------------
  useEffect(() => {
    try {
      const Android = (window as any).Android;
      if (Android?.getDeviceId && Android?.getPhone) {
        setDeviceId(Android.getDeviceId());
        setPhone(Android.getPhone());
      } else {
        setDeviceId("test_device_123");
        setPhone("+254700000000");
      }
    } catch {
      setDeviceId("test_device_123");
      setPhone("+254700000000");
    }
  }, []);

  // ---------------- Fetch points ----------------
  useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then(res => res.json())
      .then(data => {
        const d = data.leaderboard.find((x: any) => x.device_id === deviceId);
        if (d) setPoints(d.points);
      });
  }, [deviceId]);

  // ---------------- Socket ----------------
  useEffect(() => {
    if (!deviceId) return;

    const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io(SOCKET_URL);

    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) setPoints(data.total_points);
    });

    return () => socket.disconnect();
  }, [deviceId]);

  // ---------------- BOOST FUNCTION ----------------
  const handleBoost = async (type: string, amount: number, cost: number) => {
    if (!deviceId) return;
    if (!boostUrl) return alert("Enter URL first");
    if (points < cost) return alert("Not enough points");

    try {
      const res = await fetch(`${SOCKET_URL}/api/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          url: boostUrl,
          type,
          amount
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ ${amount} ${type} sent!`);
        setPoints(data.new_points);
      } else {
        alert("❌ Failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-900 p-4 flex flex-col items-center text-white">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">🚀 Boost Dashboard</h1>

      {/* MENU */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab("home")}>🏠</button>
        <button onClick={() => setActiveTab("referrals")}>👥</button>
        <button onClick={() => setActiveTab("account")}>👤</button>
      </div>

      {/* HOME */}
      {activeTab === "home" && (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-md space-y-4">

          <h2 className="text-lg">Points: {points}</h2>

          {/* URL INPUT */}
          <input
            type="text"
            placeholder="Paste X (Twitter) URL"
            value={boostUrl}
            onChange={(e) => setBoostUrl(e.target.value)}
            className="w-full p-2 rounded bg-gray-700"
          />

          {/* BOOST BUTTONS */}
          <div className="space-y-2">

            <button
              onClick={() => handleBoost("likes", 50, 20)}
              className="w-full bg-pink-500 p-2 rounded"
            >
              ❤️ 50 Likes (20 pts)
            </button>

            <button
              onClick={() => handleBoost("retweets", 20, 25)}
              className="w-full bg-green-500 p-2 rounded"
            >
              🔁 20 Retweets (25 pts)
            </button>

            <button
              onClick={() => handleBoost("followers", 10, 30)}
              className="w-full bg-blue-500 p-2 rounded"
            >
              👤 10 Followers (30 pts)
            </button>

          </div>
        </div>
      )}

      {/* ACCOUNT */}
      {activeTab === "account" && (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-md space-y-3">
          <p><b>Device:</b> {deviceId}</p>
          <p><b>Phone:</b> {phone}</p>
          <p><b>Points:</b> {points}</p>
        </div>
      )}

      {/* REFERRALS (kept simple) */}
      {activeTab === "referrals" && (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-md">
          <p>Referral system unchanged</p>
        </div>
      )}
    </div>
  );
}
