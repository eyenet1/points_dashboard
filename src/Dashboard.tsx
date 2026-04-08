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
  const [referralCode, setReferralCode] = useState<string>(""); // The user's OWN code
  const [inviterCode, setInviterCode] = useState<string>(""); // The code from a REF LINK
  const [points, setPoints] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"home" | "referrals" | "watch" | "account">("home");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);

  const goal = 2500;
  const reward = "Ksh 1000";

  // ---------------- CAPTURE REFERRAL LINK CODE ----------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referral_link_code", ref);
      setInviterCode(ref);
    } else {
      const savedRef = localStorage.getItem("referral_link_code");
      if (savedRef) setInviterCode(savedRef);
    }
  }, []);

  // ---------------- ANDROID BRIDGE ----------------
  useEffect(() => {
    const initDevice = async () => {
      try {
        const Android = (window as any).Android;
        if (Android?.getDeviceId && Android?.getPhone) {
          const dId = Android.getDeviceId() || null;
          const p = Android.getPhone() || "";
          
          setDeviceId(dId);
          setPhone(p);
          
          if (p && p.trim() !== "") {
            setIsOnboarded(true);
          }
        } else throw new Error("Android bridge not available");
      } catch {
        setDeviceId("test_device_123");
        setPhone(""); 
      } finally {
        setIsLoading(false);
      }
    };
    initDevice();
  }, []);

  // ---------------- FETCH USER INFO ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/user/${deviceId}`)
      .then(res => res.json())
      .then(data => {
        // This is the user's personal referral code for sharing
        if (data?.referral_code) {
          setReferralCode(data.referral_code);
        }
      })
      .catch(console.error);
  }, [deviceId]);

  // ---------------- FETCH LEADERBOARD ----------------
  useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then(res => res.json())
      .then(data => {
        const user = data.leaderboard.find((x: any) => x.device_id === deviceId);
        if (user) setPoints(user.points);
      })
      .catch(console.error);
  }, [deviceId]);

  // ---------------- FETCH REFERRALS ----------------
  useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/referrals/${deviceId}`)
      .then(res => res.json())
      .then(data => {
        setReferralCount(data.referral_count || 0);
        setReferrals(data.referrals || []);
      })
      .catch(console.error);
  }, [deviceId]);

  // ---------------- SOCKET.IO ----------------
  useEffect(() => {
    if (!deviceId) return;
    const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io(SOCKET_URL);
    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) setPoints(data.total_points);
    });
    return () => { socket.disconnect(); };
  }, [deviceId]);

  const boostAction = async (type: string, cost: number) => {
    if (!deviceId) return;
    if (points < cost) return alert("❌ Not enough points");
    try {
      const res = await fetch(`${SOCKET_URL}/api/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, action: type, cost }),
      });
      const data = await res.json();
      if (data.success) {
        setPoints(data.new_points);
        alert(`🚀 Boost activated: ${type}`);
      }
    } catch { alert("❌ Server error"); }
  };

  const copyLink = () => {
    const referralLink = `${APP_LINK}?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    alert("✅ Link copied!");
  };

  const handleWithdraw = async () => {
    if (!deviceId || !phone) return;
    if (points < goal) return alert(`You need at least ${goal} points to withdraw.`);
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
      }
    } catch { alert("❌ Server error"); }
  };

  // ---------------- ONBOARDING SAVE ----------------
  const saveAccountInfo = async () => {
    if (!deviceId) return alert("Device not ready");
    if (!phone || phone.trim() === "") return alert("Phone cannot be empty");

    try {
      const res = await fetch(`${SOCKET_URL}/link-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Use inviterCode here so we tell the server who invited the new user
        body: JSON.stringify({ device_id: deviceId, phone, referral_code: inviterCode }),
      });
      const data = await res.json();
      
      if (data.status === "ok") {
        alert("✅ Phone saved!");
        try { (window as any).Android?.savePhone(phone); } catch {}
        setIsOnboarded(true);
      } else {
        alert("❌ Error: " + (data.message || "Unknown error"));
      }
    } catch { alert("❌ Server error"); }
  };

  const remaining = Math.max(goal - points, 0);
  const progress = Math.min((points / goal) * 100, 100);

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-400 font-bold">Loading...</div>;

  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome! 🎉</h1>
            <p className="text-gray-400 text-sm">Link your phone to start earning.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-gray-300 font-semibold text-sm">Phone Number:</label>
              <input
                type="tel"
                placeholder="+254..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl mt-1 bg-gray-700 text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-gray-300 font-semibold text-sm">Referral Code (Optional):</label>
              <input
                type="text"
                placeholder="Enter code if any"
                value={inviterCode} // Show the code from the link, NOT the user's own code
                onChange={(e) => setInviterCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl mt-1 bg-gray-700 text-white outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          <button onClick={saveAccountInfo} className="w-full bg-cyan-400 py-3 rounded-xl text-black font-bold text-lg hover:bg-cyan-300 transition">
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🔥 Dashboard</h1>

      {/* MENU */}
      <div className="flex gap-3 mb-6 bg-gray-800 p-3 rounded-2xl shadow-md">
        {[
          { tab: "home", icon: "🏠", label: "Home" },
          { tab: "referrals", icon: "👥", label: "Referrals" },
          { tab: "watch", icon: "🎬", label: "Watch" },
          { tab: "account", icon: "👤", label: "Account" },
        ].map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all duration-200 ${
              activeTab === tab ? "bg-cyan-500 text-black shadow-md scale-105" : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-semibold mt-1">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "home" && (
        <div className="space-y-4 w-full max-w-sm">
          <div className="bg-gray-800 p-6 rounded-xl space-y-4">
            <h2 className="text-xl text-gray-300 font-semibold">Get Money</h2>
            <p className="text-gray-400 text-sm">Total Points <span className="font-bold text-cyan-300">{points}</span></p>
            <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
              <div className="h-4 bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <button onClick={handleWithdraw} disabled={points < goal} className={`w-full py-2 rounded-xl font-semibold mt-2 ${points >= goal ? "bg-cyan-400 text-black" : "bg-gray-600 text-gray-400"}`}>
              Withdraw {reward}
            </button>
          </div>
        </div>
      )}

      {activeTab === "referrals" && (
        <div className="space-y-6 w-full max-w-md">
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="text-gray-300 mb-2">Your Sharing Code</h2>
            <div className="flex gap-2">
                <input readOnly type="text" value={referralCode} className="bg-gray-700 text-white px-3 py-2 rounded flex-1" />
                <button onClick={copyLink} className="bg-blue-600 px-4 py-2 rounded">Copy</button>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2>Total Referrals: {referralCount}</h2>
            <div className="max-h-40 overflow-y-auto mt-2">
              {referrals.length > 0 ? referrals.map((r, i) => (
                <div key={i} className="border-b border-gray-700 py-2 text-sm text-gray-300">{r}</div>
              )) : <p className="text-gray-400">No referrals yet</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="bg-gray-800 p-4 rounded-xl w-full max-w-sm space-y-4 text-center">
            <p className="text-lg"><b>Phone:</b> {phone}</p>
            <p className="text-sm text-gray-400"><b>Device ID:</b> {deviceId}</p>
            <p className="text-sm text-gray-400"><b>Your Code:</b> {referralCode}</p>
        </div>
      )}
    </div>
  );
}
