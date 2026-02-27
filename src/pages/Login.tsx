import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  Github,
  Sun,
  Moon,
  ShieldAlert,
} from "lucide-react";
import { useAuthStore, authApi } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useAdminStore } from "../store/adminStore";
import LanguageSwitch from "../components/LanguageSwitch";

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setError, banReason, setBanned } = useAuthStore();
  const { login: adminLogin } = useAdminStore();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const logoSrc = isDarkMode ? "/images/Logo.png" : "/images/LightModeLogo.png";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setLocalError] = useState("");

  useEffect(() => {
    if (banReason) {

    }
  }, [banReason]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLocalError("");
    setBanned(""); 

    try {

      const isAdmin = await adminLogin(email, password);
      if (isAdmin) {
        navigate("/admin");
        return;
      }

      const data = await authApi.login(email, password, rememberMe);
      setUser(data.user);
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setLocalError(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
      <LanguageSwitch className="fixed top-4 left-4 z-50" />

      {}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:scale-105 transition-transform z-50"
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-700" />
        )}
      </button>

      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-8">
          <img
            src={logoSrc}
            alt="NeonGambit"
            className="w-36 h-36 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sign in to continue your chess journey
          </p>
        </div>

        {}
        {banReason && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold mb-1">
              <ShieldAlert className="w-5 h-5" />
              Account Banned
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm">
              Your account has been banned. Reason: {banReason}
            </p>
          </div>
        )}

        {error && !banReason && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <a
                href="#"
                className="text-sm text-teal-600 dark:text-teal-500 hover:underline font-medium"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-gray-600 dark:text-gray-400"
            >
              Remember me for 30 days
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-900/20 flex items-center justify-center space-x-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Github className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                G
              </span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-bold text-teal-600 dark:text-teal-500 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
