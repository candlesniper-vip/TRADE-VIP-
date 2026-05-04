import { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface NewsItem {
  id: string;
  headline: string;
  time: string;
  url: string;
  impact: 'High' | 'Medium' | 'Low';
  category: 'Market';
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        // Fetch real market news from Yahoo Finance RSS via a public RSS-to-JSON converter
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://finance.yahoo.com/news/rss');
        const data = await res.json();
        
        if (data && data.items) {
          const realNews: NewsItem[] = data.items.slice(0, 15).map((item: any, i: number) => {
             // Assign a deterministic impact based on keywords for reality
             let impact: 'High' | 'Medium' | 'Low' = 'Low';
             const title = item.title.toLowerCase();
             if (title.includes('fed') || title.includes('rate') || title.includes('inflation') || title.includes('crash')) impact = 'High';
             else if (title.includes('earnings') || title.includes('stocks') || title.includes('market')) impact = 'Medium';

            return {
              id: (item.guid || item.link || String(i)) + '-' + i,
              headline: item.title,
              time: new Date(item.pubDate.replace(/-/g, '/')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              url: item.link,
              impact,
              category: 'Market'
            };
          });
          setNews(realNews);
        }
      } catch (error) {
        console.error("Failed to fetch real news", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-[#FF1744] bg-[#FF1744]/10 border-[#FF1744]/20';
      case 'Medium': return 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/20';
      case 'Low': return 'text-[#00C851] bg-[#00C851]/10 border-[#00C851]/20';
      default: return 'text-zinc-400 bg-zinc-800/50 border-zinc-700';
    }
  };

  return (
    <section className="pt-4 border-t border-[#1A1A1A]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white italic">Live Market News</h3>
        {loading ? (
           <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin" />
        ) : (
           <div className="flex items-center justify-center w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></div>
        )}
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto hide-scrollbar pr-1">
        {news.length === 0 && !loading && (
           <div className="text-xs text-zinc-500 font-medium italic text-center py-4">No verified news available.</div>
        )}
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#111] border border-[#222] rounded p-3 hover:border-[#333] transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${getImpactColor(item.impact)}`}>
                {item.impact} IMPACT
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">{item.time}</span>
            </div>
            <p className="text-xs text-zinc-300 font-medium leading-snug group-hover:text-white transition-colors line-clamp-3">
              {item.headline}
            </p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#222]">
               <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{item.category}</span>
               <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-[#FFD700] transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
