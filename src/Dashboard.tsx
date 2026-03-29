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
  const [activeTab, setActiveTab] = useState<"home" | "referrals" | "account">("home");

  const goal = 2500;
  const reward = "Ksh 1000";

  // ---------------- Android bridge ----------------
 useEffect(() => {
    const getAndroidData = async () => {
      try {
        const Android = (window as any).Android;
        if (Android && Android.getDeviceId && Android.getPhone) {
          setDeviceId(Android.getDeviceId() || null);
          setPhone(Android.getPhone() || "");
        } else {
          throw new Error("Android bridge not available");
        }
      } catch (e) {
        // fallback for browser testing
        setDeviceId("test_device_123");
        setPhone("+254700000000");
      }
    };
    getAndroidData();
  }, []);

  // ---------------- Fetch referral code (FIXED) ----------------

 useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/devices`)
      .then((res) => res.json())
      .then((devices) => {
        const d = devices.find((x: any) => x.device_id === deviceId);
        if (d?.referral_code) setReferralCode(d.referral_code);
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

    const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io(SOCKET_URL);

    socket.on("connect", () => console.log("Connected to Socket.IO"));
    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) setPoints(data.total_points);
    });

    // Cleanup function
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

 // ---------------- Share ----------------
  const referralLink = `${APP_LINK}?ref=${referralCode}`;
  const shareText = `🔥 Earn money with this app!\nUse my referral code: ${referralCode}\nDownload here: ${referralLink}`;
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert("✅ Link copied!");
  };



  
  // ---------------- Withdraw ----------------
  const handleWithdraw = async () => {
    if (!deviceId || !phone) return;
    if (points < goal) {
      alert(`You need at least ${goal} points to withdraw.`);
      return;
    }

    try {
      const res = await fetch(`${SOCKET_URL}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, phone, points: goal }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Withdrawal request sent!");
        if (data.new_points !== undefined) setPoints(data.new_points);
      } else {
        alert(`❌ ${data.message || "Withdrawal failed"}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server error");
    }
  };

  const remaining = Math.max(goal - points, 0);
  const progress = Math.min((points / goal) * 100, 100);

  // ---------------- Save Account Info ----------------
  const saveAccountInfo = async () => {
    if (!deviceId) return alert("Device not ready");
    if (!phone) return alert("Phone cannot be empty");

    try {
      const res = await fetch(`${SOCKET_URL}/link-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, phone }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        alert("✅ Phone saved and linked!");
      } else {
        alert("❌ Error: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server error");
    }
  };


  
  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🔥 Dashboard</h1>

      {/* MENU */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("home")}>🏠</button>
        <button onClick={() => setActiveTab("referrals")}>👥</button>
       
        <button onClick={() => setActiveTab("account")}>👤</button>
      </div>

    
      {/* Home */}
      {activeTab === "home" && (
        <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm space-y-4">
          <h2 className="text-xl text-gray-300 font-semibold">Get Money</h2>
          <p className="text-gray-400 text-sm">Only <span className="font-bold text-cyan-300">{remaining.toLocaleString()}</span> points left</p>

          <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
            <div className="h-4 bg-cyan-400 transition-all duration-500" style={{ width: `${progress}%`, boxShadow: "0 0 10px #00fff0, 0 0 20px #00fff0" }} />
          </div>

          <div className="bg-cyan-500 rounded-2xl p-4 flex justify-between items-center text-black font-bold shadow-md mt-2">
            <span>{reward}</span>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={points < goal}
            className={`w-full py-2 rounded-xl font-semibold mt-2 transition-colors ${points >= goal ? "bg-cyan-400 text-black hover:bg-cyan-300" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}
          >
            Withdraw
          </button>
        </div>
         <div className="bg-gray-800 p-4 rounded w-full max-w-sm space-y-3">
          <h2 className="text-lg">🚀 Boost Engagement</h2>

          <button onClick={() => boostAction("like", 500)} className="bg-blue-500 w-full py-2 rounded">
            👍 Buy Likes (500 pts)
          </button>

          <button onClick={() => boostAction("retweet", 1000)} className="bg-green-500 w-full py-2 rounded">
            🔁 Buy Retweets (1000 pts)
          </button>

          <button onClick={() => boostAction("follow", 2500)} className="bg-purple-500 w-full py-2 rounded">
            👤 Buy Followers (2500 pts)
          </button>
        </div>

      
      )}

      {/* REFERRALS */}
   {activeTab === "referrals" && (
        <div className="space-y-6 w-full max-w-md">
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2>Your Code</h2>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded w-full"
            />
            <div className="flex gap-2 mt-3">
             <button onClick={copyLink} className="bg-blue-600 px-3 py-1 rounded">Copy</button>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl">
            <h2>Total Referrals: {referralCount}</h2>
            <div className="max-h-40 overflow-y-auto mt-2">
              {referrals.map((r, i) => (
                <div key={i} className="border-b py-1 text-sm text-gray-300">{r}</div>
              ))}
              {referrals.length === 0 && <p className="text-gray-400">No referrals yet</p>}
            </div>
          </div>
        </div>
)}

    
      {/* ACCOUNT */}
     {activeTab === "account" && (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-sm space-y-4">
          <div>
            <label className="text-gray-300 font-semibold">Phone:</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-1 rounded mt-1 bg-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-gray-300 font-semibold">Referral Code:</label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full px-3 py-1 rounded mt-1 bg-gray-700 text-white"
            />
          </div>
          <button
            onClick={saveAccountInfo}
            className="w-full bg-cyan-400 py-2 rounded-xl text-black font-bold hover:bg-cyan-300"
          >
            Save
          </button>

          <p><b>Device ID:</b> {deviceId}</p>
          <p><b>Points:</b> {points}</p>
          <p><b>Referral Count:</b> {referralCount}</p>
        </div>
      )}
    </div>
  );
}
