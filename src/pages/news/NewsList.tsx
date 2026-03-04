import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Newspaper,
  Tag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface NewsArticle {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  excerpt: string;
  tags: string[];
  authorName: string;
  publishedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function NewsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [tagFilter, setTagFilter] = useState(
    () => searchParams.get("tag") || "",
  );

  const fetchArticles = useCallback(
    async (page: number) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: "12" });
        if (tagFilter) params.set("tag", tagFilter);
        if (search) params.set("search", search);
        const uiParams = new URLSearchParams();
        if (tagFilter) uiParams.set("tag", tagFilter);
        if (search) uiParams.set("search", search);
        setSearchParams(uiParams, { replace: true });
        const res = await fetch(`${API_URL}/api/news?${params}`);
        if (!res.ok) throw new Error("Failed to fetch news");
        const data = await res.json();
        setArticles(data.articles || []);
        setPagination(
          data.pagination || { page: 1, limit: 12, total: 0, pages: 1 },
        );
        setError(null);
      } catch {
        setError("Failed to load news articles.");
      } finally {
        setLoading(false);
      }
    },
    [tagFilter, search, setSearchParams],
  );

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    const nextTag = searchParams.get("tag") || "";
    setSearch((prev) => (prev === nextSearch ? prev : nextSearch));
    setTagFilter((prev) => (prev === nextTag ? prev : nextTag));
  }, [searchParams]);

  useEffect(() => {
    void fetchArticles(1);
  }, [fetchArticles]);

  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.pages) return;
    void fetchArticles(p);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Newspaper className="w-8 h-8 text-teal-500" />
                News
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Latest updates from NeonGambit
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchArticles(1)}
                placeholder="Search articles..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            {tagFilter && (
              <button
                onClick={() => {
                  setTagFilter("");
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full text-xs font-medium"
              >
                <Tag className="w-3 h-3" /> {tagFilter} ×
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => fetchArticles(pagination.page)}
                className="mt-4 text-teal-500 underline text-sm"
              >
                Retry
              </button>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              No articles found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <Link
                    key={article._id}
                    to={`/news/${article.slug}`}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-teal-400 dark:hover:border-teal-600 transition-all group shadow-sm hover:shadow-lg"
                  >
                    {article.coverImage && (
                      <div className="h-40 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <img
                          src={article.coverImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {article.tags.slice(0, 3).map((tag) => (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.preventDefault();
                                setTagFilter(tag);
                              }}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-[10px] font-medium hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                      {article.excerpt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                        <span>{article.authorName}</span>
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
