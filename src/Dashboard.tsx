// src/Dashboard.tsx
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

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
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"home" | "referrals" | "account" | "boost">("home");

  const goal = 2500;
  const reward = "Ksh 1000";

  // ---------------- Android bridge ----------------
  useEffect(() => {
    try {
      const Android = (window as any).Android;
      if (Android?.getDeviceId && Android?.getPhone) {
        setDeviceId(Android.getDeviceId());
        setPhone(Android.getPhone());
      } else {
        throw new Error();
      }
    } catch {
      setDeviceId("test_device_123");
      setPhone("+254700000000");
    }
  }, []);

  // ---------------- Fetch referral code (FIXED) ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/referral-code/${deviceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code) setReferralCode(data.code);
      })
      .catch(console.log);
  }, [deviceId]);

  // ---------------- Fetch leaderboard ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then((res) => res.json())
      .then((data) => {
        const d = data.leaderboard.find((x: any) => x.device_id === deviceId);
        if (d) setPoints(d.points);
      })
      .catch(console.log);
  }, [deviceId]);

  // ---------------- Fetch referrals ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/referrals/${deviceId}`)
      .then((res) => res.json())
      .then((data) => {
        setReferralCount(data.referral_count || 0);
        setReferrals(data.referrals || []);
      })
      .catch(console.log);
  }, [deviceId]);

  // ---------------- SOCKET FIX ----------------
  useEffect(() => {
    if (!deviceId) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("✅ Connected");
    });

    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) {
        setPoints(data.total_points);
      }
    });

    // ✅ IMPORTANT FIX: return VOID cleanup
    return () => {
      socket.disconnect();
    };
  }, [deviceId]);

  // ---------------- BOOST FEATURE ----------------
  const boostAction = async (type: string, cost: number) => {
    if (!deviceId) return;
    if (points < cost) {
      alert("❌ Not enough points");
      return;
    }

    try {
      const res = await fetch(`${SOCKET_URL}/api/boost`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          device_id: deviceId,
          action: type,
          cost
        })
      });

      const data = await res.json();

      if (data.success) {
        setPoints(data.new_points);
        alert(`🚀 Boost activated: ${type}`);
      } else {
        alert("❌ Failed");
      }
    } catch {
      alert("❌ Server error");
    }
  };

  // ---------------- Withdraw ----------------
  const handleWithdraw = async () => {
    if (!deviceId || !phone) return;

    if (points < goal) {
      alert(`Need ${goal} points`);
      return;
    }

    const res = await fetch(`${SOCKET_URL}/api/withdraw`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ device_id: deviceId, phone, points: goal })
    });

    const data = await res.json();

    if (data.success) {
      setPoints(data.new_points);
      alert("✅ Withdrawal sent");
    } else {
      alert("❌ Failed");
    }
  };

  const remaining = Math.max(goal - points, 0);
  const progress = Math.min((points / goal) * 100, 100);

  const referralLink = `${APP_LINK}?ref=${referralCode}`;

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🔥 Dashboard</h1>

      {/* MENU */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("home")}>🏠</button>
        <button onClick={() => setActiveTab("referrals")}>👥</button>
        <button onClick={() => setActiveTab("boost")}>🚀</button>
        <button onClick={() => setActiveTab("account")}>👤</button>
      </div>

      {/* HOME */}
      {activeTab === "home" && (
        <div className="bg-gray-800 p-4 rounded w-full max-w-sm">
          <p>Points: {points}</p>
          <p>Remaining: {remaining}</p>

          <div className="bg-gray-700 h-3 rounded mt-2">
            <div className="bg-cyan-400 h-3" style={{ width: `${progress}%` }} />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={points < goal}
            className="mt-3 bg-cyan-400 text-black px-4 py-2 rounded w-full"
          >
            Withdraw {reward}
          </button>
        </div>
      )}

      {/* REFERRALS */}
     {activeTab === "referrals" && (
  <div className="bg-gray-800 p-4 rounded w-full max-w-sm">
    <p className="font-semibold">Your Code:</p>
    <input value={referralCode} readOnly className="bg-gray-700 w-full p-1 rounded" />

    <p className="mt-3">Total Referrals: {referralCount}</p>

    {/* ✅ FIX: USE referrals */}
    <div className="mt-2 max-h-40 overflow-y-auto">
      {referrals.length > 0 ? (
        referrals.map((r, i) => (
          <div key={i} className="text-sm border-b border-gray-600 py-1">
            {r}
          </div>
        ))
      ) : (
        <p className="text-gray-400 text-sm">No referrals yet</p>
      )}
    </div>

    <button
      onClick={() => navigator.clipboard.writeText(referralLink)}
      className="mt-3 bg-gray-600 px-3 py-1 rounded w-full"
    >
      Copy Link
    </button>
  </div>
)}

      {/* BOOST */}
      {activeTab === "boost" && (
        <div className="bg-gray-800 p-4 rounded w-full max-w-sm space-y-3">
          <h2 className="text-lg">🚀 Boost Engagement</h2>

          <button onClick={() => boostAction("like", 50)} className="bg-blue-500 w-full py-2 rounded">
            👍 Buy Likes (50 pts)
          </button>

          <button onClick={() => boostAction("retweet", 100)} className="bg-green-500 w-full py-2 rounded">
            🔁 Buy Retweets (100 pts)
          </button>

          <button onClick={() => boostAction("follow", 150)} className="bg-purple-500 w-full py-2 rounded">
            👤 Buy Followers (150 pts)
          </button>
        </div>
      )}

      {/* ACCOUNT */}
      {activeTab === "account" && (
        <div className="bg-gray-800 p-4 rounded w-full max-w-sm space-y-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-gray-700 w-full p-1" />

          <button className="bg-cyan-400 text-black px-4 py-2 rounded w-full">
            Save
          </button>

          <p>Device: {deviceId}</p>
        </div>
      )}
    </div>
  );
}
