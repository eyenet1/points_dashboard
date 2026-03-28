// src/Dashboard.tsx
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface PointsData {
  device_id: string;
  total_points: number;
}

const SOCKET_URL = "http://178.18.242.203:5000";
// 👉 change this to your real landing/app link
const APP_LINK = "https://yourapp.com/download";

export default function Dashboard() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [points, setPoints] = useState<number>(0);

  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [referrals, setReferrals] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<"home" | "referrals" | "account">("home");

  const goal = 2500;
 // const reward = "Ksh 1000";

  // ---------------- Android bridge ----------------
  useEffect(() => {
    try {
      const Android = (window as any).Android;

      if (Android && Android.getDeviceId && Android.getPhone) {
        setDeviceId(Android.getDeviceId());
        setPhone(Android.getPhone());
      } else {
        throw new Error("No Android bridge");
      }
    } catch {
      setDeviceId("test_device_123");
      setPhone("+254700000000");
    }
  }, []);

  // ---------------- Register fetch (get referral code) ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/devices`)
      .then(res => res.json())
      .then((devices) => {
        const d = devices.find((x: any) => x.device_id === deviceId);
        if (d?.referral_code) setReferralCode(d.referral_code);
      })
      .catch(console.log);
  }, [deviceId]);

  // ---------------- Leaderboard ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/leaderboard?top=100`)
      .then(res => res.json())
      .then(data => {
        const d = data.leaderboard.find((x: any) => x.device_id === deviceId);
        if (d) setPoints(d.points);
      });
  }, [deviceId]);

  // ---------------- Referrals ----------------
  useEffect(() => {
    if (!deviceId) return;

    fetch(`${SOCKET_URL}/api/referrals/${deviceId}`)
      .then(res => res.json())
      .then(data => {
        setReferralCount(data.referral_count || 0);
        setReferrals(data.referrals || []);
      });
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

    // ✅ Proper cleanup for TypeScript
    return () => {
      socket.disconnect();
    };
  }, [deviceId]);

  // ---------------- Share Logic ----------------
  const referralLink = `${APP_LINK}?ref=${referralCode}`;
  const shareText = `🔥 Earn money with this app!\n\nUse my referral code: ${referralCode}\n\nDownload here: ${referralLink}`;

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`);
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert("✅ Link copied!");
  };

  // ---------------- Withdraw ----------------
  const handleWithdraw = async () => {
    if (!deviceId || !phone) return;

    if (points < goal) {
      alert("Need 2500 points");
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
        alert("✅ Request sent");
        if (data.new_points !== undefined) setPoints(data.new_points);
      } else {
        alert(`❌ ${data.message || "Withdrawal failed"}`);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Server error");
    }
  };

  const progress = Math.min((points / goal) * 100, 100);

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">

      {/* MENU */}
      <div className="flex justify-around mb-6 bg-gray-800 p-3 rounded-xl">
        <button onClick={() => setActiveTab("home")}>🏠 Home</button>
        <button onClick={() => setActiveTab("referrals")}>👥 Referrals</button>
        <button onClick={() => setActiveTab("account")}>👤 Account</button>
      </div>

      {/* ---------------- HOME ---------------- */}
      {activeTab === "home" && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-xl">
            <h2>Earn Reward</h2>

            <div className="w-full bg-gray-700 h-4 rounded mt-3">
              <div
                className="bg-cyan-400 h-4"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2">{points} / {goal}</p>

            <button
              onClick={handleWithdraw}
              disabled={points < goal}
              className="bg-cyan-400 text-black px-4 py-2 mt-3 rounded"
            >
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* ---------------- REFERRALS ---------------- */}
      {activeTab === "referrals" && (
        <div className="space-y-6">
          <div className="bg-gray-800 p-4 rounded-xl">
            <h2>Your Code</h2>
            <p className="text-cyan-400 text-lg">{referralCode}</p>

            <div className="flex gap-2 mt-3">
              <button onClick={shareWhatsApp} className="bg-green-500 px-3 py-1 rounded">
                WhatsApp
              </button>

              <button onClick={shareTelegram} className="bg-blue-500 px-3 py-1 rounded">
                Telegram
              </button>

              <button onClick={copyLink} className="bg-gray-600 px-3 py-1 rounded">
                Copy
              </button>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-xl">
            <h2>Total Referrals: {referralCount}</h2>

            <div className="max-h-40 overflow-y-auto mt-2">
              {referrals.length === 0 ? (
                <p className="text-gray-400">No referrals yet</p>
              ) : (
                referrals.map((r, i) => (
                  <div key={i} className="border-b py-1 text-sm">
                    {r}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- ACCOUNT ---------------- */}
      {activeTab === "account" && (
        <div className="bg-gray-800 p-4 rounded-xl space-y-2">
          <p><b>Phone:</b> {phone}</p>
          <p><b>Device ID:</b> {deviceId}</p>
          <p><b>Points:</b> {points}</p>
        </div>
      )}

    </div>
  );
}
