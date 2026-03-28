// src/Dashboard.tsx
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface PointsData {
  device_id: string;
  total_points: number;
}

const SOCKET_URL = "http://178.18.242.203:5000";

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);

  // ✅ NEW: referral state
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referrals, setReferrals] = useState<string[]>([]);

  const goal = 2500;
  const reward = "Ksh 1000";

  // ---------------- Android bridge ----------------
  useEffect(() => {
    const getAndroidData = async () => {
      try {
        const Android = (window as any).Android;

        if (Android && Android.getDeviceId && Android.getPhone) {
          const id = Android.getDeviceId();
          const ph = Android.getPhone();

          console.log("Android detected:", id, ph);

          setDeviceId(id || null);
          setPhone(ph || null);
        } else {
          throw new Error("Android bridge not available");
        }
      } catch (e) {
        console.log("Fallback mode:", e);

        setDeviceId("test_device_123");
        setPhone("+254700000000");
      }
    };

    getAndroidData();
  }, []);

  // ---------------- Fetch initial points ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then((res) => res.json())
      .then((data) => {
        const deviceData = data.leaderboard.find(
          (d: any) => d.device_id === deviceId
        );
        if (deviceData) setPoints(deviceData.points);
      })
      .catch((err) => console.log("Error fetching leaderboard:", err));
  }, [deviceId]);

  // ---------------- ✅ Fetch referral data ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/referrals/${deviceId}`)
      .then((res) => res.json())
      .then((data) => {
        setReferralCount(data.referral_count || 0);
        setReferrals(data.referrals || []);
      })
      .catch((err) => console.log("Error fetching referrals:", err));
  }, [deviceId]);

  // ---------------- Socket.IO live updates ----------------
  useEffect(() => {
    if (!deviceId) return;

    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => console.log("Connected to Socket.IO"));

    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) {
        setPoints(data.total_points);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceId]);

  const remaining = Math.max(goal - points, 0);
  const progress = Math.min((points / goal) * 100, 100);

  // ---------------- Withdraw ----------------
  const handleWithdraw = async () => {
    if (!deviceId || !phone) return;

    if (points < goal) {
      alert("You need at least 2500 points to withdraw.");
      return;
    }

    try {
      const res = await fetch(`${SOCKET_URL}/api/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: deviceId,
          phone: phone,
          points: goal,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Withdrawal request sent!");

        if (data.new_points !== undefined) {
          setPoints(data.new_points);
        }
      } else {
        alert(`❌ ${data.message || "Withdrawal failed"}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server error");
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-extrabold text-cyan-400 mb-8">
        📱 My Dashboard
      </h1>

      {/* Reward Card */}
      <div className="bg-gray-800 rounded-3xl p-6 w-full max-w-sm space-y-4 border border-cyan-500">
        <h2 className="text-xl text-gray-300 font-semibold">Get Money</h2>

        <p className="text-gray-400 text-sm">
          Only{" "}
          <span className="font-bold text-cyan-300">
            {remaining.toLocaleString()}
          </span>{" "}
          points left
        </p>

        {/* Progress */}
        <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="h-4 bg-cyan-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-cyan-500 rounded-2xl p-4 flex justify-between text-black font-bold">
          <span>{reward}</span>
          <span>Visa</span>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={points < goal}
          className={`rounded-xl py-2 font-semibold ${
            points >= goal
              ? "bg-cyan-400 text-black"
              : "bg-gray-600 text-gray-400"
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10 w-full max-w-4xl">

        {/* Points */}
        <div className="bg-gray-800 rounded-3xl p-6 border border-cyan-500 text-center">
          <h3 className="text-gray-300">Points</h3>
          <p className="text-3xl text-cyan-400">{points}</p>
        </div>

        {/* Referrals */}
        <div className="bg-gray-800 rounded-3xl p-6 border border-yellow-500 text-center">
          <h3 className="text-gray-300">Referrals</h3>
          <p className="text-3xl text-yellow-400">{referralCount}</p>
        </div>

        {/* Phone */}
        <div className="bg-gray-800 rounded-3xl p-6 border border-pink-500 text-center">
          <h3 className="text-gray-300">Phone</h3>
          <p className="text-pink-400">{phone}</p>
        </div>

        {/* Device */}
        <div className="bg-gray-800 rounded-3xl p-6 border border-green-500 text-center">
          <h3 className="text-gray-300">Device ID</h3>
          <p className="text-green-400 break-all">{deviceId}</p>
        </div>
      </div>

      {/* Referral List */}
      <div className="mt-10 w-full max-w-3xl">
        <h2 className="text-xl text-white mb-4">Your Referrals</h2>

        <div className="bg-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto">
          {referrals.length === 0 ? (
            <p className="text-gray-400">No referrals yet</p>
          ) : (
            referrals.map((ref, i) => (
              <div
                key={i}
                className="text-sm text-gray-300 border-b border-gray-700 py-2"
              >
                {ref}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
