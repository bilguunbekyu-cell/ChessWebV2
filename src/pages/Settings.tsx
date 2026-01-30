import { useState } from "react";
import {
  User,
  Mail,
  Bell,
  Shield,
  Moon,
  Globe,
  Save,
  Sparkles,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useThemeStore } from "../store/themeStore";
import { useSettingsStore } from "../store/settingsStore";

export default function Settings() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const {
    groqApiKey,
    setGroqApiKey,
    enableAiExplanations,
    setEnableAiExplanations,
  } = useSettingsStore();
  const [notifications, setNotifications] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(groqApiKey);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Section */}
          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <User className="w-5 h-5 mr-2 text-teal-500" />
              Profile Information
            </h2>

            <div className="flex items-start space-x-6 mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg text-3xl font-bold text-white">
                GM
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      defaultValue="GrandMaster"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="gm@chessflow.com"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    defaultValue="Chess enthusiast and full-stack developer. Love the Sicilian Defense."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500 transition-colors h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-blue-500" />
              Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Moon className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium">Dark Mode</div>
                    <div className="text-sm text-gray-500">
                      Toggle dark theme appearance
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isDarkMode ? "bg-teal-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isDarkMode ? "translate-x-6" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium">Notifications</div>
                    <div className="text-sm text-gray-500">
                      Receive email updates about tournaments
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${notifications ? "bg-teal-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${notifications ? "translate-x-6" : "translate-x-0"}`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* AI Analysis Section */}
          <section className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
              AI Move Explanations
            </h2>

            <div className="space-y-4">
              {/* Enable AI Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium">Enable AI Explanations</div>
                    <div className="text-sm text-gray-500">
                      Get detailed move explanations powered by Llama 3
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEnableAiExplanations(!enableAiExplanations)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${enableAiExplanations ? "bg-purple-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${enableAiExplanations ? "translate-x-6" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* API Key Input */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Groq API Key
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1"
                  >
                    Get free API key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    onBlur={() => setGroqApiKey(tempApiKey)}
                    placeholder="gsk_..."
                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Free tier includes ~14,400 requests/day. Your key is stored
                  locally.
                </p>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-teal-900/20">
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
