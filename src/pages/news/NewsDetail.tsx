import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Tag, Loader2, Calendar, User } from "lucide-react";
import Sidebar from "../../components/Sidebar";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface Article {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  excerpt: string;
  tags: string[];
  contentMarkdown: string;
  contentHtml: string;
  authorName: string;
  publishedAt: string;
}

export default function NewsDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${API_URL}/api/news/${encodeURIComponent(slug)}`,
      );
      if (res.status === 404) {
        setError("Article not found.");
        setArticle(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch article");
      const data = await res.json();
      setArticle(data.article);
      setError(null);
    } catch {
      setError("Failed to load article.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchArticle();
  }, [fetchArticle]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-gray-950 text-gray-900 dark:text-white flex transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 ml-72 p-8">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/news"
            className="inline-flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-500 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to News
          </Link>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchArticle}
                className="mt-4 text-teal-500 underline text-sm"
              >
                Retry
              </button>
            </div>
          ) : article ? (
            <article>
              {article.coverImage && (
                <div className="rounded-xl overflow-hidden mb-6">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {article.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/news?tag=${encodeURIComponent(tag)}`}
                      className="flex items-center gap-1 px-2.5 py-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-full text-xs font-medium hover:bg-teal-500/20 transition-colors"
                    >
                      <Tag className="w-3 h-3" /> {tag}
                    </Link>
                  ))}
                </div>
              )}

              <h1 className="text-3xl font-bold mb-4">{article.title}</h1>

              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> {article.authorName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />{" "}
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Render HTML if available, otherwise markdown as plaintext */}
              {article.contentHtml ? (
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {article.contentMarkdown}
                </div>
              )}
            </article>
          ) : null}
        </div>
      </main>
    </div>
  );
}
