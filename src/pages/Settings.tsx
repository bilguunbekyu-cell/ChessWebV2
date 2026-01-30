import { useState } from "react";
import { User, Mail, Bell, Shield, Moon, Globe, Save } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useThemeStore } from "../store/themeStore";

export default function Settings() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [notifications, setNotifications] = useState(true);

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
