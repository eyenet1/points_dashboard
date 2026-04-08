import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";

interface PointsData {
  device_id: string;
  total_points: number;
}

const SOCKET_URL = "http://178.18.242.203:5000";
const APP_LINK = "https://github.com/eyenet1/affilliate/raw/main/latest.apk";

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>(""); 
  const [inviterCode, setInviterCode] = useState<string>(""); 
  const [points, setPoints] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"home" | "referrals" | "watch" | "account">("home");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);

  const goal = 2500;
  const reward = "Ksh 1000";

  // ---------------- AUTO-EXTRACT FROM URL ON INPUT ----------------
  const handleReferralChange = (val: string) => {
    try {
      // Check if the user pasted a full URL
      if (val.includes("?ref=") || val.includes("&ref=")) {
        const url = new URL(val.startsWith("http") ? val : `https://${val}`);
        const code = url.searchParams.get("ref");
        if (code) {
          setInviterCode(code);
          return;
        }
      }
    } catch (e) {
      // If it's not a valid URL, just treat it as a normal code
    }
    setInviterCode(val);
  };

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

  useEffect(() => {
    const initDevice = async () => {
      try {
        const Android = (window as any).Android;
        if (Android?.getDeviceId && Android?.getPhone) {
          const dId = Android.getDeviceId() || null;
          const p = Android.getPhone() || "";
          setDeviceId(dId);
          setPhone(p);
          if (p && p.trim() !== "") setIsOnboarded(true);
        } else throw new Error("Bridge missing");
      } catch {
        setDeviceId("test_device_123");
        setPhone(""); 
      } finally {
        setIsLoading(false);
      }
    };
    initDevice();
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/user/${deviceId}`)
      .then(res => res.json())
      .then(data => { if (data?.referral_code) setReferralCode(data.referral_code); })
      .catch(console.error);
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then(res => res.json())
      .then(data => {
        const user = data.leaderboard?.find((x: any) => x.device_id === deviceId);
        if (user) setPoints(user.points);
      }).catch(console.error);
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`${SOCKET_URL}/api/referrals/${deviceId}`)
      .then(res => res.json())
      .then(data => {
        setReferralCount(data.referral_count || 0);
        setReferrals(data.referrals || []);
      }).catch(console.error);
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    const socket: Socket<DefaultEventsMap, DefaultEventsMap> = io(SOCKET_URL);
    socket.on("points_update", (data: PointsData) => {
      if (data.device_id === deviceId) setPoints(data.total_points);
    });
    return () => { socket.disconnect(); };
  }, [deviceId]);

  const boostAction = async (type: string, cost: number) => {
    if (!deviceId || points < cost) return alert("❌ Not enough points");
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
    navigator.clipboard.writeText(`${APP_LINK}?ref=${referralCode}`);
    alert("✅ Link copied!");
  };

  const handleWithdraw = async () => {
    if (!deviceId || !phone || points < goal) return;
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

  const saveAccountInfo = async () => {
    if (!deviceId || !phone.trim()) return alert("Enter your phone");
    try {
      const res = await fetch(`${SOCKET_URL}/link-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId, phone, referral_code: inviterCode }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        try { (window as any).Android?.savePhone(phone); } catch {}
        setIsOnboarded(true);
      } else {
        alert("❌ " + (data.message || "Error"));
      }
    } catch { alert("❌ Server error"); }
  };

  const remaining = Math.max(goal - points, 0);
  const progress = Math.min((points / goal) * 100, 100);

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-400 font-bold">Loading...</div>;

  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
        <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-xl space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome! 🎉</h1>
            <p className="text-gray-400 text-sm">Link your phone to start.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-gray-300 font-semibold text-sm">Phone Number:</label>
              <input type="tel" placeholder="+254..." value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl mt-1 bg-gray-700 outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="text-gray-300 font-semibold text-sm">Referral (Code or URL):</label>
              <input type="text" placeholder="Paste link or code" value={inviterCode} 
                onChange={(e) => handleReferralChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl mt-1 bg-gray-700 outline-none focus:ring-2 focus:ring-cyan-500" />
              <p className="text-[10px] text-gray-500 mt-1">If you paste a URL, we'll extract the code automatically.</p>
            </div>
          </div>
          <button onClick={saveAccountInfo} className="w-full bg-cyan-400 py-3 rounded-xl text-black font-bold text-lg hover:bg-cyan-300 transition shadow-lg">
            Start Earning
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
        {[{ tab: "home", icon: "🏠", label: "Home" }, { tab: "referrals", icon: "👥", label: "Referrals" }, { tab: "account", icon: "👤", label: "Account" }].map(({ tab, icon, label }) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${activeTab === tab ? "bg-cyan-500 text-black scale-105" : "text-gray-400 hover:bg-gray-700"}`}>
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-semibold mt-1">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === "home" && (
        <div className="space-y-4 w-full max-w-sm">
          <div className="bg-gray-800 p-6 rounded-xl space-y-4">
            <h2 className="text-xl text-gray-300 font-semibold">Earnings</h2>
            <p className="text-gray-400 text-sm">Points: <span className="font-bold text-cyan-300">{points}</span></p>
            <p className="text-gray-400 text-sm">Remaining: <span className="font-bold text-cyan-300">{remaining.toLocaleString()}</span></p>
            <div className="w-full bg-gray-700 h-4 rounded-full overflow-hidden">
              <div className="h-4 bg-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <button onClick={handleWithdraw} disabled={points < goal} className={`w-full py-2 rounded-xl font-semibold mt-2 transition-colors ${points >= goal ? "bg-cyan-400 text-black hover:bg-cyan-300" : "bg-gray-600 text-gray-400"}`}>
              Withdraw {reward}
            </button>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl space-y-3">
            <h2 className="text-lg font-semibold text-center">🚀 Boosts</h2>
            <button onClick={() => boostAction("like", 500)} className="bg-blue-500 w-full py-2 rounded hover:bg-blue-400">👍 Buy Likes (500 pts)</button>
            <button onClick={() => boostAction("follow", 1000)} className="bg-purple-500 w-full py-2 rounded hover:bg-purple-400">👤 Buy Followers (1000 pts)</button>
          </div>
        </div>
      )}

      {activeTab === "referrals" && (
        <div className="space-y-6 w-full max-w-md">
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="text-gray-300 mb-2 font-semibold text-center">Share & Earn</h2>
            <div className="flex gap-2">
                <input readOnly type="text" value={referralCode} className="bg-gray-700 px-3 py-2 rounded flex-1 text-sm" />
                <button onClick={copyLink} className="bg-blue-600 px-4 py-2 rounded">Copy Link</button>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2 className="font-semibold text-center">Total Referrals: {referralCount}</h2>
            <div className="max-h-40 overflow-y-auto mt-2">
              {referrals.length > 0 ? referrals.map((r, i) => (
                <div key={i} className="border-b border-gray-700 py-2 text-sm text-gray-300">{r}</div>
              )) : <p className="text-gray-400 text-center">No referrals yet</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm space-y-4 text-center">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-3xl mx-auto mb-2">👤</div>
            <p className="text-xl font-bold text-cyan-400">{phone || "No Phone"}</p>
            <div className="text-left bg-gray-900 p-4 rounded-lg text-xs space-y-2">
                <p className="text-gray-400"><b>Device ID:</b> <span className="text-gray-300 break-all">{deviceId}</span></p>
                <p className="text-gray-400"><b>My Code:</b> <span className="text-gray-300">{referralCode}</span></p>
            </div>
        </div>
      )}
    </div>
  );
}
