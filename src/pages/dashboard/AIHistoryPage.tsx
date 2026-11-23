import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { deleteAIChatSession, fetchAIChats } from '../../services/firestoreService';
import type { AIChatSession } from '../../types';

export function AIHistoryPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<AIChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchAIChats(user.uid)
      .then(setChats)
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#14243A] dark:text-white">
            AI Assistant History
          </h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400">
            Saved conversations with FormSaathi AI across English and Hindi.
          </p>
        </div>
        <Link
          to="/assistant"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14243A] dark:bg-[#14B8A6] dark:text-[#14243A] rounded-lg"
        >
          <Plus className="w-4 h-4" /> New AI Chat
        </Link>
      </div>

      {loading ? (
        <div className="h-40 bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl animate-pulse" />
      ) : chats.length === 0 ? (
        <div className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <MessageSquare className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm text-[#64748B]">
            No saved conversations yet. Click &ldquo;Save Chat&rdquo; inside FormSaathi AI to store threads here.
          </p>
          <Link to="/assistant" className="text-xs font-semibold text-[#0D9488] underline">
            Open FormSaathi AI
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-[#131E30] border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <Link
                  to={`/assistant?chatId=${c.id}`}
                  className="text-base font-semibold hover:text-[#0D9488] block truncate"
                >
                  {c.title}
                </Link>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Language: {c.language === 'hi' ? 'Hindi' : 'English'} · {c.messages.length} messages
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/assistant?chatId=${c.id}`}
                  className="px-3 py-1.5 text-xs font-semibold border border-[#E2E8F0] dark:border-slate-700 rounded-lg"
                >
                  Reopen
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) return;
                    await deleteAIChatSession(user.uid, c.id);
                    setChats((p) => p.filter((x) => x.id !== c.id));
                  }}
                  className="p-1.5 text-[#DC2626]"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
